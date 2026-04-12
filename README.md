# FlavorTales

![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen?logo=springboot)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
![Redis](https://img.shields.io/badge/Redis-7.2-red?logo=redis)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

> A food-tourism platform that connects **vendors**, **tourists**, and **admins** through an interactive, location-aware experience.

---

## About

FlavorTales is a platform designed to bridge local food vendors and travellers. Vendors register their shops and Points of Interest (POIs) on an interactive map; tourists discover nearby food experiences through geofence-based proximity detection and audio guides. Admins oversee an approval workflow to ensure quality and authenticity.

**Three roles, one ecosystem:**
| Role | What they do |
|------|-------------|
| **Vendor** | Register shops, upload menus and audio content, track analytics |
| **Tourist** | Discover POIs on a live map, receive proximity notifications, explore curated food stories |
| **Admin** | Approve or reject vendor submissions, manage users and platform content |

---

## Key Features

- **Interactive Map** — Leaflet-powered map with real-time POI discovery and geofence-based proximity detection
- **Vendor Onboarding** — Full shop registration flow with menu management and media uploads (images, audio)
- **Admin Approval Workflow** — POIs and shops go through a `pending → active / rejected` review pipeline
- **Secure Authentication** — JWT in HTTP-only cookies, email verification, and rate-limited login (5 attempts / 15 min lockout)
- **Audio Content** — Vendors attach audio stories to their POIs for immersive tourist guides
- **Full-Text Search** — MongoDB-backed search across POIs and shop content
- **Real-Time Notifications** — STOMP/WebSocket event-driven notification system
- **Analytics Dashboard** — Vendors and admins access traffic and engagement metrics

---

## System Architecture

### Backend — Spring Boot Multi-Module

| Module | Responsibility |
|--------|---------------|
| `flavortales-app` | Spring Boot entry-point, aggregates all modules |
| `flavortales-common` | Shared `ApiResponse<T>`, DTOs, 40+ custom exceptions, AOP annotations |
| `flavortales-auth` | JWT login/register, email verification, password reset, rate-limiting |
| `flavortales-user` | User profiles and role management (`ROLE_vendor`, `ROLE_admin`) |
| `flavortales-poi` | Points of Interest, geofencing, status workflow |
| `flavortales-content` | Shops and menu items, admin approval |
| `flavortales-file` | Image/file asset management via Cloudflare R2 (S3-compatible) |
| `flavortales-audio` | Audio content upload and management |
| `flavortales-search` | Full-text search indexing (MongoDB) |
| `flavortales-location` | Tourist location and session tracking |
| `flavortales-notification` | Event-driven notification broadcasting |
| `flavortales-analytics` | Event analytics and reporting |

### Frontend — Next.js App Router

Feature modules under `frontend/modules/` mirror the backend:
`admin | analytics | audio | auth | content | file | location | notification | poi | search | shop | user | vendor`

Shared utilities under `frontend/shared/`:
`components | hooks | i18n | ui | utils`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 21, Spring Boot 3.5, Maven multi-module, MapStruct 1.6, JJWT 0.12 |
| **Frontend** | Next.js 15, React 19, TypeScript 5 (strict), Tailwind CSS 4, Framer Motion |
| **Maps** | Leaflet 1.9 + react-leaflet 5 |
| **Real-Time** | STOMP.js + SockJS (WebSocket) |
| **Database** | MySQL 8.0 (primary + read replica, GTID replication) |
| **Cache** | Redis 7.2 |
| **Search / Storage** | MongoDB 7.0 |
| **File Storage** | Cloudflare R2 via AWS SDK v2 |
| **Infrastructure** | Docker Compose (MySQL × 2, Redis, MongoDB) |
| **Testing** | JUnit 5 + Mockito (backend), Vitest + Testing Library (frontend) |

---

## Repository Structure

```
├── backend/          # Spring Boot multi-module application
│   ├── flavortales-app/
│   ├── flavortales-auth/
│   ├── flavortales-common/
│   └── ...           # (see module table above)
├── frontend/         # Next.js application
│   ├── app/          # App Router pages (admin, vendor, map, auth)
│   ├── modules/      # Feature modules
│   └── shared/       # Reusable components, hooks, i18n, utils
├── database/
│   └── mysql/        # Schema (mysql_schema.sql) and seed data
├── infrastructure/   # Docker Compose for local dev environment
├── docs/             # Architecture docs, sequence diagrams, PRD
└── main/             # Production-ready merged code (this branch)
```

---

## Getting Started

### Prerequisites

- [JDK 21](https://adoptium.net/) (`JAVA_HOME` must point to JDK 21)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Maven](https://maven.apache.org/) (or use the included `mvnw.cmd` wrapper)

### 1. Start Infrastructure (MySQL, Redis, MongoDB)

```bash
cd infrastructure
docker compose up -d
```

### 2. Run the Backend

```bash
cd backend
./mvnw.cmd spring-boot:run -pl flavortales-app
```

### 3. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## API Contract

Every backend endpoint returns a unified response envelope:

```json
{
  "success": true,
  "message": "OK",
  "data": { ... },
  "timestamp": "2026-04-12T10:00:00"
}
```

**Authentication:** JWT issued on login, stored in HTTP-only cookies. All routes except `/api/auth/**` require a valid bearer token. Sessions are stateless.

---

## Branching Strategy

This repository uses four dedicated branches that each merge directly into `main`:

```
backend        ──┐
frontend       ──┤
                 ├──> main
database       ──┤
infrastructure ──┘
```

| Branch | Purpose |
|--------|---------|
| `main` | Stable production branch |
| `backend` | Spring Boot source code |
| `frontend` | Next.js source code |
| `database` | MySQL schema, migrations, seed data |
| `infrastructure` | Docker Compose and deployment configuration |

**Rule:** Changes in each branch are developed and validated independently, then merged directly into `main` when ready.

---

## Contributing

1. Create your feature branch from the appropriate source branch (`backend`, `frontend`, `database`, or `infrastructure`).
2. Commit your changes with clear, descriptive messages.
3. Open a Pull Request targeting the correct branch (not `main` directly).
4. Ensure all tests pass before requesting review.

---

## License

This project is licensed under the [MIT License](LICENSE).
