import os
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .security import decode_access_token


DOMAIN_NAME = os.getenv("DOMAIN_NAME", "infiniteai.space")
WEB_HOST = os.getenv("WEB_HOST", DOMAIN_NAME)
IDENTITY_HOST = os.getenv("IDENTITY_HOST", f"identity.{DOMAIN_NAME}")
CHECKPOINT_HOST = os.getenv("CHECKPOINT_HOST", f"checkpoint-service.{DOMAIN_NAME}")
WEB_PORT = os.getenv("WEB_PORT", "5173")
IDENTITY_PORT = os.getenv("IDENTITY_PORT", "8001")
CHECKPOINT_PORT = os.getenv("CHECKPOINT_PORT", "8002")
IDENTITY_SERVICE_URL = os.getenv("IDENTITY_SERVICE_URL", f"http://{IDENTITY_HOST}:{IDENTITY_PORT}")
CHECKPOINT_SERVICE_URL = os.getenv("CHECKPOINT_SERVICE_URL", f"http://{CHECKPOINT_HOST}:{CHECKPOINT_PORT}")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", f"http://{WEB_HOST}:{WEB_PORT}")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()

if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError("COOKIE_SAMESITE must be one of: lax, strict, none")
if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    raise RuntimeError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")

app = FastAPI(title="Checkpoint API Gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=900,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=2_592_000,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/", secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)
    response.delete_cookie("refresh_token", path="/", secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)


def user_id_from_request(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Authentication required") from exc
    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


async def read_json(request: Request) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}
    return body if isinstance(body, dict) else {}


def passthrough_json(upstream: httpx.Response) -> JSONResponse:
    try:
        payload = upstream.json()
    except ValueError:
        payload = {"detail": upstream.text}
    return JSONResponse(payload, status_code=upstream.status_code)


async def identity_get(path: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=10) as client:
        return await client.get(f"{IDENTITY_SERVICE_URL}{path}")


async def checkpoint_request(
    method: str,
    path: str,
    user_id: str,
    *,
    json: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=10) as client:
        return await client.request(
            method,
            f"{CHECKPOINT_SERVICE_URL}{path}",
            json=json,
            params=params,
            headers={"X-User-Id": user_id},
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED, response_model=None)
async def signup(request: Request, response: Response) -> dict[str, Any] | JSONResponse:
    async with httpx.AsyncClient(timeout=10) as client:
        upstream = await client.post(f"{IDENTITY_SERVICE_URL}/auth/signup", json=await read_json(request))
    if upstream.status_code >= 400:
        return passthrough_json(upstream)
    payload = upstream.json()
    set_auth_cookies(response, payload["access_token"], payload["refresh_token"])
    return {"user": payload["user"], "preferences": payload["preferences"]}


@app.post("/api/auth/login", response_model=None)
async def login(request: Request, response: Response) -> dict[str, Any] | JSONResponse:
    async with httpx.AsyncClient(timeout=10) as client:
        upstream = await client.post(f"{IDENTITY_SERVICE_URL}/auth/login", json=await read_json(request))
    if upstream.status_code >= 400:
        return passthrough_json(upstream)
    payload = upstream.json()
    set_auth_cookies(response, payload["access_token"], payload["refresh_token"])
    return {"user": payload["user"], "preferences": payload["preferences"]}


@app.post("/api/auth/logout", response_model=None)
async def logout(request: Request, response: Response) -> dict[str, bool]:
    refresh_token = request.cookies.get("refresh_token")
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(f"{IDENTITY_SERVICE_URL}/auth/logout", json={"refresh_token": refresh_token})
    clear_auth_cookies(response)
    return {"ok": True}


@app.get("/api/auth/me", response_model=None)
async def me(request: Request, response: Response) -> dict[str, Any]:
    try:
        current_user_id = user_id_from_request(request)
    except HTTPException:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise
        async with httpx.AsyncClient(timeout=10) as client:
            refreshed = await client.post(f"{IDENTITY_SERVICE_URL}/auth/refresh", json={"refresh_token": refresh_token})
        if refreshed.status_code >= 400:
            clear_auth_cookies(response)
            raise
        refreshed_payload = refreshed.json()
        set_auth_cookies(response, refreshed_payload["access_token"], refreshed_payload["refresh_token"])
        return {"user": refreshed_payload["user"], "preferences": refreshed_payload["preferences"]}
    user_response = await identity_get(f"/users/{current_user_id}")
    preferences_response = await identity_get(f"/users/{current_user_id}/preferences")
    if user_response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"user": user_response.json(), "preferences": preferences_response.json()}


@app.get("/api/preferences", response_model=None)
async def get_preferences(current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    upstream = await identity_get(f"/users/{current_user_id}/preferences")
    return passthrough_json(upstream)


@app.patch("/api/preferences", response_model=None)
async def update_preferences(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    async with httpx.AsyncClient(timeout=10) as client:
        upstream = await client.patch(f"{IDENTITY_SERVICE_URL}/users/{current_user_id}/preferences", json=await read_json(request))
    return passthrough_json(upstream)


@app.get("/api/today", response_model=None)
async def get_today(current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    checkpoint_today = await checkpoint_request("GET", "/today", current_user_id)
    preferences = await identity_get(f"/users/{current_user_id}/preferences")
    if checkpoint_today.status_code >= 400:
        return passthrough_json(checkpoint_today)
    payload = checkpoint_today.json()
    payload["preferences"] = preferences.json() if preferences.status_code < 400 else {"nav_collapsed": True, "active_limit": 1}
    return JSONResponse(payload)


@app.post("/api/today/state", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_today_state(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", "/today/state", current_user_id, json=await read_json(request)))


@app.post("/api/today/start", status_code=status.HTTP_201_CREATED, response_model=None)
async def start_today(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", "/today/start", current_user_id, json=await read_json(request)))


@app.post("/api/today/heartbeat", response_model=None)
async def heartbeat_today(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", "/today/heartbeat", current_user_id, json=await read_json(request)))


@app.get("/api/domains", response_model=None)
async def list_domains(current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("GET", "/domains", current_user_id))


@app.post("/api/domains", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_domain(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", "/domains", current_user_id, json=await read_json(request)))


@app.patch("/api/domains/{domain_id}", response_model=None)
async def update_domain(domain_id: str, request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("PATCH", f"/domains/{domain_id}", current_user_id, json=await read_json(request)))


@app.get("/api/missions", response_model=None)
async def list_missions(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("GET", "/missions", current_user_id, params=dict(request.query_params)))


@app.post("/api/missions", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_mission(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    preferences = await identity_get(f"/users/{current_user_id}/preferences")
    active_limit = preferences.json().get("active_limit", 1) if preferences.status_code < 400 else 1
    return passthrough_json(
        await checkpoint_request("POST", "/missions", current_user_id, json=await read_json(request), params={"active_limit": active_limit})
    )


@app.get("/api/missions/{mission_id}", response_model=None)
async def get_mission(mission_id: str, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("GET", f"/missions/{mission_id}", current_user_id))


@app.patch("/api/missions/{mission_id}", response_model=None)
async def update_mission(mission_id: str, request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("PATCH", f"/missions/{mission_id}", current_user_id, json=await read_json(request)))


@app.post("/api/missions/{mission_id}/activate", response_model=None)
async def activate_mission(mission_id: str, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    preferences = await identity_get(f"/users/{current_user_id}/preferences")
    active_limit = preferences.json().get("active_limit", 1) if preferences.status_code < 400 else 1
    return passthrough_json(
        await checkpoint_request("POST", f"/missions/{mission_id}/activate", current_user_id, params={"active_limit": active_limit})
    )


@app.post("/api/missions/{mission_id}/park", response_model=None)
async def park_mission(mission_id: str, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", f"/missions/{mission_id}/park", current_user_id))


@app.get("/api/missions/{mission_id}/micro-missions", response_model=None)
async def list_micro_missions(mission_id: str, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("GET", f"/missions/{mission_id}/micro-missions", current_user_id))


@app.post("/api/missions/{mission_id}/micro-missions", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_micro_mission(mission_id: str, request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", f"/missions/{mission_id}/micro-missions", current_user_id, json=await read_json(request)))


@app.post("/api/missions/{mission_id}/complete", status_code=status.HTTP_201_CREATED, response_model=None)
async def complete_mission(mission_id: str, request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", f"/missions/{mission_id}/complete", current_user_id, json=await read_json(request)))


@app.get("/api/missions/{mission_id}/checkpoints", response_model=None)
async def list_checkpoints(mission_id: str, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("GET", f"/missions/{mission_id}/checkpoints", current_user_id))


@app.post("/api/missions/{mission_id}/checkpoints", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_checkpoint(mission_id: str, request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(
        await checkpoint_request("POST", f"/missions/{mission_id}/checkpoints", current_user_id, json=await read_json(request))
    )


@app.get("/api/parking-items", response_model=None)
async def list_parking_items(current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("GET", "/parking-items", current_user_id))


@app.post("/api/parking-items", status_code=status.HTTP_201_CREATED, response_model=None)
async def create_parking_item(request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("POST", "/parking-items", current_user_id, json=await read_json(request)))


@app.patch("/api/parking-items/{item_id}", response_model=None)
async def update_parking_item(item_id: str, request: Request, current_user_id: str = Depends(user_id_from_request)) -> JSONResponse:
    return passthrough_json(await checkpoint_request("PATCH", f"/parking-items/{item_id}", current_user_id, json=await read_json(request)))


@app.delete("/api/parking-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_parking_item(item_id: str, current_user_id: str = Depends(user_id_from_request)) -> Response:
    upstream = await checkpoint_request("DELETE", f"/parking-items/{item_id}", current_user_id)
    if upstream.status_code >= 400:
        return passthrough_json(upstream)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
