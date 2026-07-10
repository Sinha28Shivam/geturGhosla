# Postman API Testing Guide - Phase 1

This guide provides the exact requests you need to test the Room Discovery Phase 1 API in Postman. 

**Base URL:** `http://localhost:8000/api/v1`

---

## 1. Authentication (OTP Flow)

### 1.1 Request OTP
- **Endpoint:** `POST /auth/email/request-otp`
- **Auth:** None
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
    "email": "test@example.com"
}
```
- **Response (200 OK):**
```json
{
    "message": "OTP sent to email successfully (check server logs for POC)"
}
```
> [!NOTE]
> Since we don't have an email provider connected yet, check the **terminal/console** where Uvicorn is running. The 6-digit OTP will be printed there.

### 1.2 Verify OTP (Login)
- **Endpoint:** `POST /auth/email/verify-otp`
- **Auth:** None
- **Headers:** `Content-Type: application/x-www-form-urlencoded`
- **Body (x-www-form-urlencoded):**
  - `username`: `test@example.com`
  - `password`: `123456` *(Replace with OTP from logs)*
- **Response (200 OK):**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
    "token_type": "bearer"
}
```
> [!IMPORTANT]
> Copy the `access_token` from this response. In Postman, go to the **Authorization** tab for all subsequent requests, select **Bearer Token**, and paste this token.

### 1.3 Get Current User
- **Endpoint:** `GET /auth/me`
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
    "email": "test@example.com",
    "full_name": null,
    "profile_photo_url": null,
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "is_active": true,
    "created_at": "2026-07-09T10:00:00Z",
    "updated_at": "2026-07-09T10:00:00Z"
}
```

---

## 2. Rooms (Listings)

### 2.1 Create Room
- **Endpoint:** `POST /rooms/`
- **Auth:** Bearer Token
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
    "title": "Cozy 1BHK in Downtown",
    "description": "A very nice room with great sunlight.",
    "room_type": "private_room",
    "monthly_rent": 15000,
    "security_deposit": 30000,
    "address_line": "123 Main St",
    "locality": "Downtown",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "lat": 12.971598,
    "lng": 77.594562
}
```
- **Response (201 Created):**
```json
{
    "title": "Cozy 1BHK in Downtown",
    "description": "A very nice room with great sunlight.",
    "room_type": "private_room",
    "monthly_rent": "15000",
    "security_deposit": "30000",
    "address_line": "123 Main St",
    "locality": "Downtown",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "lat": 12.971598,
    "lng": 77.594562,
    "id": "987e6543-e21b-34d3-a456-426614174000",
    "owner_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending_review",
    "view_count": 0,
    "created_at": "2026-07-09T10:05:00Z",
    "updated_at": "2026-07-09T10:05:00Z",
    "distance_km": null
}
```

### 2.2 Search Nearby Rooms (PostGIS)
- **Endpoint:** `GET /rooms/nearby?lat=12.971500&lng=77.594500&radius_km=10`
- **Auth:** None (Public)
- **Response (200 OK):** *(Will return empty list `[]` until a room is approved by an admin)*
```json
[
    {
        "title": "Cozy 1BHK in Downtown",
        "...": "...",
        "status": "active",
        "distance_km": 0.012
    }
]
```

### 2.3 Express Interest (Lead Generation)
- **Endpoint:** `POST /rooms/{room_id}/interest`
- **Auth:** Bearer Token *(Must be a different user than the owner)*
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
    "message": "Hi, I am interested in this room. Can we schedule a visit?"
}
```
- **Response (201 Created):**
```json
{
    "message": "Hi, I am interested in this room. Can we schedule a visit?",
    "id": "555e4567-e89b-12d3-a456-426614174111",
    "room_id": "987e6543-e21b-34d3-a456-426614174000",
    "seeker_id": "333e4567-e89b-12d3-a456-426614174222",
    "status": "pending",
    "created_at": "2026-07-09T10:10:00Z"
}
```

---

## 3. Admin Queue

### 3.1 List Pending Rooms
- **Endpoint:** `GET /admin/rooms/pending`
- **Auth:** Bearer Token
- **Response (200 OK):** Returns a list of rooms with `status: "pending_review"`.

### 3.2 Approve a Room
- **Endpoint:** `PATCH /admin/rooms/{room_id}/status`
- **Auth:** Bearer Token
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
    "status": "active"
}
```
- **Response (200 OK):** Returns the updated room object showing `"status": "active"`.
