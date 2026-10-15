# Gatehouse API Gateway Platform 🛡️

Gatehouse is an enterprise-grade, high-performance API Gateway and Developer Analytics Platform built on the **MERN** (MongoDB, Express.js, React, Node.js) tech stack. It acts as a centralized reverse proxy engine that governs API ingress traffic, enforces high-precision sliding window rate limits, cryptographically manages API keys, and delivers real-time developer analytics and an interactive Postman-style workbench.

---

## 🏛️ Architecture Overview

```
                      +---------------------------------------+
                      |         API Consumer Client           |
                      |  (HTTP Headers: x-api-key: gh_live_*) |
                      +-------------------+-------------------+
                                          |
                                          v  /gateway/:serviceSlug/*
                      +---------------------------------------+
                      |       Gatehouse Gateway Core          |
                      |           (Port 5050)                 |
                      +-------------------+-------------------+
                                          |
                     [ 1. API Key Auth & SHA-256 Verification ]
                                          |
                     [ 2. Sliding Window Rate Limiting (429)  ]
                                          |
                     [ 3. Service Scope & Method Authorization]
                                          |
                     [ 4. Header Injection & Latency Timing   ]
                                          |
                         +----------------+----------------+
                         |                                 |
                         v                                 v (Async)
        +---------------------------------+     +-----------------------+
        |   Target Upstream Backends      |     | MongoDB Ingress Logs  |
        | - Orders Service                |     | - Latency (ms)        |
        | - Products Inventory            |     | - Status Code         |
        | - Third-Party Rest Endpoints    |     | - Key & Service IDs   |
        +---------------------------------+     +-----------------------+
```

---

## 👥 Supported Actors & Core Workflows

### 1. The Platform Developer (Internal User)
- **Authentication**: Sign up, log in with JWT tokens, manage organization profile.
- **Upstream Configuration**: Add, edit, and toggle active status for target backend services, with live health-check ping tests.
- **Key Management**: Cryptographically generate API keys (`gh_live_...`). Gatehouse stores only irreversible SHA-256 hashes in MongoDB, revealing the secret key once. Keys can be instantly revoked.
- **Traffic Control**: Define granular rate limits (e.g. 60 requests/minute, 1,000 requests/hour) bound to individual keys and specific service scopes.
- **Analytics Dashboard**: View KPI cards (Total Requests, Error Rate, Avg Latency), daily traffic volume bar charts, status code donut distributions, and recent activity logs.
- **API Playground**: Integrated browser-based Postman alternative to test gateway calls, inspect response headers, and export 1-click cURL commands.

### 2. The API Consumer (External Client)
- Calls `/gateway/:serviceSlug/*` passing `x-api-key` in the headers.
- Receives transparent reverse-proxied responses from target backends.
- Receives standard telemetry headers:
  - `X-RateLimit-Limit`: Maximum permitted requests in window
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `X-RateLimit-Reset`: Unix timestamp when quota resets
  - `X-Gatehouse-Latency`: Microsecond-precision proxy latency (e.g., `24.5ms`)

### 3. The Gateway Engine (Backend Core)
- High-throughput reverse proxy routing with latency timers.
- Sub-millisecond sliding window rate limiting cache.
- Returns standard `429 Too Many Requests` with `Retry-After` headers when limits are reached.
- Non-blocking asynchronous audit logging to MongoDB.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **MongoDB** (Local `mongod`, MongoDB Atlas URI, or zero-config automatic in-memory fallback)

### 2. Run the Backend Server
```bash
cd server
npm install
npm run dev
```
*The server starts on port `5050`. If no local MongoDB is detected, an automatic in-memory database instance will spin up transparently and seed demo data.*

### 3. Run the React Client
```bash
cd client
npm install
npm run dev
```
*The frontend starts on `http://localhost:3000` with hot-module reloading and proxying to port `5050`.*

---

## 🔑 Pre-Seeded Demo Credentials

Upon fresh initialization, Gatehouse seeds a full demo developer environment:

- **Developer Email**: `developer@gatehouse.io`
- **Password**: `Password123!`
- **Sample API Key 1**: `gh_live_1493ce9452fb36078b7f7df2b9bfd2c170d425842aa46511` (Limit: 60 req/min)
- **Sample API Key 2**: `gh_live_a427b1741739e8c08ab4d7151f23ce55753bc9d7191dbecd` (Limit: 20 req/min)
- **Configured Services**:
  - `orders` -> `http://localhost:5050/api/mock-upstream/orders`
  - `products` -> `http://localhost:5050/api/mock-upstream/products`
  - `jsonplaceholder` -> `https://jsonplaceholder.typicode.com`

---

## 📡 Gateway API Ingress Reference

### Execute a Proxied Call:
```bash
curl -X GET "http://localhost:5050/gateway/orders" \
  -H "x-api-key: gh_live_1493ce9452fb36078b7f7df2b9bfd2c170d425842aa46511"
```

### Rate Limit Response (HTTP 429):
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. You are limited to 20 requests per 1m.",
  "limit": 20,
  "remaining": 0,
  "retryAfterSeconds": 14
}
```
Headers returned:
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1773504920
Retry-After: 14
X-Gatehouse-Latency: 2.1ms
```
