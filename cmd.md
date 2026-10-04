# PulseBoard Commands Reference (Windows)

This file contains all the necessary Windows PowerShell commands to setup, run, and test the PulseBoard project.

## 🚀 Prerequisites

Ensure you have the following installed:
- Docker Desktop
- Python 3.11+
- Node.js 18+ and npm
- Git

## 🐳 Quick Start (Docker Compose - Recommended)

The easiest way to run the entire stack (API, Frontend, Database, Redis, and Background Workers).

```powershell
# 1. Navigate to project directory
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard"

# 2. Copy the environment variables file
Copy-Item .env.example .env

# 3. Generate a secure JWT_SECRET_KEY and add it to your .env file
$jwtKey = python -c "import secrets; print(secrets.token_urlsafe(48))"
Write-Host "Generated JWT_SECRET_KEY: $jwtKey"
# Manually add this to your .env file or use:
(Get-Content .env) -replace 'JWT_SECRET_KEY=.*', "JWT_SECRET_KEY=$jwtKey" | Set-Content .env

# 4. Build and start the entire stack
docker compose up --build

# 5. Access the application:
# - Frontend: http://localhost:8080
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs

# 6. To stop the stack and remove volumes (including database data)
docker compose down -v

# 7. To view logs for specific services
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f frontend
```

---

## 💻 Local Development (Without Docker)

Useful for active development with faster reloads and easier debugging. Uses Docker only for PostgreSQL and Redis.

### 1. Start Infrastructure Services
```powershell
# Navigate to project root
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard"

# Start only the database and cache in the background
docker compose up -d postgres redis

# Verify services are running
docker compose ps
```

### 2. Setup & Run Backend
```powershell
# Open a new PowerShell window
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\backend"

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
Copy-Item .env.example .env

# Edit .env for local development (update URLs to point to localhost)
# DATABASE_URL=postgresql+asyncpg://pulseboard:pulseboard@localhost:5432/pulseboard
# REDIS_URL=redis://localhost:6379/0
# CELERY_BROKER_URL=redis://localhost:6379/1
# CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Run database migrations
alembic upgrade head

# Start the API server (reloads automatically on code changes)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Start Celery Worker & Beat (Required for Monitoring)
Open **two new PowerShell windows** for Celery processes:

```powershell
# Terminal A - Worker Process
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\backend"
.\.venv\Scripts\Activate.ps1
# Note: '-P solo' is used because Celery's default 'prefork' pool doesn't work on Windows
celery -A app.workers.celery_app worker --loglevel=info -P solo
```

```powershell
# Terminal B - Beat Scheduler
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\backend"
.\.venv\Scripts\Activate.ps1
celery -A app.workers.celery_app beat --loglevel=info
```

### 4. Setup & Run Frontend
```powershell
# Open a new PowerShell window
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\frontend"

# Install dependencies
npm install

# Copy frontend environment file if needed
Copy-Item .env.example .env

# Start the frontend development server
npm run dev
```

The frontend will be available at http://localhost:5173 and will proxy API requests to your local backend at http://localhost:8000.

---

## 🧪 Testing

### Backend Tests
```powershell
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\backend"
.\.venv\Scripts\Activate.ps1

# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py

# Run tests with coverage
pytest --cov=app tests/
```

### Frontend Tests
```powershell
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\frontend"

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 🔧 Development Utilities

### Database Management
```powershell
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\backend"
.\.venv\Scripts\Activate.ps1

# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback to previous migration
alembic downgrade -1

# Show migration history
alembic history

# Show current revision
alembic current
```

### Docker Management
```powershell
# View running containers
docker compose ps

# View logs for all services
docker compose logs

# View logs for specific service
docker compose logs backend
docker compose logs -f celery-worker

# Restart specific service
docker compose restart backend

# Rebuild and restart service
docker compose up --build backend

# Stop all services
docker compose stop

# Remove all containers and volumes
docker compose down -v

# Remove everything including images
docker compose down -v --rmi all
```

### Code Quality & Formatting
```powershell
# Backend code formatting
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\backend"
.\.venv\Scripts\Activate.ps1

# Format code with black
black app/

# Sort imports
isort app/

# Type checking with mypy
mypy app/

# Linting with flake8
flake8 app/
```

```powershell
# Frontend code formatting
cd "c:\Users\Neevetha N\Downloads\pulseboard\pulseboard\frontend"

# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type checking
npm run type-check
```

---

## 🌐 Access Points

When running the full stack:

- **Frontend**: http://localhost:8080 (Docker) or http://localhost:5173 (dev)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **API Redoc**: http://localhost:8000/redoc
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8000, 8080, 5432, 6379, 5173 are not in use
2. **Docker issues**: Restart Docker Desktop if containers fail to start
3. **Permission errors**: Run PowerShell as Administrator if needed
4. **Python virtual environment**: Ensure you're using the correct Python version
5. **Node.js issues**: Try deleting node_modules and running `npm install` again

### Reset Everything
```powershell
# Stop all containers and remove volumes
docker compose down -v

# Remove backend virtual environment
Remove-Item -Recurse -Force backend\.venv

# Remove frontend node_modules
Remove-Item -Recurse -Force frontend\node_modules

# Remove frontend package-lock.json
Remove-Item frontend\package-lock.json

# Start fresh
docker compose up --build
```
