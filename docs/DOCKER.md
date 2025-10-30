# Docker Setup - OneOhm EPC

Complete guide for running OneOhm EPC with Docker and Docker Compose.

## 📋 Overview

The project uses Docker Compose to orchestrate:

- **Backend**: NestJS API
- **Web**: Next.js application
- **PostgreSQL**: Database
- **Redis**: Optional caching (commented out)

## 🚀 Quick Start

### Prerequisites

- Docker Desktop or Docker Engine (20.10+)
- Docker Compose (v2.0+)

### Start All Services

```bash
# Production mode
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## 📦 Available Configurations

### 1. Production (`docker-compose.yml`)

Full production setup with optimized builds:

```bash
# Build and start all services
docker compose up -d

# Build specific service
docker compose build backend
docker compose build web

# Start specific service
docker compose up -d postgres
docker compose up -d backend
docker compose up -d web
```

**Services:**

- **backend**: http://localhost:8085
- **web**: http://localhost:3001
- **postgres**: localhost:5436

### 2. Development (`docker-compose.dev.yml`)

Development setup with hot reload:

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# View logs with hot reload
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f web
```

## 🔧 Service Details

### Backend (NestJS)

**Image**: Custom (built from `apps/backend/Dockerfile`)  
**Port**: 8085  
**Depends on**: PostgreSQL

```bash
# Build backend only
docker compose build backend

# Start backend
docker compose up -d backend

# View backend logs
docker compose logs -f backend

# Execute commands in backend
docker compose exec backend npm run test
```

### Web (Next.js)

**Image**: Custom (built from `apps/web/Dockerfile`)  
**Port**: 3001  
**Depends on**: Backend

```bash
# Build web only
docker compose build web

# Start web
docker compose up -d web

# View web logs
docker compose logs -f web
```

### PostgreSQL

**Image**: postgres:15-alpine  
**Port**: 5436 (mapped from container's 5432)  
**Database**: oneohm_epc  
**User**: oneohm  
**Password**: postgres

```bash
# Access PostgreSQL
docker compose exec postgres psql -U oneohm -d oneohm_epc

# Backup database
docker compose exec postgres pg_dump -U oneohm oneohm_epc > backup.sql

# Restore database
docker compose exec -T postgres psql -U oneohm oneohm_epc < backup.sql
```

## 📝 Common Commands

### Building

```bash
# Build all services
docker compose build

# Build with no cache
docker compose build --no-cache

# Build specific service
docker compose build backend
```

### Starting/Stopping

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d postgres backend

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Stop specific service
docker compose stop backend
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Executing Commands

```bash
# Backend
docker compose exec backend npm run test
docker compose exec backend npx nx build backend

# Web
docker compose exec web npm run build

# PostgreSQL
docker compose exec postgres psql -U oneohm
```

### Health Checks

```bash
# Check service status
docker compose ps

# Check specific service health
docker compose ps backend

# View health check logs
docker inspect oneohm-epc-backend --format='{{json .State.Health}}'
```

## 🔐 Environment Variables

Create `.env` file in the root:

```bash
# Backend
NODE_ENV=production
PORT=8085
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=oneohm
DATABASE_PASSWORD=postgres
DATABASE_NAME=oneohm_epc

# Web
NEXT_PUBLIC_API_URL=http://backend:8085
```

Load env file:

```bash
docker compose --env-file .env up -d
```

## 🐛 Troubleshooting

### Issue 1: Port Already in Use

```bash
# Find process using port 8085
lsof -i :8085

# Kill the process
kill -9 <PID>

# Or use different ports in docker-compose.yml
ports:
  - "3100:8085"  # Map to different host port
```

### Issue 2: Container Won't Start

```bash
# Check logs
docker compose logs backend

# Check if dependencies are healthy
docker compose ps

# Restart service
docker compose restart backend

# Rebuild image
docker compose build --no-cache backend
docker compose up -d backend
```

### Issue 3: Database Connection Failed

```bash
# Check if PostgreSQL is healthy
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Verify database exists
docker compose exec postgres psql -U oneohm -l

# Create database if missing
docker compose exec postgres createdb -U oneohm oneohm_epc
```

### Issue 4: Web App Can't Reach Backend

```bash
# Check if backend is healthy
docker compose ps backend

# Check network
docker network inspect oneohm-network

# Test connection from web container
docker compose exec web wget -O- http://backend:8085
```

### Issue 5: Build Fails

```bash
# Clear Docker cache
docker builder prune -a

# Remove all images and rebuild
docker compose down --rmi all
docker compose build --no-cache
docker compose up -d
```

## 🔄 Development Workflow

### Local Development with Docker

```bash
# Start database only
docker compose up -d postgres

# Run backend locally (connects to Docker PostgreSQL)
cd apps/backend
npm run start:dev

# Run web locally
cd apps/web
npm run dev
```

### Hot Reload Development

```bash
# Use dev compose file
docker compose -f docker-compose.dev.yml up -d

# Code changes are automatically reflected
# Volumes mount your local code into containers
```

## 📊 Monitoring

### Resource Usage

```bash
# View resource usage
docker stats

# View specific service usage
docker stats oneohm-epc-backend
```

### Container Info

```bash
# Inspect service
docker compose ps backend

# View detailed info
docker inspect oneohm-epc-backend

# Check health
docker inspect oneohm-epc-backend --format='{{.State.Health.Status}}'
```

## 🧹 Cleanup

### Remove Containers

```bash
# Stop and remove containers
docker compose down

# Also remove volumes
docker compose down -v

# Also remove images
docker compose down --rmi all
```

### Clean Docker System

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Clean everything
docker system prune -a --volumes
```

## 🚢 Production Deployment

### Best Practices

1. **Use environment-specific configs**:

```bash
docker compose -f docker-compose.yml up -d
```

2. **Always use health checks**:
   Already configured in docker-compose.yml

3. **Use secrets for sensitive data**:

```yaml
services:
  backend:
    secrets:
      - db_password
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

4. **Set resource limits**:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

5. **Enable logging**:

```yaml
services:
  backend:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

## 📖 Docker Files Structure

```
oneohm-epc/
├── docker-compose.yml          # Production config
├── docker-compose.dev.yml      # Development config
├── apps/
│   ├── backend/
│   │   ├── Dockerfile          # Backend image
│   │   └── .dockerignore
│   └── web/
│       ├── Dockerfile          # Web image
│       └── .dockerignore
└── docs/
    └── DOCKER.md               # This file
```

## 🔗 Related Documentation

- [Main README](../README.md)
- [Backend README](../apps/backend/README.md)
- [Web README](../apps/web/README.md)
- [NX Usage Guide](./NX-USAGE-GUIDE.md)

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)

---

**Need help?** Check the [Troubleshooting](#troubleshooting) section above.
