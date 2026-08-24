---
applyTo: "**/*.ts, **/*.tsx, **/*.css, **/prisma/**"
description: "SudoMeet skill registry: before writing TypeScript, Next.js, UI/Tailwind, or Prisma code, read the matching installed skill and follow it as instructions."
---

# SudoMeet Installed-Skill Registry (platform-agnostic)

Skills are plain Markdown instruction packages installed at `~/.agents/skills/<name>/SKILL.md`. They work identically in GitHub Copilot and Claude Code: **READ the file first, then FOLLOW it** as instructions for the task at hand.

## Before you write code, read the matching skill(s)

| Task domain | Read first (absolute path) |
|-------------|---------------------------|
| Any `.ts` / `.tsx` change | `~/.agents/skills/typescript-best-practices/SKILL.md` |
| App Router pages, layouts, Server Components, data fetching | `~/.agents/skills/nextjs-app-router-patterns/SKILL.md` |
| New UI, visual direction, typography, palette | `~/.agents/skills/frontend-design/SKILL.md` |
| Tailwind components, tokens, theming | `~/.agents/skills/tailwind-design-system/SKILL.md` |
| Prisma schema, migrations, provider config | `~/.agents/skills/prisma-database-setup/SKILL.md` |
| Reviewing finished UI (accessibility/UX audit) | `~/.agents/skills/web-design-guidelines/SKILL.md` |

## Translating Claude-specific wording

Some skills were authored for Claude Code. Interpret generically — never discard a skill because of platform-specific phrasing:

| Skill says | You do (GitHub Copilot) |
|------------|------------------------|
| "Check CLAUDE.md" | Follow this repo's conventions and `.github/copilot-instructions.md` / `AGENTS.md` if present |
| Tools: `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep` | Your environment's equivalents: read/edit files, run terminal commands, search files/text |
| "Invoke / use the X skill" | Open `~/.agents/skills/X/SKILL.md` and follow its content |
| "Run `claude ...`" | Ignore the CLI specifics; perform the underlying intent with available tools |

Everything else in each skill applies verbatim.

## Rules

1. Read the skill BEFORE writing code in its domain; re-read if the task shifts domain mid-task.
2. Follow checklist/guideline items explicitly — do not substitute "I already know this".
3. On conflict: `implementation-plan.md` wins over everything, then the more specific skill.
4. When delegating, pass the exact absolute SKILL.md paths to subagents — never assume they know the registry.
