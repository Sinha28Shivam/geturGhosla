-- ============================================================
-- Room Discovery App — Phase 1 Database Schema
-- PostgreSQL 15+ with PostGIS extension
-- ============================================================
-- Scope: auth-linked users, room listings, images, interest/contact
-- requests, and geo-indexed nearby search. Compare, reviews, and
-- amenity taxonomy are deliberately excluded — Phase 2/3 features.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- USERS
-- Auth (OTP verification, token issuing) is handled by your
-- identity provider (Azure AD B2C / Firebase Auth), not this table.
-- This table just stores the app-side profile linked to that
-- provider's user id.
-- ------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_provider_id  TEXT UNIQUE NOT NULL,   -- external ID from Azure AD B2C / Firebase
    phone           VARCHAR(15) UNIQUE,        -- E.164 format, e.g. +919876543210
    email           VARCHAR(255) UNIQUE,
    full_name       VARCHAR(150),
    profile_photo_url TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- at least one contact method must exist
    CONSTRAINT chk_user_has_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- ------------------------------------------------------------
-- ROOMS (listings)
-- location uses PostGIS geography(Point) — this is what makes
-- "nearby" search fast and accurate. geography type auto-handles
-- distance in meters on a sphere, so you don't hand-roll haversine.
-- ------------------------------------------------------------
CREATE TYPE room_type_enum AS ENUM ('single', 'shared', '1rk', '1bhk', '2bhk', '3bhk_plus', 'pg');
CREATE TYPE room_status_enum AS ENUM ('active', 'rented', 'inactive', 'pending_review', 'flagged');

CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    room_type       room_type_enum NOT NULL,

    monthly_rent    NUMERIC(10,2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(10,2) DEFAULT 0 CHECK (security_deposit >= 0),

    -- address (kept denormalized/flat for Phase 1 — no separate cities table yet)
    address_line    TEXT NOT NULL,
    locality        VARCHAR(120),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    pincode         VARCHAR(10),

    -- the actual geo point used for distance queries
    location        geography(Point, 4326) NOT NULL,

    status          room_status_enum NOT NULL DEFAULT 'pending_review',
    -- pending_review default enforces the moderation step flagged
    -- earlier as a Phase 1 must-have, not optional

    view_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIST index is what makes nearby/radius queries fast —
-- without this, every "rooms near me" query does a full table scan.
CREATE INDEX idx_rooms_location ON rooms USING GIST(location);

CREATE INDEX idx_rooms_owner ON rooms(owner_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_city ON rooms(city);
CREATE INDEX idx_rooms_rent ON rooms(monthly_rent);
-- composite index for the most common query: active rooms in a city sorted by rent
CREATE INDEX idx_rooms_city_status_rent ON rooms(city, status, monthly_rent);

-- ------------------------------------------------------------
-- ROOM IMAGES
-- URLs point to Blob Storage / S3 / CDN — never store binary here.
-- ------------------------------------------------------------
CREATE TABLE room_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_images_room ON room_images(room_id);

-- enforce exactly one primary image per room (partial unique index)
CREATE UNIQUE INDEX idx_room_images_one_primary
    ON room_images(room_id) WHERE is_primary = true;

-- ------------------------------------------------------------
-- INTERESTS (contact requests)
-- Logs every "I'm interested" action — this is your lead record,
-- and also your rate-limiting anchor (see note below).
-- ------------------------------------------------------------
CREATE TYPE interest_status_enum AS ENUM ('pending', 'contacted', 'closed', 'spam');

CREATE TABLE interests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    seeker_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT,
    status          interest_status_enum NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- a user can only express interest in the same room once —
    -- prevents spam-clicking "contact" and duplicate notifications
    CONSTRAINT uq_interest_per_user_room UNIQUE (room_id, seeker_id)
);

CREATE INDEX idx_interests_room ON interests(room_id);
CREATE INDEX idx_interests_seeker ON interests(seeker_id);
-- used to rate-limit: count interests by a user in the last 24h
CREATE INDEX idx_interests_seeker_created ON interests(seeker_id, created_at);

-- ============================================================
-- EXAMPLE QUERIES
-- ============================================================

-- 1) Nearby search: rooms within 5km of a point, nearest first,
--    with distance in km returned to the client.
--    Replace $1 = longitude, $2 = latitude, $3 = radius in meters
--
-- SELECT
--     r.id, r.title, r.monthly_rent, r.city,
--     ST_Distance(r.location, ST_MakePoint($1, $2)::geography) / 1000 AS distance_km
-- FROM rooms r
-- WHERE r.status = 'active'
--   AND ST_DWithin(r.location, ST_MakePoint($1, $2)::geography, $3)
-- ORDER BY r.location <-> ST_MakePoint($1, $2)::geography
-- LIMIT 20;
--
-- Note: the <-> operator uses the GIST index for fast k-nearest-neighbor
-- ordering. ST_DWithin also uses the index for the radius filter.
-- This is why the GIST index on `location` is not optional.

-- 2) Insert a room with a geo point (longitude first, then latitude —
--    this trips people up constantly, PostGIS is lon/lat, not lat/lon):
--
-- INSERT INTO rooms (owner_id, title, room_type, monthly_rent, address_line, city, location)
-- VALUES (
--     'owner-uuid-here', 'Sunny 1BHK near station', '1bhk', 12000,
--     '12 MG Road', 'Lucknow',
--     ST_SetSRID(ST_MakePoint(80.9462, 26.8467), 4326)::geography
-- );
