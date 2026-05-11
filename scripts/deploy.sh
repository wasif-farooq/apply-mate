#!/bin/bash

set -e

echo "=== ApplyBuddy Production Deployment Script ==="

# Check if .env.production exists
if [ ! -f "backend/.env.production" ]; then
    echo "Error: backend/.env.production not found!"
    echo "Please copy .env.production to .env and update the values"
    exit 1
fi

# Check for required environment variables
echo "Checking environment variables..."

if ! grep -q "JWT_SECRET=generate" backend/.env 2>/dev/null || [ -z "$JWT_SECRET" ]; then
    echo "Warning: JWT_SECRET not set. Generate one with: openssl rand -base64 32"
fi

# Build the containers
echo "Building Docker containers..."
docker-compose -f docker-compose.production build

# Start the services
echo "Starting services..."
docker-compose -f docker-compose.production up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Check service health
echo "Checking service health..."
sleep 5

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services running:"
echo "  - Frontend: http://localhost (or configured domain)"
echo "  - Backend API: http://localhost/api"
echo "  - Database: localhost:5432"
echo ""
echo "Useful commands:"
echo "  docker-compose -f docker-compose.production logs -f     # View logs"
echo "  docker-compose -f docker-compose.production restart     # Restart services"
echo "  docker-compose -f docker-compose.production down         # Stop services"
echo ""
echo "Next steps:"
echo "  1. Configure SSL certificates (see nginx/ssl/README.md)"
echo "  2. Update your domain DNS to point to this server"
echo "  3. Set up OAuth credentials for production"
echo "  4. Deploy Chrome extension to Chrome Web Store"