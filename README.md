# Snack Distribution Management System

A web-based PWA for digitizing the office snack distribution process. Replaces paper tokens with dynamic QR codes for secure, fast snack redemption.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + PWA
- **Backend**: Spring Boot 3.3 + Spring Security + JWT + Java 21
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose

## Quick Start (Docker)

```bash
# Start everything
docker-compose up -d

# Access the app
open http://localhost
```

**Default admin credentials:**
- Username: `admin`
- Password: `admin123`

> ⚠️ Change the admin password immediately after first login.

## Development Setup

### Prerequisites
- Java 21 (JDK)
- Node.js 20+
- PostgreSQL 16 (or use Docker for just the database)
- Maven 3.9+

### Database Only (Docker)
```bash
docker-compose up postgres -d
```

### Backend
```bash
cd backend
mvn spring-boot:run
```
The backend runs on `http://localhost:8080`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on `http://localhost:5173`.

## User Roles

| Role | Portal | Capabilities |
|------|--------|-------------|
| **Admin** | `/admin` | Manage employees, users, view dashboard & history |
| **Distributor** | `/distributor` | Scan QR codes, redeem snacks, forgot-ID flow |
| **Employee** | `/employee` | View personal QR code, view redemption history |

## Redemption Flow

1. Employee opens the app → sees a dynamic QR code (refreshes every 25 seconds)
2. Distributor selects session (Morning/Evening)
3. Distributor scans employee's QR code
4. System displays employee photo for visual verification
5. Distributor confirms → snack is recorded
6. Duplicate redemptions are blocked

## Security

- **Dynamic QR Tokens**: JWT-based, 30-second expiry, one-time-use (jti tracking)
- **Photo Verification**: Employee photo displayed after QR scan for identity confirmation
- **Duplicate Prevention**: Database-level unique constraint per employee/session/day
- **PIN Fallback**: 4-digit hashed PIN for forgot-ID cases
- **Role-Based Access**: Spring Security with endpoint-level authorization

## API Reference

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Public | Login |
| `/api/qr/generate` | GET | Employee | Generate QR token |
| `/api/redemptions/scan` | POST | Distributor | Validate QR |
| `/api/redemptions/confirm` | POST | Distributor | Confirm redemption |
| `/api/redemptions/manual` | POST | Distributor | Forgot-ID flow |
| `/api/employees` | GET/POST | Admin | Employee CRUD |
| `/api/users` | GET/POST | Admin | User CRUD |
| `/api/dashboard/today` | GET | Admin | Dashboard stats |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `snackdb` | Database name |
| `DB_USER` | `snackadmin` | Database user |
| `DB_PASSWORD` | `snackpass123` | Database password |
| `JWT_SECRET` | (dev default) | HMAC signing key (≥256 bits) |
| `PHOTO_DIR` | `./uploads/photos` | Photo upload directory |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |

## Project Structure

```
├── frontend/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/       # Axios API client
│   │   ├── auth/      # Auth context, protected routes
│   │   ├── components/# Shared UI components
│   │   └── features/  # employee/, distributor/, admin/
│   └── Dockerfile
├── backend/           # Spring Boot
│   ├── src/main/java/com/snackmgmt/
│   │   ├── config/    # Security, CORS, Web config
│   │   ├── controller/# REST controllers
│   │   ├── service/   # Business logic
│   │   ├── entity/    # JPA entities
│   │   ├── repository/# Data access
│   │   ├── security/  # JWT service, auth filter
│   │   └── exception/ # Global error handling
│   └── Dockerfile
└── docker-compose.yml
```
