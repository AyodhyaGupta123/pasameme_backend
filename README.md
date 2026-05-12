# PasaMeme Backend

Express + MongoDB API for authentication, wallet/header data, trades, and price endpoints.

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas (or local MongoDB)

## Setup

1. Install dependencies:
   - `npm install`
2. Create env file:
   - Copy `.env.example` to `.env`
3. Start server:
   - Dev: `npm run dev`
   - Prod: `npm start`

Default local URL: `http://localhost:5001`

## Environment Variables

- `PORT` (default: `5001`)
- `MONGO_URI` (required)
- `JWT_SECRET` (required)

## Security

- CORS allowlist is enabled in `server.js`
- Helmet security headers enabled
- API rate limiting enabled on `/api/*` (300 req / 15 min / IP)
- Never commit `.env` to git

## Quick Health Checks

- Root: `GET /`
- Price health: `GET /api/prices/health`
- WS status: `GET /api/prices/ws/status`

## API Documentation

See `API.md` for endpoint list and request examples.
