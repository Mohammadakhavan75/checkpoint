"""Auth endpoints: register, login, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ..auth import (
    create_access_token,
    create_mfa_token,
    decode_mfa_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..config import settings
from ..db import get_session
from ..models import TwoFactorSettings, User
from ..schemas import (
    DeleteAccountRequest,
    GoogleLoginRequest,
    LoginMfaRequest,
    LoginRequest,
    LoginResult,
    RecoveryCodesOut,
    SeenVersionRequest,
    SetPasswordRequest,
    Token,
    TwoFactorCodeRequest,
    TwoFactorEnableRequest,
    TwoFactorScopesRequest,
    TwoFactorSetupOut,
    TwoFactorStatus,
    UserCreate,
    UserOut,
)
from ..services import two_factor as tf
from ..services import totp
from ..services.account import delete_account
from ..services.crypto import TokenEncryptionUnavailable
from ..services.google_auth import (
    GoogleAuthError,
    GoogleAuthUnavailableError,
    get_or_link_google_user,
    verify_google_credential,
)
from ..services.tutorial import seed_tutorial

router = APIRouter()


async def _user_out(session: AsyncSession, user: User) -> UserOut:
    """UserOut enriched with the user's 2FA enforcement flags (for /me)."""
    out = UserOut.model_validate(user)
    row = await tf.get_enabled(session, user.id)
    if row is not None:
        out.two_factor_enabled = True
        out.two_factor_login = row.require_for_login
        out.two_factor_delete = row.require_for_delete
    return out


async def _login_result(session: AsyncSession, user: User) -> LoginResult:
    """Issue a session token, unless the user gates login behind TOTP — then a
    short-lived mfa challenge the client completes via /auth/login/2fa."""
    row = await tf.get_enabled(session, user.id)
    if row is not None and row.require_for_login:
        return LoginResult(mfa_required=True, mfa_token=create_mfa_token(str(user.id)))
    return LoginResult(access_token=create_access_token(str(user.id)))


async def _user_by_email(session: AsyncSession, email: str) -> User | None:
    """Case-insensitive lookup: new accounts are stored lowercase, but rows
    created before normalization may carry mixed case."""
    result = await session.execute(
        select(User).where(func.lower(User.email) == email.lower())
    )
    return result.scalar_one_or_none()


@router.get("/providers")
async def providers() -> dict[str, bool]:
    """Which sign-in methods / integrations are available (lets the client show
    the Google button and the Connect Calendar control)."""
    return {
        "password": True,
        "google": bool(settings.google_client_id),
        "calendar": settings.calendar_connect_enabled,
        "two_factor": settings.two_factor_available,
        "reminders": settings.reminders_available,
    }


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate, session: AsyncSession = Depends(get_session)
) -> UserOut:
    existing = await _user_by_email(session, payload.email)
    if existing is not None:
        if existing.hashed_password is None and existing.google_sub:
            raise HTTPException(
                status_code=400,
                detail="This email already signs in with Google — use the Google "
                "button, then set a password from the account menu",
            )
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(), hashed_password=hash_password(payload.password)
    )
    session.add(user)
    await session.flush()
    # First-run activation: the first screen a new user sees is the resume
    # card pointed at this seeded, already-checkpointed tutorial item.
    await seed_tutorial(session, user.id)
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)


@router.post("/login", response_model=LoginResult)
async def login(
    payload: LoginRequest, session: AsyncSession = Depends(get_session)
) -> LoginResult:
    user = await _user_by_email(session, payload.email)
    if user is not None and user.hashed_password is None and user.google_sub:
        raise HTTPException(
            status_code=401,
            detail="This account signs in with Google — use the Google button "
            "(you can set a password from the account menu after signing in)",
        )
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return await _login_result(session, user)


@router.post("/login/2fa", response_model=LoginResult)
async def login_2fa(
    payload: LoginMfaRequest, session: AsyncSession = Depends(get_session)
) -> LoginResult:
    """Second leg of a 2FA login: exchange the mfa_token + a TOTP/recovery code
    for a real session token."""
    user_id = decode_mfa_token(payload.mfa_token)
    if user_id is None:
        raise HTTPException(
            status_code=401, detail="This sign-in attempt expired — start over"
        )
    row = await tf.get_enabled(session, user_id)
    if row is None or not row.require_for_login:
        # 2FA was turned off mid-flow; nothing left to verify.
        raise HTTPException(status_code=401, detail="Two-factor is no longer required")
    try:
        ok = tf.verify_code(row, payload.code)
    except tf.TwoFactorLocked:
        await session.commit()
        raise HTTPException(
            status_code=429, detail="Too many attempts — wait a moment and try again"
        )
    await session.commit()
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid code")
    return LoginResult(access_token=create_access_token(str(user_id)))


@router.post("/google", response_model=LoginResult)
async def google_login(
    payload: GoogleLoginRequest, session: AsyncSession = Depends(get_session)
) -> LoginResult:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        claims = await run_in_threadpool(verify_google_credential, payload.credential)
    except GoogleAuthUnavailableError:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is temporarily unavailable — please try again",
        )
    except GoogleAuthError:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = claims.get("email")
    google_sub = claims.get("sub")
    if not email or not google_sub:
        raise HTTPException(status_code=401, detail="Google credential missing email")
    if claims.get("email_verified") is False:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    user = await get_or_link_google_user(
        session,
        email=email.lower(),
        google_sub=google_sub,
        name=claims.get("name"),
        picture=claims.get("picture"),
    )
    await session.commit()
    # A Google sign-in is still a login: honour require_for_login.
    return await _login_result(session, user)


@router.get("/me", response_model=UserOut)
async def me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    return await _user_out(session, user)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def set_password(
    payload: SetPasswordRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Set a local password (Google-only accounts) or change an existing one.

    This is how a Google-first account gains password sign-in: the mirror of
    the linking rule that lets a password account add Google.
    """
    if user.hashed_password is not None and not verify_password(
        payload.current_password or "", user.hashed_password
    ):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.password)
    await session.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    payload: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Permanently delete the signed-in account and all of its data.

    Irreversible. Accounts with a local password must re-supply it as a guard
    against a left-open session deleting the account; Google-only accounts have
    none, so the authenticated bearer token is the proof of identity.
    """
    if user.hashed_password is not None and not verify_password(
        payload.password or "", user.hashed_password
    ):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    # Second gate when the user requires TOTP for deletion: a valid code (or a
    # one-time recovery code) on top of the password / bearer token.
    row = await tf.get_enabled(session, user.id)
    if row is not None and row.require_for_delete:
        try:
            ok = tf.verify_code(row, payload.code or "")
        except tf.TwoFactorLocked:
            await session.commit()
            raise HTTPException(
                status_code=429,
                detail="Too many attempts — wait a moment and try again",
            )
        if not ok:
            await session.commit()  # persist the failed-attempt counter
            raise HTTPException(
                status_code=400, detail="Invalid two-factor code"
            )
    await delete_account(session, user)
    await session.commit()


# ----- two-factor (TOTP) -----
def _require_2fa_available() -> None:
    if not settings.two_factor_available:
        raise HTTPException(
            status_code=503,
            detail="Two-factor authentication is not available on this server",
        )


async def _two_factor_status(session: AsyncSession, user: User) -> TwoFactorStatus:
    row = await tf.get_settings(session, user.id)
    return TwoFactorStatus(
        available=settings.two_factor_available,
        enabled=bool(row and row.enabled),
        pending=bool(row and not row.enabled),
        require_for_login=bool(row and row.enabled and row.require_for_login),
        require_for_delete=bool(row and row.enabled and row.require_for_delete),
        recovery_codes_remaining=len(row.recovery_codes) if row else 0,
    )


@router.get("/2fa", response_model=TwoFactorStatus)
async def two_factor_status(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TwoFactorStatus:
    return await _two_factor_status(session, user)


@router.post("/2fa/setup", response_model=TwoFactorSetupOut)
async def two_factor_setup(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TwoFactorSetupOut:
    """Start (or restart) enrollment: mint a pending secret and its QR. Does not
    enable anything until the user confirms a code via /2fa/enable."""
    _require_2fa_available()
    existing = await tf.get_enabled(session, user.id)
    if existing is not None:
        raise HTTPException(
            status_code=409, detail="Two-factor is already enabled — disable it first"
        )
    try:
        _, secret, uri = await tf.begin_enrollment(session, user.id, user.email)
    except TokenEncryptionUnavailable:
        raise HTTPException(
            status_code=503,
            detail="Two-factor authentication is not available on this server",
        )
    await session.commit()
    return TwoFactorSetupOut(secret=secret, otpauth_uri=uri, qr_svg=totp.qr_data_uri(uri))


@router.post("/2fa/enable", response_model=RecoveryCodesOut)
async def two_factor_enable(
    payload: TwoFactorEnableRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCodesOut:
    """Confirm a pending enrollment with a code, choose where it's required, and
    receive one-time recovery codes (shown once)."""
    _require_2fa_available()
    row = await tf.get_settings(session, user.id)
    if row is None:
        raise HTTPException(status_code=400, detail="Start setup first")
    if row.enabled:
        raise HTTPException(status_code=409, detail="Two-factor is already enabled")
    if not totp.verify(tf.current_secret(row), payload.code):
        raise HTTPException(
            status_code=400, detail="That code didn't match — try the current one"
        )
    codes = tf.confirm_enrollment(
        row,
        require_for_login=payload.require_for_login,
        require_for_delete=payload.require_for_delete,
    )
    await session.commit()
    return RecoveryCodesOut(recovery_codes=codes)


@router.patch("/2fa", response_model=TwoFactorStatus)
async def two_factor_update_scopes(
    payload: TwoFactorScopesRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TwoFactorStatus:
    """Change where the second factor is required (login / delete account)."""
    row = await tf.get_enabled(session, user.id)
    if row is None:
        raise HTTPException(status_code=400, detail="Two-factor is not enabled")
    row.require_for_login = payload.require_for_login
    row.require_for_delete = payload.require_for_delete
    await session.commit()
    return await _two_factor_status(session, user)


@router.post("/2fa/disable", status_code=status.HTTP_204_NO_CONTENT)
async def two_factor_disable(
    payload: TwoFactorCodeRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Turn off 2FA. Requires a current code (or recovery code) as proof of
    possession, so a hijacked-but-second-factorless session can't remove it."""
    row = await tf.get_enabled(session, user.id)
    if row is None:
        raise HTTPException(status_code=400, detail="Two-factor is not enabled")
    try:
        ok = tf.verify_code(row, payload.code)
    except tf.TwoFactorLocked:
        await session.commit()
        raise HTTPException(
            status_code=429, detail="Too many attempts — wait a moment and try again"
        )
    if not ok:
        await session.commit()
        raise HTTPException(status_code=400, detail="Invalid code")
    await session.delete(row)
    await session.commit()


@router.post("/2fa/recovery-codes", response_model=RecoveryCodesOut)
async def two_factor_regenerate_recovery_codes(
    payload: TwoFactorCodeRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCodesOut:
    """Replace the recovery codes with a fresh set (invalidates the old ones)."""
    row = await tf.get_enabled(session, user.id)
    if row is None:
        raise HTTPException(status_code=400, detail="Two-factor is not enabled")
    try:
        ok = tf.verify_code(row, payload.code)
    except tf.TwoFactorLocked:
        await session.commit()
        raise HTTPException(
            status_code=429, detail="Too many attempts — wait a moment and try again"
        )
    if not ok:
        await session.commit()
        raise HTTPException(status_code=400, detail="Invalid code")
    codes = tf.regenerate_recovery_codes(row)
    await session.commit()
    return RecoveryCodesOut(recovery_codes=codes)


@router.post("/seen", status_code=status.HTTP_204_NO_CONTENT)
async def mark_seen_version(
    payload: SeenVersionRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Record the app version this user has now seen release notes for."""
    user.last_seen_version = payload.version
    await session.commit()
