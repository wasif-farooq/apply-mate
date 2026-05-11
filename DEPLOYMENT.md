# ApplyBuddy Production Deployment Guide

## Prerequisites

- Linode VPS (recommended: 4GB RAM, 2 vCPU, 80GB SSD)
- Domain name pointing to your server
- Docker and Docker Compose installed
- Basic knowledge of Linux terminal

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url> job-applier
cd job-applier

# Copy production environment files
cp backend/.env.production backend/.env
cp apps/frontend/.env.production apps/frontend/.env.local
```

### 2. Update Environment Variables

Edit the following files with your production values:

- `backend/.env` - Database, AI keys, OAuth credentials
- `apps/frontend/.env.local` - API URL, OAuth client ID

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### 3. Run Deployment

```bash
# Make sure Docker is running
sudo systemctl start docker

# Run the deployment script
./scripts/deploy.sh
```

## Manual Docker Commands

### Build and Start
```bash
docker-compose -f docker-compose.production up -d --build
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.production logs -f

# Specific service
docker-compose -f docker-compose.production logs -f backend
```

### Stop Services
```bash
docker-compose -f docker-compose.production down
```

### Restart
```bash
docker-compose -f docker-compose.production restart
```

## Service URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://your-domain.com | 80/443 |
| Backend API | http://your-domain.com/api | via nginx |
| Database | localhost | 5432 |

## Production Checklist

### Before Going Live

- [ ] Update all `.env` files with production values
- [ ] Generate new JWT_SECRET
- [ ] Configure SSL certificates (see nginx/ssl/README.md)
- [ ] Update Google OAuth redirect URIs to production URLs
- [ ] Set up domain DNS
- [ ] Configure firewall (ports 80, 443, 22)
- [ ] Test all API endpoints
- [ ] Verify Chrome extension works with production backend

### Security Hardening

- [ ] Disable password authentication, use SSH keys
- [ ] Set up fail2ban
- [ ] Configure automatic security updates
- [ ] Set up log rotation
- [ ] Enable database backups

## Troubleshooting

### Database Connection Failed
```bash
# Check database logs
docker-compose -f docker-compose.production logs postgres

# Verify connection
docker exec -it applybuddy-db psql -U applymate -c "SELECT 1"
```

### Backend Won't Start
```bash
# Check backend logs
docker-compose -f docker-compose.production logs backend

# Common issues:
# - Database not ready (wait for healthcheck)
# - Missing environment variables
# - Port 8000 already in use
```

### Frontend 502 Error
```bash
# Check if frontend container is running
docker ps | grep frontend

# Check nginx logs
docker-compose -f docker-compose.production logs nginx
```

## Backup & Maintenance

### Database Backup
```bash
docker exec -it applybuddy-db pg_dump -U applymate applymate > backup.sql
```

### Restore Database
```bash
docker exec -i applybuddy-db psql -U applymate applymate < backup.sql
```

### Update Application
```bash
git pull
docker-compose -f docker-compose.production up -d --build
```

## Support

For issues, check:
1. Docker logs: `docker-compose -f docker-compose.production logs`
2. Application logs in `backend/logs/`
3. Nginx access/error logs

---

**Note**: This is a self-hosted deployment. You're responsible for:
- Server security and updates
- Database backups
- SSL certificate renewal
- Monitoring and alerting