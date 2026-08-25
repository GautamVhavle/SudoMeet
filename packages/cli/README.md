# SudoMeet CLI

Command-line interface for SudoMeet.

## Installation

```bash
npx sudomeet [command]
```

## Commands

- `sudomeet start` — Open SudoMeet in your browser
- `sudomeet join <room-code>` — Join a meeting
- `sudomeet create` — Create a new meeting (requires API key)
- `sudomeet list` — List your meetings (requires API key)
- `sudomeet api-key` — Manage API keys

## Examples

```bash
# Quick start
npx sudomeet start

# Join a meeting
npx sudomeet join abc123

# Create a meeting
npx sudomeet create --title "Team sync"

# List meetings
npx sudomeet list
```

## API Keys

Generate API keys at: https://sudomeet-v1.vercel.app/settings/api-keys

## Development

This is a minimal Phase 13 implementation. Full CLI functionality coming soon.
