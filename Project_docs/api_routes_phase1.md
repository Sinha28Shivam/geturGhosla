# Room Discovery App — Phase 1 API Routes

Scope: auth, room listings, images, nearby search, interests, and the
minimum admin route needed to unblock the moderation default set in the
schema. No compare, no reviews, no saved searches — those are Phase 2/3.

Base path assumed: `/api/v1`

---

## Auth

Custom OTP flow (not Azure AD B2C hosted login) because Azure can't
deliver SMS to Indian numbers. You own this flow end to end, which
means you own its security — hence rate limiting on both routes below.

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/auth/otp/request` | none | **5 requests / phone number / hour**, keyed also by IP | Sends OTP via third-party SMS (MSG91/Twilio). Never reveal whether the phone number is already registered — same response either way, to prevent enumeration. |
| POST | `/auth/otp/verify` | none | **5 attempts / phone number / 15 min**, then lock 1 hour | Verifies code, creates/links `users` row, issues session token (JWT or provider session). Lock-and-back-off, don't just reject — unlimited retries turns a 6-digit OTP into a guessable code. |
| POST | `/auth/email/login` | none | 5 attempts / email / hour | If you support email+password as an alternative to phone. |
| GET | `/auth/me` | required | — | Returns current user's profile from the `users` table. |
| POST | `/auth/logout` | required | — | Invalidate session/token. |

**Why rate limit OTP verify separately from OTP request:** request-spam costs you SMS money; verify-spam is someone trying to brute-force a 6-digit code (1,000,000 combinations — trivially guessable without a lockout). Different attacker, different endpoint, both need limits.

---

## Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/me` | required | Full own profile. |
| PATCH | `/users/me` | required | Update name, profile photo. Phone/email changes should re-trigger OTP verification, not be a plain field edit. |
| GET | `/users/:id` | optional | Public-safe subset only (name, photo) — never expose phone/email of another user directly; that's what the Interests flow is for. |

---

## Rooms (listings)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/rooms` | required | **5 new listings / user / day** | Creates with `status = pending_review` (schema default — don't override in the handler). Body: title, description, room_type, rent, deposit, address, lat/lng. |
| GET | `/rooms/:id` | optional | — | Full detail. If `status != active` and requester isn't the owner or admin, return 404, not 403 — don't leak that a pending/flagged listing exists. |
| PATCH | `/rooms/:id` | required, owner only | — | Any edit to a live listing should reset `status` back to `pending_review` if you're serious about moderation — otherwise owners edit around your review process after initial approval. |
| DELETE | `/rooms/:id` | required, owner only | — | Soft delete: set `status = inactive`, don't hard-delete (keeps `interests` history intact). |
| GET | `/rooms` | optional | — | Filtered list: `city`, `room_type`, `min_rent`, `max_rent`, `page`, `limit`. Always filters `status = active` for non-owners. |
| GET | `/rooms/nearby` | optional | — | Query params: `lat`, `lng`, `radius_km` (default 5, cap at 25), `limit`. Runs the `ST_DWithin` + `<->` query from schema.sql. This is your core value prop — get this one right before anything else. |
| POST | `/rooms/:id/view` | optional | 1 count / session / room / hour (dedupe by session or user ID, not raw IP) | Increments `view_count`. Without dedup, a refresh-spam inflates numbers and misleads owners. |

---

## Room Images

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/rooms/:id/images` | required, owner only | Two-step upload: this route returns a **presigned upload URL** (Blob Storage/S3), client uploads directly to storage, then calls the confirm route below. Don't proxy image bytes through your API server — wastes bandwidth and compute you're paying for. |
| POST | `/rooms/:id/images/confirm` | required, owner only | Client calls this after direct upload succeeds; server verifies the object exists, then writes the `room_images` row. |
| DELETE | `/rooms/:id/images/:imageId` | required, owner only | Deletes DB row and the blob. |
| PATCH | `/rooms/:id/images/:imageId/primary` | required, owner only | Sets as primary; unsets any existing primary first (the schema's partial unique index will reject a naive insert otherwise — handle in a transaction). |
| PATCH | `/rooms/:id/images/reorder` | required, owner only | Body: ordered array of image IDs, updates `sort_order`. |

**Minimum photo enforcement:** decide now whether `POST /rooms` requires at least 1 image before it can leave `pending_review`, or whether you'll allow photo-less listings into the review queue. I'd block it at the admin-approval step, not at creation — let owners save a draft without photos, but don't approve a listing without at least one.

---

## Interests (contact requests)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/rooms/:id/interest` | required | **10 / user / 24h** (Redis + trigger, already built) | Creates the interest row, triggers a notification to the owner. Reject with a clear message if `room.owner_id == requester.id` — owners shouldn't be able to "contact" themselves. |
| GET | `/interests/sent` | required | — | Interests the current user has sent, as seeker. |
| GET | `/interests/received` | required | — | Interests on rooms the current user owns. This is the owner's lead inbox. |
| PATCH | `/interests/:id/status` | required, room owner only | — | Owner marks `contacted` / `closed`. |

---

## Admin (minimum viable, not a full dashboard)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/rooms/pending` | admin only | Lists rooms with `status = pending_review`, oldest first. |
| PATCH | `/admin/rooms/:id/status` | admin only | Approve (`active`), reject, or flag. Body should require a reason if rejecting/flagging — you'll want that log later when an owner complains. |

---

## What's deliberately NOT here

- Compare endpoints — Phase 2, needs usage data first (said this already, still true).
- Reviews/ratings — Phase 3.
- Saved searches / push-notification subscriptions — Phase 3.
- Payment/booking — out of scope entirely per the classifieds-model decision.

If you build any of these into Phase 1 "since you're in there anyway," you're extending the timeline for features you haven't validated anyone wants yet.
