import os
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp()) / 'identity-test.db'}"
os.environ["REDIS_URL"] = "memory://"
os.environ["JWT_SECRET"] = "test-secret"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_signup_login_preferences_and_refresh() -> None:
    signup = client.post("/auth/signup", json={"email": "alex@example.com", "password": "password123"})
    assert signup.status_code == 201
    body = signup.json()
    assert body["user"]["email"] == "alex@example.com"
    assert body["preferences"] == {"nav_collapsed": True, "active_limit": 1}

    user_id = body["user"]["id"]
    duplicate = client.post("/auth/signup", json={"email": "alex@example.com", "password": "password123"})
    assert duplicate.status_code == 409

    login = client.post("/auth/login", json={"email": "alex@example.com", "password": "password123"})
    assert login.status_code == 200
    assert login.json()["access_token"]

    preferences = client.patch(f"/users/{user_id}/preferences", json={"active_limit": 2, "nav_collapsed": False})
    assert preferences.status_code == 200
    assert preferences.json() == {"nav_collapsed": False, "active_limit": 2}

    refresh = client.post("/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert refresh.status_code == 200
    assert refresh.json()["refresh_token"] != login.json()["refresh_token"]
