def test_public_qr_resolve_security_barrier(client):
    """
    CRITICAL SECURITY TEST:
    Verifies that Level 1 Public QR resolution NEVER leaks medical records,
    blood groups, allergies, or medications to an unauthenticated scanner.
    """
    res = client.get("/api/v1/qr/resolve/demo-emergency-token-9812")
    assert res.status_code == 200
    data = res.json()
    assert data["access_level"] == "LEVEL_1_PUBLIC"
    assert data["patient_name"] == "Demo Patient (Johnathan Doe)"
    assert data["unique_patient_id"] == "PAT-2026-9812"
    assert data["requires_doctor_verification"] is True
    
    # Assert medical data is STRICTLY ABSENT from public payload
    assert "blood_group" not in data
    assert "allergies" not in data
    assert "medications" not in data
    assert "conditions" not in data
    assert "surgeries" not in data

def test_invalid_qr_token_rejected(client):
    res = client.get("/api/v1/qr/resolve/non-existent-fake-token-404")
    assert res.status_code == 404
    assert "Invalid or expired QR token" in res.json()["detail"]
