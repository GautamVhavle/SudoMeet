# Contributing to SudoMeet

Thank you for your interest in contributing to SudoMeet! This guide will help
you get started.

## Code of Conduct

By participating in this project, you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please:

1. Check the [existing issues](https://github.com/GautamVhavle/SudoMeet/issues)
   to avoid duplicates
2. Use the bug report template when creating a new issue
3. Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs if applicable
   - Environment (OS, browser, Node version)

### Suggesting Features

We welcome feature requests! Please:

1. Check existing feature requests first
2. Use the feature request template
3. Explain the use case and why it's valuable
4. Consider whether it fits SudoMeet's vision (dark-mode-first developer
   platform, open-source alternative to Google Meet, free-tier friendly)

### Pull Requests

#### Before You Start

1. **Discuss first**: For significant changes, open an issue first to discuss
   your approach
2. **Check the roadmap**: See [implementation-plan.md](implementation-plan.md)
   for the project's direction
3. **Review architecture**: Read [ARCHITECTURE.md](ARCHITECTURE.md) and
   [docs/adr/](docs/adr/) to understand key design decisions

#### Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/SudoMeet.git
cd SudoMeet

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Fill in required env vars (see README.md)
# At minimum, set NEXT_PUBLIC_APP_URL=http://localhost:3000

# 5. Run database migrations (if DATABASE_URL is set)
npm run db:migrate

# 6. Start dev server
npm run dev
```

Visit http://localhost:3000

#### Making Changes

1. **Create a branch**: `git checkout -b feature/your-feature-name` or
   `fix/issue-number`
2. **Follow conventions**:
   - **TypeScript**: Strict mode, prefer functional patterns (see
     `~/.agents/skills/typescript-best-practices/SKILL.md` if available)
   - **React**: Server Components by default, add `"use client"` only when
     needed
   - **Styling**: Tailwind CSS v4, use `components/ui` primitives
   - **Code style**: Run `npm run format` before committing
3. **Commit messages**: Clear, descriptive commits
   - `feat: add screen share recording`
   - `fix: resolve P2P reconnection issue`
   - `docs: update deployment guide`
   - `refactor: extract media provider interface`
   - `test: add unit tests for chat hooks`

#### Testing

Before submitting:

```bash
# Type-check
npm run typecheck

# Lint
npm run lint

# Format
npm run format

# Run unit tests
npm run test

# Run E2E tests (requires DATABASE_URL and other env vars)
npm run test:e2e
```

All checks must pass. The CI workflow will run the same checks on your PR.

#### Pull Request Checklist

- [ ] Branch is up to date with `main`
- [ ] Code follows TypeScript/React/Tailwind best practices
- [ ] All tests pass (`typecheck`, `lint`, `test`)
- [ ] New features include tests
- [ ] Documentation updated (if applicable)
- [ ] No sensitive data (env vars, keys) committed
- [ ] PR description explains what/why/how
- [ ] Screenshots included (for UI changes)

#### Pull Request Process

1. Push your branch to your fork
2. Open a PR against `GautamVhavle/SudoMeet:main`
3. Fill out the PR template
4. Wait for CI checks to pass
5. Address review feedback
6. Maintainers will merge when approved

## Project Structure

```
app/          Next.js App Router routes (pages, layouts, API)
components/   Reusable UI components (shadcn/ui in components/ui)
features/     Feature modules (auth, meetings, call, chat, developer-tools)
lib/          Core logic (db, auth, redis, media abstraction, API helpers)
hooks/        Custom React hooks
stores/       Zustand state stores
types/        Shared TypeScript types
prisma/       Database schema and migrations
tests/        Unit / integration / E2E tests
docs/         Documentation (ADRs, guides, phase reports)
packages/cli/ CLI package
```

## Architecture Principles

Read these before contributing:

1. **Media-provider abstraction**: All media logic goes through
   `lib/media/provider.ts`. Never couple UI to `simple-peer` or `livekit-client`
   directly.
2. **Tier A (P2P) vs Tier B (LiveKit)**: The same UI/API supports both.
   `mediaProvider` field on `Meeting` determines which runs.
3. **Dark-mode-first**: Design for dark mode as the primary experience (light
   mode is secondary).
4. **Vercel is control-plane only**: Media never passes through Vercel
   functions/routes — it flows peer-to-peer or through LiveKit.
5. **Free-tier friendly**: Default deployment runs on free tiers (Vercel,
   Neon, Upstash, LiveKit community plan).
6. **Server Components by default**: Prefer RSC for data fetching; use Client
   Components for interactivity only.
7. **Type safety everywhere**: Strict TypeScript, zod validation at boundaries,
   branded types for IDs.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/adr/](docs/adr/) for details.

## Areas Needing Help

Check the [issues labeled "good first issue"](https://github.com/GautamVhavle/SudoMeet/labels/good%20first%20issue)
or "help wanted".

Common areas:

- **UI polish**: Dark-mode refinements, accessibility improvements
- **Testing**: More unit/integration tests, E2E coverage
- **Documentation**: Guides, API examples, troubleshooting
- **Media features**: Virtual backgrounds, noise suppression, layout modes
- **Developer experience**: CLI improvements, better error messages
- **Integrations**: Calendar sync, Slack/Discord bots, OAuth providers

## Questions?

- **General questions**: Open a
  [GitHub Discussion](https://github.com/GautamVhavle/SudoMeet/discussions)
- **Bugs/features**: Create an
  [issue](https://github.com/GautamVhavle/SudoMeet/issues)
- **Security**: See [SECURITY.md](SECURITY.md) for responsible disclosure

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).

---

Thank you for contributing to SudoMeet! 🎉
