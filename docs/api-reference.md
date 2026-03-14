# API Reference

Complete reference for all backend API endpoints.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.devops-monk.com`

## Authentication

Most endpoints use JWT tokens stored in httpOnly cookies. Cookies are set automatically after login/register. Include `credentials: 'include'` (fetch) or `withCredentials: true` (axios) in requests.

The `/update` endpoint uses token-based auth via query parameter (no cookie needed).

---

## Health Check

### `GET /health`

Returns service health status.

**Auth**: None

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-03-14T10:30:00.000Z"
}
```

**Response** (503):
```json
{
  "status": "error",
  "message": "Database unreachable"
}
```

---

## DDNS Update

### `GET /update`

Update the IP address for a subdomain. DuckDNS-compatible format.

**Auth**: Token via query parameter

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `domain` | Yes | Subdomain name (e.g., `myhome`) |
| `token` | Yes | Domain update token (UUID) |
| `ip` | No | IP address. If omitted, auto-detected from request |

**Rate Limit**: 1 request per 30 seconds per token

**Examples**:
```bash
# Auto-detect IP
curl "https://api.devops-monk.com/update?domain=myhome&token=550e8400-e29b-41d4-a716-446655440000"

# Explicit IPv4
curl "https://api.devops-monk.com/update?domain=myhome&token=TOKEN&ip=203.0.113.42"

# Explicit IPv6
curl "https://api.devops-monk.com/update?domain=myhome&token=TOKEN&ip=2001:db8::1"
```

**Response** (200): `OK`
**Response** (400): `KO - missing params` or `KO - invalid IP`
**Response** (403): `KO - invalid token`
**Response** (429): `KO - rate limited, try again in 30 seconds`
**Response** (500): `KO - server error`

---

## Authentication Endpoints

### `POST /auth/register`

Create a new account with email and password.

**Auth**: None

**Rate Limit**: 5 per minute per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (200):
```json
{
  "ok": true,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```
Sets `token` cookie.

**Errors**:
- 400: `Email and password (min 8 chars) required`
- 409: `Email already registered`

---

### `POST /auth/login`

Login with email and password.

**Auth**: None

**Rate Limit**: 5 per minute per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (200):
```json
{
  "ok": true,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```
Sets `token` cookie.

**Errors**:
- 401: `Invalid credentials`

---

### `GET /auth/me`

Get the current authenticated user.

**Auth**: JWT cookie

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com"
}
```

**Errors**:
- 401: `Not authenticated` or `Session expired`

---

### `POST /auth/logout`

Clear the authentication cookie.

**Auth**: None (clears cookie regardless)

**Response** (200):
```json
{ "ok": true }
```

---

### `GET /auth/google`

Redirect to Google OAuth login.

**Auth**: None

**Behavior**: Redirects to Google. After authentication, redirects to `APP_URL/dashboard` with cookie set.

---

### `GET /auth/github`

Redirect to GitHub OAuth login.

**Auth**: None

**Behavior**: Redirects to GitHub. After authentication, redirects to `APP_URL/dashboard` with cookie set.

---

## Domain Endpoints

All domain endpoints require JWT authentication.

### `GET /api/domains`

List all domains owned by the authenticated user.

**Auth**: JWT cookie

**Response** (200):
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "subdomain": "myhome",
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "current_ip": "203.0.113.42",
    "record_type": "A",
    "updated_at": "2026-03-14T10:30:00.000Z",
    "created_at": "2026-03-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/domains`

Create a new subdomain.

**Auth**: JWT cookie

**Request Body**:
```json
{
  "subdomain": "myhome"
}
```

**Validation**: 3-63 characters, lowercase alphanumeric and hyphens only (`^[a-z0-9-]{3,63}$`).

**Response** (200):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subdomain": "myhome",
  "token": "generated-uuid",
  "current_ip": null,
  "record_type": "A",
  "updated_at": null,
  "created_at": "2026-03-14T10:30:00.000Z"
}
```

**Errors**:
- 400: `Invalid subdomain (3-63 chars, lowercase alphanumeric and hyphens)`
- 409: `Subdomain already taken`

---

### `DELETE /api/domains/:subdomain`

Delete a subdomain and its DNS record.

**Auth**: JWT cookie

**Response** (200):
```json
{ "ok": true }
```

**Errors**:
- 404: `Not found` (domain doesn't exist or doesn't belong to user)

---

### `POST /api/domains/:subdomain/regenerate-token`

Generate a new update token. The old token stops working immediately.

**Auth**: JWT cookie

**Response** (200): Returns the updated domain object with the new token.

**Errors**:
- 404: `Not found`

---

### `GET /api/domains/:subdomain/history`

Get the IP update history for a domain.

**Auth**: JWT cookie

**Query Parameters**:
| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 100 | Max records (cap: 500) |
| `offset` | 0 | Pagination offset |

**Response** (200):
```json
[
  {
    "ip": "203.0.113.42",
    "source_ip": "203.0.113.42",
    "user_agent": "curl/7.88.1",
    "updated_at": "2026-03-14T10:30:00.000Z"
  },
  {
    "ip": "198.51.100.1",
    "source_ip": "198.51.100.1",
    "user_agent": "DDNS-Desktop-Client/1.0",
    "updated_at": "2026-03-13T08:15:00.000Z"
  }
]
```

Results are sorted by `updated_at DESC` (newest first).

---

## Error Response Format

All errors return JSON:

```json
{
  "error": "Human-readable error message"
}
```

In development mode, a `message` field with the stack trace may also be included.

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `GET /update` | 1 request | 30 seconds (per token) |
| `POST /auth/login` | 5 requests | 60 seconds (per IP) |
| `POST /auth/register` | 5 requests | 60 seconds (per IP) |

Rate-limited responses return HTTP 429.
