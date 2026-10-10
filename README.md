# Incognito — Anonymous College Feedback and Reporting Platform

> **Prototype 1** — A privacy-first, zero-knowledge verifiable anonymous feedback platform for college campuses.

[![Tests](https://img.shields.io/badge/Vitest-10%2F10%20Passing-emerald)](https://vitest.dev)
[![Fastify](https://img.shields.io/badge/Backend-Fastify%20%2B%20TypeScript-violet)](https://fastify.io)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20Tailwind-teal)](https://react.dev)

---

## 1. Overview & Core Mission

Students often hesitate to voice critical concerns about teaching quality, campus facilities, or administrative practices due to fear of retaliation, social awkwardness, or loss of privacy. 

**Incognito** solves this problem by decoupling **membership verification** from **report submission**:
1. **Verified Membership:** Verifies that a reporter is an eligible college member *without* revealing their identity (student ID, name, email) to the report recipient or reporting server.
2. **Scoped Nullifiers:** Prevents duplicate reports within the same reporting scope (e.g., `teaching:2026-Q4`) while keeping reports across different scopes cryptographically un-linkable.
3. **Privacy Risk Gate:** Automatically scans submitted reports for direct personal identifiers (names, emails, phone numbers) and narrow contextual details (dates, room numbers) to redact or hold reports before human review.
4. **Differential Threshold Aggregation:** Feedback recipient dashboards suppress summary metrics when contributor volume in a scope is below 3 members to prevent micro-targeting.

---

## 2. Architecture & Dataflow

```
+--------------------------------+       +------------------------------------+
| College Identity Verifier      |       | Client Browser                     |
| (Trusted Authority Provider)   |       | - Live Privacy Guard Pre-Scan      |
+--------------------------------+       +------------------------------------+
               |                                           |
               | Generates ZK Proof                        | Submits Report + Proof
               v                                           v
+-----------------------------------------------------------------------------+
| Incognito Backend API Engine (Fastify + SQLite)                              |
|                                                                             |
| 1. Proof Verification (`verifier.ts`)                                       |
|    - Validates proof signature & scope binding                              |
|                                                                             |
| 2. Scoped Duplicate Guard (`reportService.ts`)                              |
|    - Computes/Checks `UNIQUE(scope_id, nullifier)`                          |
|    - Rejects duplicates with HTTP 409 Conflict                              |
|                                                                             |
| 3. Privacy Risk Gate (`privacyGate.ts`)                                     |
|    - Redacts direct identifiers (Emails, Phone, Student IDs)                |
|    - Flags contextual risks (Dates, Rooms) -> Held for Privacy Review       |
|    - Flags Serious Allegations -> Escalates to Ethics Committee Route       |
+-----------------------------------------------------------------------------+
               |                                           |
               v                                           v
+--------------------------------+       +------------------------------------+
| Moderator Review Portal        |       | Feedback Recipient Dashboard       |
| - Inspect & redact content     |       | - Category analytics & charts      |
| - Zero reporter identities     |       | - Suppressed if contributors < 3   |
+--------------------------------+       +------------------------------------+
```

---

## 3. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend:** Node.js, Fastify, TypeScript, SQLite (`better-sqlite3`), Zod validation.
- **Testing:** Vitest (10/10 automated integration tests covering all security requirements).

---

## 4. Quick Start & Setup Instructions

### Prerequisites
- Node.js `v18+` or `v20+` or `v22+`
- `npm` v9+

### Installation

1. **Clone & Install Dependencies:**
   ```bash
   npm run setup
   ```
   *This automatically installs root, server, and client npm dependencies.*

2. **Seed Demo Data:**
   ```bash
   npm run seed
   ```

3. **Run Automated Test Suite:**
   ```bash
   npm test
   ```

4. **Launch Development Server (Backend on `:3001` + Frontend on `:3000`):**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 5. API Documentation

### `POST /api/verification/demo`
Simulates zero-knowledge proof & scoped nullifier derivation.
- **Request Body:**
  ```json
  {
    "studentTicket": "STU-2026-8891",
    "scopeId": "teaching:2026-Q4"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "valid": true,
    "scopeId": "teaching:2026-Q4",
    "nullifier": "0x7f8a92e1098520f9241e...",
    "proofToken": "simulated_zkp_v1....",
    "isSimulated": true
  }
  ```

---

### `POST /api/reports`
Submits an anonymous report with bound membership proof.
- **Request Body:**
  ```json
  {
    "category": "teaching",
    "scopeId": "teaching:2026-Q4",
    "content": "Lecture slides need code examples for Dijkstra algorithm.",
    "proofToken": "simulated_zkp_v1....",
    "nullifier": "0x7f8a92e1098520f9241e..."
  }
  ```
- **Responses:**
  - `201 Created` — Accepted and classified (`approved_for_aggregation` or `held_for_privacy_review`).
  - `409 Conflict` — Duplicate submission rejected (`UNIQUE(scope_id, nullifier)` constraint triggered).
  - `401 Unauthorized` — Invalid or tampered proof token.

---

### `GET /api/admin/reports`
Retrieves reports for authenticated moderators. *(Requires Header `Authorization: Bearer moderator-secret-token-2026`)*.
- **Response (200 OK):** Returns reports list. **Guaranteed zero reporter identities or nullifiers returned.**

---

### `PATCH /api/admin/reports/:id`
Updates report status and optional sanitized content.
- **Request Body:**
  ```json
  {
    "status": "approved_for_aggregation",
    "sanitizedContent": "Redacted content..."
  }
  ```

---

### `GET /api/feedback/summary`
Retrieves aggregated feedback for recipient dashboard. Automatically suppresses categories where total contributors < 3.

---

### `GET /api/health`
Returns system status & timestamp.

---

## 6. Security Boundaries: Implemented vs Simulated

| Feature | Status | Details |
| :--- | :--- | :--- |
| **Scoped Nullifier Duplicate Guard** | **Implemented** | Database enforces `UNIQUE(scope_id, nullifier)` constraint |
| **Privacy Risk Gate** | **Implemented** | Auto-flags emails, phone numbers, student IDs, dates, rooms |
| **Threshold Aggregation** | **Implemented** | Suppresses feedback summaries when contributors < 3 |
| **Zero-Knowledge Proofs** | **Simulated Interface** | Prototype uses `H(Secret, Scope)` HMAC signature simulation |
| **IP Anonymity** | **Local Transport** | Requires Tor routing / blind proxy relays in production |

---

## 7. Presentation Demo Script (3-Minute College Presentation)

1. **Slide / Screen 1 (Landing Page):**
   - *"Hello everyone. Today we are presenting Incognito — an anonymous college feedback platform designed to protect student privacy while guaranteeing eligible membership."*
2. **Screen 2 (Report Submission & Verification):**
   - *"Let's navigate to Submit Report. First, we generate a verified membership proof using demo ticket `STU-2026-8891`. Notice how a cryptographic nullifier hash `0x7f8a...` is generated."*
   - *"Now, if I try to type my email `john.doe@college.edu` into the report, our live client Privacy Guard immediately warns me before submission."*
3. **Screen 3 (Duplicate Prevention Demo):**
   - *"Watch what happens if I click submit twice in the exact same scope (`teaching:2026-Q4`). The backend database enforces a unique nullifier constraint and rejects the duplicate with HTTP 409 Conflict."*
4. **Screen 4 (Moderator & Recipient Dashboards):**
   - *"On the Moderator Portal, reviewers can sanitize reports or hold contextual risks without ever seeing student identities. Finally, on the Recipient Insights page, results with under 3 contributors are automatically suppressed to protect small groups."*

---

## 8. License

MIT License. Developed for College Privacy & Security Demonstration.
