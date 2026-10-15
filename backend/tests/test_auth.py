import pytest
from app.core.config import settings

def test_login_patient_success(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "patient@example.com",
        "password": settings.DEMO_PATIENT_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "PATIENT"
    assert data["unique_patient_id"] == "PAT-2026-9812"

def test_login_doctor_success(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "doctor@example.com",
        "password": settings.DEMO_DOCTOR_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "DOCTOR"
    assert data["doctor_status"] == "VERIFIED"

def test_login_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "doctor@example.com",
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]
