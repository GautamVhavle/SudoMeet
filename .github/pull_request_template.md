# Pull Request

## Description

<!-- Provide a clear and concise description of what this PR does -->

Fixes # (issue)

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement

## Changes Made

<!-- List the key changes made in this PR -->

- 
- 
- 

## Screenshots / Demo

<!-- If applicable, add screenshots or a video demo of the changes -->

**Before:**

**After:**

## Testing

<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual testing completed
- [ ] Tested in both Tier A (P2P) and Tier B (LiveKit) (if applicable)
- [ ] Tested in multiple browsers (Chrome, Firefox, Safari)
- [ ] Tested with different screen sizes / responsive design

### Test Environment

- Node version: 
- Browser(s): 
- OS: 

## Checklist

<!-- Mark completed items with an "x" -->

- [ ] My code follows the TypeScript/React/Tailwind best practices
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
- [ ] I have checked my code and corrected any misspellings
- [ ] I have run `npm run format` to format the code
- [ ] I have run `npm run typecheck` and `npm run lint` with no errors
- [ ] No sensitive data (API keys, secrets, env vars) is committed

## Architecture Impact

<!-- Does this PR affect any of the core abstractions? -->

- [ ] Changes media-provider interface (`lib/media/types.ts`)
- [ ] Affects Tier A (P2P) implementation
- [ ] Affects Tier B (LiveKit) implementation
- [ ] Changes database schema (Prisma migrations included)
- [ ] Adds new environment variables (`.env.example` updated)
- [ ] Changes authentication flow
- [ ] Modifies public API (`/api/v1/*`)
- [ ] Affects webhook delivery
- [ ] Changes CLI behavior

## Breaking Changes

<!-- If this is a breaking change, describe the impact and migration path -->

N/A

<!-- OR -->

**Impact:**

**Migration guide:**

## Performance Considerations

<!-- Does this PR have any performance implications? -->

- [ ] This PR improves performance
- [ ] This PR may impact performance (explain below)
- [ ] No performance impact

## Documentation

<!-- What documentation needs to be updated? -->

- [ ] README.md
- [ ] ARCHITECTURE.md
- [ ] docs/ guides
- [ ] API documentation
- [ ] Inline code comments
- [ ] ADR (Architecture Decision Record) added/updated
- [ ] No documentation needed

## Deployment Notes

<!-- Any special considerations for deployment? -->

- [ ] Database migrations required (`npm run db:deploy`)
- [ ] New environment variables needed (listed in `.env.example`)
- [ ] Vercel configuration changes
- [ ] No special deployment steps

## Additional Notes

<!-- Any other information that reviewers should know -->
