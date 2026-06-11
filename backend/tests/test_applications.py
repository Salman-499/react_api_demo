def test_submit_application_success(client, auth_headers):
    response = client.post("/applications", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "years_experience": 3,
        "cover_letter": "I am very interested in this role."
    }, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Jane Doe"
    assert data["email"] == "jane@example.com"
    assert data["years_experience"] == 3
    assert data["status"] == "pending"
    assert data["submitted_by"] == "test@example.com"


def test_submit_application_without_cover_letter(client, auth_headers):
    response = client.post("/applications", json={
        "name": "John Smith",
        "email": "john@example.com",
        "years_experience": 1,
    }, headers=auth_headers)

    assert response.status_code == 201
    assert response.json()["cover_letter"] is None


def test_list_my_applications(client, auth_headers):
    client.post("/applications", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "years_experience": 3,
    }, headers=auth_headers)

    client.post("/applications", json={
        "name": "Jane Doe Second",
        "email": "jane2@example.com",
        "years_experience": 5,
    }, headers=auth_headers)

    response = client.get("/applications", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Jane Doe"
    assert data[1]["name"] == "Jane Doe Second"


def test_submit_application_unauthenticated(client):
    response = client.post("/applications", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "years_experience": 3,
    })

    assert response.status_code == 401


def test_submit_application_negative_experience(client, auth_headers):
    response = client.post("/applications", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "years_experience": -1,
    }, headers=auth_headers)

    assert response.status_code == 422


def test_duplicate_user_registration(client):
    client.post("/register", json={"email": "duplicate@example.com", "password": "pass123"})
    response = client.post("/register", json={"email": "duplicate@example.com", "password": "pass123"})

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]
