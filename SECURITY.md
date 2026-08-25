# Security Policy

## Supported Versions

SudoMeet is currently in active development (v0.x). Security updates will be
applied to the latest version only.

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

## Reporting a Vulnerability

**DO NOT** open a public issue for security vulnerabilities.

Instead, please report security issues responsibly:

1. **Email**: Send a detailed report to **security@sudomeet.dev** (if you don't
   receive a response within 48 hours, ping via GitHub issues with "SECURITY
   DISCLOSURE" in the title — do not include vulnerability details publicly).

2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information for follow-up

3. **Response timeline**:
   - Initial response: within 48 hours
   - Status update: within 7 days
   - Fix timeline: depends on severity (critical issues within 7 days, high
     within 14 days, medium/low as time permits)

## Security Best Practices

### For Self-Hosting

If you're self-hosting SudoMeet, ensure:

1. **Environment variables**: Never commit `.env.local` or expose secrets in
   logs/error messages
2. **Database**: Use connection pooling (Neon pooled URL for `DATABASE_URL`)
   and rotate credentials regularly
3. **API keys**: Rotate `AUTH_SECRET`, `LIVEKIT_API_SECRET`, and R2 credentials
   periodically
4. **HTTPS**: Always run production behind HTTPS (Vercel handles this
   automatically)
5. **CORS**: Review `next.config.ts` CORS settings if exposing the API publicly
6. **Rate limiting**: The built-in rate limiter is in-memory only — for
   production at scale, consider Redis-backed rate limiting
7. **Webhooks**: Verify HMAC signatures on incoming webhooks (see
   `lib/webhooks/verify.ts`)
8. **CSP**: Content Security Policy headers are minimal by default — tighten
   them for your deployment

### Media Security

- **Tier A (P2P)**: Signaling is relayed via Upstash Redis pub/sub, but media
  streams flow peer-to-peer. Use STUN/TURN servers if behind restrictive
  firewalls.
- **Tier B (LiveKit)**: Media never touches Vercel — ensure LiveKit instances
  are properly secured (egress-only access, API key rotation).
- **Recordings**: Stored in Cloudflare R2. Bucket should be private; access
  granted via pre-signed URLs only.

### Known Limitations

See [docs/security-checklist.md](docs/security-checklist.md) for the full Phase
14 security audit results.

**Not production-hardened (yet)**:

- Rate limiting is in-memory (resets on deploy)
- No DDoS protection beyond Vercel's defaults
- No CSP reporting
- No security headers beyond Next.js defaults
- Input sanitization relies on DOMPurify client-side (server-side validation
  exists but is minimal for some endpoints)

## Disclosure Policy

When a vulnerability is reported and fixed:

1. We will release a patch version
2. Credit the reporter in the release notes (if they consent)
3. Publish a security advisory on GitHub
4. Document the issue in CHANGELOG.md (without exploit details)

## Scope

This policy covers:

- The SudoMeet web application (this repository)
- API endpoints (`/api/*`)
- Webhooks
- CLI (`packages/cli`)
- Embed widget

Out of scope:

- Third-party services (Neon, Upstash, LiveKit, Cloudflare R2) — report to
  those providers directly
- Issues in dependencies — we will upgrade if a CVE is published, but
  dependency-specific issues should be reported to the library maintainers

## Security Champions

Current maintainers responsible for security:

- Gautam Vhavle ([@GautamVhavle](https://github.com/GautamVhavle))

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [LiveKit Security Best Practices](https://docs.livekit.io/guides/security/)

---

Thank you for helping keep SudoMeet secure!
