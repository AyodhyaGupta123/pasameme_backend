# Backend API Documentation

Base URL (local): `http://localhost:5001/api`

## Auth

### POST `/auth/register`

Registers a new user.

Body:

```json
{
  "username": "trader_user",
  "email": "trader@example.com",
  "password": "StrongPass123"
}
```

### POST `/auth/login`

Logs in and returns JWT token.

Body:

```json
{
  "email": "trader@example.com",
  "password": "StrongPass123"
}
```

### GET `/auth/profile`

Returns current user profile.

Headers:

- `Authorization: Bearer <token>`

### PATCH `/auth/balance`

Updates user balance.

Headers:

- `Authorization: Bearer <token>`

Body:

```json
{
  "amount": 100
}
```

## Header / Wallet

### GET `/header/info`

Gets user header info.

### GET `/header/wallet`

Gets user wallet summary.

### PUT `/header/notification/:id`

Marks one notification as read.

### PUT `/header/notifications/read-all`

Marks all notifications as read.

### DELETE `/header/notification/:id`

Deletes a single notification.

### DELETE `/header/notifications`

Clears all notifications.

## Trade

### POST `/trade/place`

Places a trade.

Body:

```json
{
  "userId": "<mongo_user_id>",
  "side": "buy",
  "price": 69800,
  "size": 0.01,
  "type": "market"
}
```

## Prices

### GET `/prices/ws/status`

WebSocket manager status.

### GET `/prices/live/:symbol`

Gets one symbol live price snapshot.

### POST `/prices/live/batch`

Gets multiple symbols snapshot.

Body:

```json
{
  "symbols": ["DOGE", "SHIB", "PEPE"]
}
```

### GET `/prices/changes/:symbol`

Placeholder endpoint.

### GET `/prices/cached/:symbol`

Placeholder endpoint.

### GET `/prices/health`

Health check.
