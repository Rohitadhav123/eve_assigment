# EVE Healthcare – SDE Intern Backend Engineering Assignment

Backend API service for **Diagnostic Test Bookings & Simulated Payments**, built with Node.js, Express.js, PostgreSQL, Prisma ORM, JWT, Zod, and Jest.

---

## 1. Project Overview

The EVE Healthcare backend manages diagnostic centres, available diagnostic tests, appointment bookings, and payment simulations with webhook integration. The application strictly handles:
- User signup and login with role-based access control (`USER`, `ADMIN`).
- Dynamic pricing per centre for diagnostic tests.
- Slot conflict prevention for appointment bookings.
- Simulated payment processing with customizable success rates.
- Idempotent payment webhooks secured via HMAC-SHA256 signature verification.
- State-machine driven booking status transitions.

---

## 2. Tech Stack

- **Runtime**: Node.js (20+) (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Authentication**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`)
- **Validation**: Zod
- **Security**: Helmet, CORS, Express Rate Limit
- **Testing**: Jest + Supertest
- **Containerization**: Docker & Docker Compose

---

## 3. Simple Architecture & Flow Diagrams

### High-Level Architecture

```text
[ Client / Webhook Caller ]
            │
            ▼
   [ Express Application ]
            │
   ┌────────┴────────┐
   ▼                 ▼
[ Middleware ]   [ Router ]
(Auth/Zod/Rate)      │
                     ▼
             [ Controller ]
                     │
                     ▼
              [ Service ] ◄──────► [ BookingStateService ]
                     │
                     ▼
           [ Prisma ORM Client ]
                     │
                     ▼
           [ PostgreSQL Database ]
```

### Booking & Payment Lifecycle

```text
User creates Booking (PENDING)
            │
            ├──► Payment Process (POST /api/payments)
            │         │
            │         ├──► Success Rate (e.g., 80%)
            │         ├──► SUCCESS ──► Booking CONFIRMED
            │         └──► FAILED  ──► Booking FAILED
            │
            └──► Webhook Process (POST /api/payments/webhook)
                      │
                      ├──► Verify HMAC-SHA256 Signature Header
                      ├──► Idempotency Check (WebhookEvent.eventId)
                      └──► Execute inside Database Transaction:
                            ├── Record WebhookEvent
                            ├── Update Payment Record
                            └── Validate Booking State Transition
```

---

## 4. Folder Structure

```text
c:/eve/
├── src/
│   ├── config/
│   │   ├── env.js                # Zod environment variable validation
│   │   └── prisma.js             # Prisma singleton instance
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── centre.controller.js
│   │   ├── booking.controller.js
│   │   └── payment.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── booking.service.js
│   │   ├── payment.service.js
│   │   └── bookingState.service.js   # Centralized state machine
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── centre.routes.js
│   │   ├── test.routes.js
│   │   ├── booking.routes.js
│   │   └── payment.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT & role auth
│   │   ├── validate.middleware.js # Zod validator
│   │   ├── error.middleware.js    # Global error handler
│   │   └── rateLimit.middleware.js# Endpoint rate limiters
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── centre.validator.js
│   │   ├── booking.validator.js
│   │   └── payment.validator.js
│   ├── utils/
│   │   ├── error.js               # Custom AppError class
│   │   ├── asyncHandler.js        # Express async wrapper
│   │   └── security.js            # HMAC-SHA256 signature utility
│   ├── app.js                     # Express app configuration
│   └── server.js                  # Entry point & server listener
├── prisma/
│   ├── schema.prisma              # PostgreSQL Prisma Schema
│   ├── seed.js                    # Database seed script
│   └── migrations/                # Database migrations
├── tests/
│   ├── bookingState.test.js       # Unit tests for state transitions
│   ├── auth.test.js               # Integration tests for Auth
│   ├── booking.test.js            # Integration tests for Bookings
│   ├── payment.test.js            # Integration tests for Payments
│   └── webhook.test.js            # Integration tests for Webhook & Idempotency
├── .env.example
├── .gitignore
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 5. Database Schema

```text
User (id, name, email, passwordHash, role, createdAt)
DiagnosticCentre (id, name, location, createdAt)
DiagnosticTest (id, name, description, createdAt)
CentreTest (id, centreId, testId, price, createdAt)
Booking (id, userId, centreTestId, appointmentAt, amount, status, createdAt, updatedAt)
Payment (id, bookingId, amount, status, providerTransactionId, idempotencyKey, createdAt)
WebhookEvent (id, eventId, type, payload, processedAt, createdAt)
```

Key Unique Constraints:
- `User.email`: Unique user identifier
- `DiagnosticTest.name`: Unique test name
- `CentreTest(centreId, testId)`: A test can only be added once per centre
- `Booking(centreTestId, appointmentAt)`: Prevents duplicate bookings for the exact same slot
- `Payment.providerTransactionId`: Unique gateway transaction ID
- `Payment.idempotencyKey`: Unique client idempotency key
- `WebhookEvent.eventId`: Prevents duplicate webhook event processing

---

## 6. Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Express server port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/eve_db?schema=public` |
| `JWT_SECRET` | Secret key for JWT signing | `super-secret-jwt-key-for-eve-healthcare-2026` |
| `JWT_EXPIRES_IN` | Token expiration time | `24h` |
| `PAYMENT_SUCCESS_RATE` | Probability of simulated payment success | `0.8` |
| `WEBHOOK_SECRET` | HMAC secret key for payment webhook verification | `super-secret-webhook-key-12345` |

---

## 7. How to Run Locally

### Prerequisites
- Node.js 20+
- PostgreSQL database running locally or via Docker

### Setup Steps
1. Clone repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Run database migrations and seed:
   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

---

## 8. Docker Setup

Run the entire application stack (API + PostgreSQL DB) with persistent volume:

```bash
docker compose up --build
```

The server will automatically run migrations, seed initial data, and serve at `http://localhost:5000`.

---

## 9. API Endpoints Overview

### Health Check
- `GET /health`

### Auth Endpoints
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Fetch authenticated user profile

### Diagnostic Centres & Tests
- `GET /api/centres` - Public (Paginated list of centres with tests and prices)
- `GET /api/centres/:id` - Public (Single centre with tests and prices)
- `POST /api/centres` - Admin Only (Create centre)
- `POST /api/centres/:id/tests` - Admin Only (Add test to centre with price)
- `GET /api/tests` - Public (Paginated list of tests)
- `POST /api/tests` - Admin Only (Create test)

### Booking Endpoints
- `POST /api/bookings` - Protected (Create booking)
- `GET /api/bookings` - Protected (List user's bookings; Admin sees all)
- `GET /api/bookings/:id` - Protected (View booking details)
- `PATCH /api/bookings/:id/cancel` - Protected (Cancel booking)

### Payment & Webhook Endpoints
- `POST /api/payments` - Protected (Simulate payment, optional `Idempotency-Key` header)
- `POST /api/payments/webhook` - Public (HMAC-SHA256 signed payment webhook)

---

## 10. Webhook Idempotency & Security

1. **HMAC-SHA256 Signature Verification**:
   - Webhooks must include an `X-Signature` header computed as `HMAC-SHA256(rawBody, WEBHOOK_SECRET)`.
   - Verification uses `crypto.timingSafeEqual` to prevent timing attacks. Returns `401 Unauthorized` if invalid.

2. **Idempotency Guarantee**:
   - `WebhookEvent.eventId` is globally unique.
   - When a webhook arrives, the backend executes inside a single database transaction (`prisma.$transaction`).
   - If the `eventId` has already been recorded, the handler exits early returning `{ "status": "already_processed" }` with `HTTP 200`.

3. **Booking State Rules**:
   - Transition Rules:
     - `PENDING` ──► `CONFIRMED`, `FAILED`, `CANCELLED`
     - `CONFIRMED` ──► `CANCELLED`
     - `FAILED` ──► Terminal state
     - `CANCELLED` ──► Terminal state
   - A late `payment.failed` webhook for an already `CONFIRMED` booking is logged and safely ignored without altering booking state.
   - A `payment.success` webhook for a `CANCELLED` booking leaves the booking `CANCELLED`.

---

## 11. Seed Credentials

Running `npm run prisma:seed` creates the following test accounts:

- **Admin User**:
  - Email: `admin@eve.com`
  - Password: `Password123`
  - Role: `ADMIN`

- **Normal User**:
  - Email: `rohit@example.com`
  - Password: `Password123`
  - Role: `USER`

---

## 12. Running Tests

Run unit and integration tests using Jest:

```bash
npm test
```

Test Suites:
- `tests/bookingState.test.js`: State machine validation logic
- `tests/auth.test.js`: Authentication & authorization flows
- `tests/booking.test.js`: Booking creation, slot conflicts, pricing, authorization checks
- `tests/payment.test.js`: Simulated payment processing, success/failure outcomes, idempotency header
- `tests/webhook.test.js`: Signature verification, event idempotency, late webhooks

---

## 13. Important Assumptions

1. **No Real Money Transactions**: Payment processing is simulated internally based on `PAYMENT_SUCCESS_RATE`.
2. **Refunds**: Cancellations do not initiate automatic payment gateway refunds.
3. **Appointment Slot Granularity**: Appointments are booked for specific ISO timestamp slots per centre-test pair.
4. **Terminal States**: `FAILED` and `CANCELLED` bookings cannot be re-opened.

---

## 14. Potential Future Improvements

1. **Redis Caching**: Add Redis caching for public diagnostic centre listings (`GET /api/centres`).
2. **Background Job Queue**: Integrate BullMQ or RabbitMQ for asynchronous notifications (SMS/Email appointment reminders).
3. **Advanced Slot Scheduling**: Configurable operating hours and slot capacities per diagnostic centre.
