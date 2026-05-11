# SSL Certificate Setup

## Option 1: Let's Encrypt (Recommended - Free)

### Using Certbot

1. Install certbot:
```bash
# Ubuntu/Debian
sudo apt-get install certbot python3-certbot-nginx

# Or use docker
docker pull certbot/certbot
```

2. Generate certificate:
```bash
# Stop nginx first
docker-compose -f docker-compose.production stop nginx

# Run certbot
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

3. Set up auto-renewal:
```bash
sudo certbot renew --dry-run
# Add to crontab:
# 0 12 * * * certbot renew --quiet --deploy-hook "docker-compose restart nginx"
```

### Using Docker Certbot

```bash
# Create directories
mkdir -p nginx/ssl

# Run certbot
docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt -v nginx/ssl:/var/www \
  certbot/certbot certonly --webroot -w /var/www -d yourdomain.com

# Rename files
mv nginx/ssl/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
mv nginx/ssl/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

## Option 2: Self-Signed Certificate (Testing Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

## Important Notes

1. **Update nginx.conf** - The SSL server block is already configured but may need adjustment based on your certificate path.

2. **Redirect HTTP to HTTPS** - Add this to the HTTP server block:
```nginx
return 301 https://$host$request_uri;
```

3. **Production OAuth** - After setting up SSL, update your Google OAuth redirect URIs to use HTTPS.

4. **Firewall** - Make sure ports 80 and 443 are open:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```