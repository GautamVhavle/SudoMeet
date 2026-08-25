# Self-Hosting Guide

This guide covers self-hosting SudoMeet on your own infrastructure instead of using Vercel/Neon/Upstash managed services.

## Why Self-Host?

- Full control over data and infrastructure
- No vendor lock-in
- Custom compliance requirements (HIPAA, GDPR, etc.)
- Cost optimization for high-traffic deployments
- Air-gapped/on-premises deployments

## Prerequisites

- Linux server (Ubuntu 22.04 LTS recommended) or Kubernetes cluster
- Docker and Docker Compose
- Domain name with DNS access
- SSL certificate (Let's Encrypt via Certbot recommended)
- Minimum specs:
  - 2 vCPU, 4 GB RAM for small deployments (<10 concurrent calls)
  - 4+ vCPU, 8+ GB RAM for production

## Architecture Overview

Self-hosted stack:

```
┌─────────────────────────────────────────────────────────┐
│                   Self-Hosted Stack                     │
├─────────────────────────────────────────────────────────┤
│ Nginx (Reverse Proxy)                                   │
│   ├── SSL termination (Let's Encrypt)                   │
│   └── Proxy to Next.js app                              │
├─────────────────────────────────────────────────────────┤
│ Next.js App (Docker container)                          │
│   ├── Node 22                                            │
│   └── Port 3000                                          │
├─────────────────────────────────────────────────────────┤
│ PostgreSQL (Docker or managed)                          │
│   ├── Version 15+                                        │
│   └── Persistent volume                                  │
├─────────────────────────────────────────────────────────┤
│ Redis (Docker or managed)                                │
│   ├── Version 7+                                         │
│   └── Persistence enabled                                │
├─────────────────────────────────────────────────────────┤
│ LiveKit Server (optional, for Tier B)                   │
│   ├── Self-hosted SFU                                    │
│   └── Ports 7880 (HTTP), 443 (HTTPS), 50000-60000 (UDP) │
├─────────────────────────────────────────────────────────┤
│ MinIO / S3-compatible storage (for recordings)          │
│   └── Port 9000                                          │
└─────────────────────────────────────────────────────────┘
```

## Docker Compose Deployment

### 1. Prepare the Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Create project directory
mkdir -p /opt/sudomeet
cd /opt/sudomeet
```

### 2. Clone the Repository

```bash
git clone https://github.com/GautamVhavle/SudoMeet.git .
```

### 3. Create `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://sudomeet.yourdomain.com
      - DATABASE_URL=postgresql://sudomeet:password@postgres:5432/sudomeet
      - DIRECT_DATABASE_URL=postgresql://sudomeet:password@postgres:5432/sudomeet
      - UPSTASH_REDIS_REST_URL=http://redis:6379
      - AUTH_SECRET=${AUTH_SECRET}
      - AUTH_GITHUB_ID=${AUTH_GITHUB_ID}
      - AUTH_GITHUB_SECRET=${AUTH_GITHUB_SECRET}
      - LIVEKIT_URL=${LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - R2_BUCKET=recordings
      - R2_ACCESS_KEY_ID=${MINIO_ROOT_USER}
      - R2_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
      - R2_ENDPOINT=http://minio:9000
    depends_on:
      - postgres
      - redis
      - minio
    restart: unless-stopped
    volumes:
      - ./data/uploads:/app/uploads

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=sudomeet
      - POSTGRES_PASSWORD=password  # Change this!
      - POSTGRES_DB=sudomeet
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sudomeet"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minioadmin  # Change this!
      - MINIO_ROOT_PASSWORD=minioadmin  # Change this!
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 4. Create `Dockerfile`

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

**Note**: For standalone output, add to `next.config.ts`:

```ts
const nextConfig = {
  output: 'standalone',
  // ... rest of config
};
```

### 5. Create `nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name sudomeet.yourdomain.com;

        # Redirect to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name sudomeet.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/sudomeet.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/sudomeet.yourdomain.com/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # SSE endpoint (important!)
        location /api/signal/sse {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400s;
        }
    }
}
```

### 6. Create `.env` File

```bash
cp .env.example .env

# Generate secrets
export AUTH_SECRET=$(openssl rand -base64 32)

# Edit .env and fill in all values
nano .env
```

### 7. Obtain SSL Certificate

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate (stop nginx first if running)
sudo certbot certonly --standalone -d sudomeet.yourdomain.com

# Certificates will be in /etc/letsencrypt/live/sudomeet.yourdomain.com/
```

### 8. Start Services

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f app

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Create MinIO bucket
docker-compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker-compose exec minio mc mb local/recordings
```

### 9. Verify Deployment

```bash
curl https://sudomeet.yourdomain.com/api/status
```

## LiveKit Self-Hosting

### Option A: Docker Deployment

```yaml
# Add to docker-compose.yml
livekit:
  image: livekit/livekit-server:latest
  command: --config /etc/livekit.yaml
  ports:
    - "7880:7880"
    - "443:443"
    - "50000-60000:50000-60000/udp"
  volumes:
    - ./livekit.yaml:/etc/livekit.yaml
  restart: unless-stopped
```

Create `livekit.yaml`:

```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  <API_KEY>: <API_SECRET>  # Generate with: livekit-cli create-token
redis:
  address: redis:6379
```

### Option B: Kubernetes Deployment

See [LiveKit Kubernetes guide](https://docs.livekit.io/deploy/kubernetes/).

## STUN/TURN Servers

For P2P calls behind NAT/firewalls, configure TURN servers.

### Self-Hosted coturn

```bash
# Install coturn
sudo apt install coturn

# Edit /etc/turnserver.conf
sudo nano /etc/turnserver.conf
```

Add:

```conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
realm=sudomeet.yourdomain.com
server-name=sudomeet.yourdomain.com
fingerprint
lt-cred-mech
user=sudomeet:YourTurnPassword
log-file=/var/log/turnserver.log
```

Start coturn:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

Update `lib/media/p2p-provider.ts` to use your TURN server:

```ts
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:sudomeet.yourdomain.com:3478',
    username: 'sudomeet',
    credential: 'YourTurnPassword',
  },
];
```

## Monitoring

### Prometheus + Grafana

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  ports:
    - "9090:9090"
  restart: unless-stopped

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin  # Change this!
  volumes:
    - grafana_data:/var/lib/grafana
  restart: unless-stopped
```

### Log Aggregation

```yaml
# Add to docker-compose.yml
loki:
  image: grafana/loki
  ports:
    - "3100:3100"
  volumes:
    - loki_data:/loki
  restart: unless-stopped
```

## Backup & Restore

### Database Backup

```bash
# Automated daily backups
cat > /opt/sudomeet/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/opt/sudomeet/backups
DATE=$(date +%Y%m%d_%H%M%S)

docker-compose exec -T postgres pg_dump -U sudomeet sudomeet | gzip > $BACKUP_DIR/sudomeet_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "sudomeet_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/sudomeet/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/sudomeet/backup.sh
```

### Restore

```bash
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U sudomeet sudomeet
```

## Scaling

### Horizontal Scaling

1. **Load balancer**: Place multiple app instances behind Nginx or HAProxy
2. **Sticky sessions**: Required for SSE endpoints (signaling)
3. **Shared Redis**: Use Redis Cluster for presence/signaling across instances
4. **Shared database**: Use PostgreSQL replication for read scaling

### Vertical Scaling

- Increase Docker resource limits in `docker-compose.yml`:
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 8G
  ```

## Troubleshooting

### App won't start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - DATABASE_URL not set or wrong format
# - Redis connection failed
# - Migrations not run (run: docker-compose exec app npx prisma migrate deploy)
```

### P2P calls fail

- Check firewall allows UDP 50000-60000
- Verify STUN/TURN servers are accessible
- Check browser console for WebRTC errors

### LiveKit connection fails

- Ensure ports 7880, 443, 50000-60000 (UDP) are open
- Check `LIVEKIT_URL` is correct (wss://...)
- Verify API key/secret match `livekit.yaml`

## Security Hardening

- [ ] Change default passwords in `docker-compose.yml`
- [ ] Use secrets management (Docker secrets, Vault)
- [ ] Enable firewall (ufw):
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 50000:60000/udp
  sudo ufw enable
  ```
- [ ] Rotate secrets regularly
- [ ] Enable database SSL
- [ ] Use Redis password authentication
- [ ] Regular security updates: `docker-compose pull && docker-compose up -d`

## Cost Comparison

| Resource | Managed (Vercel/Neon/etc.) | Self-Hosted (VPS) |
|----------|---------------------------|-------------------|
| **Compute** | Free (Hobby) → $20/month (Pro) | $5-20/month (DigitalOcean, Linode) |
| **Database** | Free → $19/month (Neon Scale) | Included in VPS |
| **Redis** | Free → $10/month (Upstash) | Included in VPS |
| **Storage** | $0.015/GB (R2) | Included in VPS or $5/month (S3) |
| **Bandwidth** | 100 GB free (Vercel) | 1-5 TB/month (VPS) |
| **Total** | $0-50/month | $5-50/month (depending on traffic) |

Self-hosting becomes cost-effective at **~100+ concurrent users** or **high storage needs** (many recordings).

## Support

For self-hosting issues:

- Check [docs/deployment.md](./deployment.md) for general deployment concepts
- Open an issue: [GitHub Issues](https://github.com/GautamVhavle/SudoMeet/issues)
- Community help: [GitHub Discussions](https://github.com/GautamVhavle/SudoMeet/discussions)

---

**Next steps**: See [docs/api.md](./api.md) for using the public API with your self-hosted instance.
