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

## Cloudflare Hosting

This project is prepared for deployment and hosting through Cloudflare. Since the application includes a Java backend and a PostgreSQL database, standard Cloudflare Pages alone is not enough to run the full stack. Choose one of the following methods:

### Method 1: Cloudflare Tunnel (Recommended for Self-Hosting)

Expose the application directly and securely from your local machine or server through Cloudflare without open firewall ports.

#### Option A: Docker Compose Tunnel
1. Install [Docker Desktop](https://www.docker.com/).
2. Create or edit your `.env` file in the root directory and add your Cloudflare Tunnel Token:
   ```env
   TUNNEL_TOKEN=your-cloudflare-tunnel-token-here
   ```
3. Start the stack along with the Cloudflare Tunnel:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d
   ```
   This will start PostgreSQL, the backend, the frontend, and run a secure tunnel proxying traffic to the frontend container (port 80).

#### Option B: Local Quick Tunnel (Development/Sharing)
If you run the app natively using `run.bat` (Postgres in Docker, frontend/backend locally):
1. Install `cloudflared` CLI on your machine.
2. Run the tunnel script:
   ```bash
   run-tunnel.bat
   ```
   This starts the full environment and automatically spawns a temporary tunnel (e.g., `https://xxx.trycloudflare.com`) pointing to the UI. Since Vite is configured to proxy `/api` and `/uploads` requests, this single tunnel exposes the entire application securely!

---

### Method 2: Cloudflare Pages (Frontend Hosting Only)

Host the React frontend statically on Cloudflare Pages, and proxy API calls to your hosted backend.

1. The project contains a `frontend/public/_redirects` file which is copied into your production build folder.
2. Edit `frontend/public/_redirects` to point to your hosted backend URL:
   ```
   /api/* https://your-backend-api-url.com/api/:splat 200
   /uploads/* https://your-backend-api-url.com/uploads/:splat 200
   /* /index.html 200
   ```
3. Deploy the `frontend/` directory to Cloudflare Pages (Build Command: `npm run build`, Output Directory: `dist`).
4. Ensure your hosted backend has CORS configured to allow the Cloudflare Pages subdomain (e.g., via `CORS_ORIGINS` env variable).

