from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class PreferenceOut(BaseModel):
    nav_collapsed: bool
    active_limit: int


class PreferenceUpdate(BaseModel):
    nav_collapsed: bool | None = None
    active_limit: int | None = Field(default=None, ge=1, le=5)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserOut
    preferences: PreferenceOut


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None
