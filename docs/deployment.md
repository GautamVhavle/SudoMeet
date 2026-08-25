# Deployment Guide

This guide covers deploying SudoMeet to production.

## Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Production Stack                      │
├─────────────────────────────────────────────────────────┤
│ Vercel (App + API)                                      │
│   ├── Next.js 15 App Router                             │
│   ├── API Routes (auth, meetings, signaling relay)      │
│   └── Environment: Node 22, Auto-scaling               │
├─────────────────────────────────────────────────────────┤
│ Neon (Database)                                         │
│   ├── Serverless Postgres with connection pooling      │
│   ├── Auto-scaling storage                              │
│   └── Automated backups                                 │
├─────────────────────────────────────────────────────────┤
│ Upstash (Redis)                                         │
│   ├── Pub/sub for Tier A signaling                     │
│   ├── Presence tracking                                 │
│   └── SSE connection management                         │
├─────────────────────────────────────────────────────────┤
│ LiveKit (Tier B Media)                                  │
│   ├── SFU media server (WebRTC relay)                  │
│   ├── Server-side recording                             │
│   └── Cloud or self-hosted                              │
├─────────────────────────────────────────────────────────┤
│ Cloudflare R2 (Recordings)                              │
│   └── S3-compatible object storage                      │
└─────────────────────────────────────────────────────────┘
```

## Deployment Environments

| Environment | Purpose | Branch | URL |
|-------------|---------|--------|-----|
| **Local** | Development | - | http://localhost:3000 |
| **Preview** | PR review | feature/* | auto-generated Vercel URL |
| **Staging** | Pre-production testing | staging | staging.sudomeet.app (optional) |
| **Production** | Live | main | https://sudomeet.vercel.app |

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub account (for OAuth and CI/CD)
- [ ] Vercel account (free tier works)
- [ ] Neon account (free tier)
- [ ] Upstash account (free tier)
- [ ] LiveKit Cloud account (community plan) or self-hosted LiveKit
- [ ] Cloudflare account (for R2 storage)

## Step 1: Database Setup (Neon)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project: **SudoMeet Production**
3. Copy the connection strings:
   - **Pooled connection** (ends with `-pooler.*.neon.tech`) → `DATABASE_URL`
   - **Direct connection** → `DIRECT_DATABASE_URL`
4. Note both values — you'll add them to Vercel environment variables

## Step 2: Redis Setup (Upstash)

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database: **sudomeet-prod**
3. Region: Choose closest to your Vercel deployment region
4. Copy **REST URL** and **REST Token** from the database details
5. Save for Vercel env vars:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Step 3: LiveKit Setup

### Option A: LiveKit Cloud (Recommended)

1. Go to [cloud.livekit.io](https://cloud.livekit.io)
2. Create a project: **SudoMeet**
3. Copy credentials:
   - `LIVEKIT_URL` (e.g., `wss://sudomeet-xxxxx.livekit.cloud`)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

### Option B: Self-Hosted LiveKit

See [docs/self-hosting.md](./self-hosting.md#livekit) for self-hosting instructions.

## Step 4: Cloudflare R2 Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Create a bucket: **sudomeet-recordings**
3. Create API token with R2 read/write permissions
4. Copy credentials:
   - `R2_BUCKET=sudomeet-recordings`
   - `R2_ACCESS_KEY_ID=<access key>`
   - `R2_SECRET_ACCESS_KEY=<secret>`
   - `R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`

## Step 5: Deploy to Vercel

### Via Vercel Dashboard (Recommended for First Deploy)

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project** → Import from GitHub
3. Select `GautamVhavle/SudoMeet` repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Node Version**: 22.x

5. Add environment variables (see next section)
6. Click **Deploy**

### Via Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Step 6: Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

### Required (Phase 1-3)

```bash
NEXT_PUBLIC_APP_URL=https://sudomeet.vercel.app

# Auth
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_GITHUB_ID=<from GitHub OAuth app>
AUTH_GITHUB_SECRET=<from GitHub OAuth app>

# Database
DATABASE_URL=<Neon pooled connection string>
DIRECT_DATABASE_URL=<Neon direct connection string>
```

### Required for Tier A (Phase 7)

```bash
UPSTASH_REDIS_REST_URL=<from Upstash>
UPSTASH_REDIS_REST_TOKEN=<from Upstash>
```

### Required for Tier B (Phase 11)

```bash
LIVEKIT_URL=<from LiveKit Cloud or self-hosted>
LIVEKIT_API_KEY=<from LiveKit>
LIVEKIT_API_SECRET=<from LiveKit>
```

### Required for Recordings (Phase 12)

```bash
R2_BUCKET=sudomeet-recordings
R2_ACCESS_KEY_ID=<from Cloudflare>
R2_SECRET_ACCESS_KEY=<from Cloudflare>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

### Optional (Email Magic Links)

```bash
EMAIL_FROM=noreply@sudomeet.dev
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=<SendGrid API key>
```

**Important**: Set environment variables for all environments:
- Production
- Preview (for PR deployments)

## Step 7: Run Database Migrations

After first deployment:

```bash
# Clone the repo locally
git clone https://github.com/GautamVhavle/SudoMeet.git
cd SudoMeet

# Install dependencies
npm install

# Copy production DATABASE_URL and DIRECT_DATABASE_URL to .env
echo "DATABASE_URL=<production pooled URL>" >> .env
echo "DIRECT_DATABASE_URL=<production direct URL>" >> .env

# Run migrations
npm run db:deploy

# Verify
npx prisma studio
```

**Alternative**: Run migrations in a Vercel deployment:

1. Add a `postbuild` script to package.json (temporarily):
   ```json
   "postbuild": "prisma migrate deploy"
   ```
2. Redeploy
3. Remove the script (migrations should be run manually for production)

## Step 8: Configure GitHub OAuth

1. Go to [GitHub Settings](https://github.com/settings/developers) → OAuth Apps
2. Create a new OAuth app:
   - **Application name**: SudoMeet Production
   - **Homepage URL**: `https://sudomeet.vercel.app`
   - **Authorization callback URL**: `https://sudomeet.vercel.app/api/auth/callback/github`
3. Copy **Client ID** and **Client Secret**
4. Add to Vercel environment variables:
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
5. Redeploy

## Step 9: Verify Deployment

Check these endpoints:

```bash
# Health check
curl https://sudomeet.vercel.app/api/status
# Expected: {"status":"healthy","timestamp":"...","checks":{...}}

# Auth providers
curl https://sudomeet.vercel.app/api/auth/providers
# Expected: {"github":{...},"email-link":{...}}

# Landing page
curl https://sudomeet.vercel.app
# Expected: HTTP 200, HTML content with "SudoMeet"
```

## Step 10: Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] `/api/status` returns healthy
- [ ] Login works (GitHub OAuth and magic links)
- [ ] Dashboard accessible at `/dashboard`
- [ ] Can create a meeting
- [ ] Can join a meeting (test Tier A P2P)
- [ ] Chat works in call
- [ ] Screen share works
- [ ] (If LiveKit configured) Tier B meetings work
- [ ] (If R2 configured) Recordings are saved and downloadable
- [ ] API keys can be created at `/settings/api-keys`
- [ ] Public API works (`/api/v1/meetings`)
- [ ] Webhooks can be registered and receive events

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. Runs on push to `main`
2. Validates migrations (`prisma migrate diff`)
3. Runs build
4. Deploys to Vercel
5. Runs health check

Preview deployments happen automatically on PRs via Vercel GitHub integration.

## Monitoring & Observability

### Built-in Monitoring

- **Vercel Analytics**: Enable in Vercel Dashboard → Analytics
- **Vercel Logs**: Real-time function logs in Vercel Dashboard
- **Status endpoint**: `GET /api/status` for uptime checks

### External Monitoring (Optional)

- **Uptime monitoring**: [UptimeRobot](https://uptimerobot.com), [Pingdom](https://www.pingdom.com)
- **Error tracking**: [Sentry](https://sentry.io), [Rollbar](https://rollbar.com)
- **APM**: [Datadog](https://www.datadoghq.com), [New Relic](https://newrelic.com)

Add Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## Scaling Considerations

### Free Tier Limits

| Service | Free Tier Limit | When to Upgrade |
|---------|----------------|-----------------|
| **Vercel** | 100 GB-hours/month, 1000 serverless function invocations/day | High traffic (>1000 daily active users) |
| **Neon** | 0.5 GB storage, 10 GB transfer/month | >10K meetings or >100 concurrent connections |
| **Upstash** | 10K commands/day | >100 concurrent calls (P2P signaling) |
| **LiveKit** | Community plan (50 participants free) | >50 concurrent users in Tier B |
| **Cloudflare R2** | 10 GB storage, 1M Class A operations/month | >1000 recordings or large file sizes |

### Upgrade Path

1. **Vercel Pro** ($20/month): Unlimited bandwidth, faster builds, team features
2. **Neon Scale** ($19/month): 10 GB storage, 1000 GB transfer
3. **Upstash** ($10/month): 100K commands/day
4. **LiveKit Pro**: Pay-per-use or dedicated instances
5. **R2**: Pay-as-you-go ($0.015/GB storage, $0.36/million Class A operations)

## Custom Domains

To use a custom domain (e.g., `app.yourdomain.com`):

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain: `app.yourdomain.com`
3. Add DNS records (Vercel provides instructions):
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
4. Update environment variables:
   ```bash
   NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
   ```
5. Update GitHub OAuth callback URL to `https://app.yourdomain.com/api/auth/callback/github`
6. Redeploy

## Rollback

If a deployment fails or introduces a bug:

1. Vercel Dashboard → Deployments → find the last working deployment
2. Click **⋯** → **Promote to Production**
3. Alternatively, revert the commit and push:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```

## Troubleshooting

### Build Fails

**Error: `DATABASE_URL` not found**

- Ensure environment variables are set in Vercel Dashboard
- Check that `.env.example` matches your `.env.local` variable names

**Error: Prisma schema mismatch**

- Run migrations: `npm run db:deploy`
- Verify `DIRECT_DATABASE_URL` is set (required for migrations)

### Runtime Errors

**"Cannot connect to database"**

- Check DATABASE_URL is the **pooled** connection string (ends with `-pooler`)
- Verify Neon database is active (free tier pauses after inactivity)

**"Redis connection failed"**

- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Verify Upstash database is in the same region as Vercel deployment

**"LiveKit token generation failed"**

- Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Check LiveKit cloud project is active

### Performance Issues

**Slow API responses**

- Enable Vercel Analytics to identify slow functions
- Consider upgrading Neon to enable caching
- Use Vercel Edge Functions for geographically distributed endpoints

**P2P calls fail to connect**

- Check browser console for WebRTC errors
- STUN/TURN servers may be needed for restrictive firewalls (see [self-hosting.md](./self-hosting.md#stunturn))

## Security Hardening

Before going fully public:

- [ ] Rotate `AUTH_SECRET`, `LIVEKIT_API_SECRET`, `R2_SECRET_ACCESS_KEY`
- [ ] Enable Vercel security headers (Vercel Dashboard → Settings → Headers)
- [ ] Configure CSP (Content Security Policy) in `next.config.ts`
- [ ] Enable Vercel Firewall (Pro plan)
- [ ] Set up error tracking (Sentry)
- [ ] Implement Redis-backed rate limiting (replace in-memory limiter)
- [ ] Review [SECURITY.md](../SECURITY.md) checklist

## Support

- **Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/GautamVhavle/SudoMeet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GautamVhavle/SudoMeet/discussions)

---

**Next steps**: See [self-hosting.md](./self-hosting.md) if you want to self-host on your own infrastructure instead of using Vercel.
