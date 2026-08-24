# ADR-002: Dark-mode-first design

- **Status:** Accepted
- **Date:** 2026-08-25
- **Phase:** 1 (Architecture, product contract and project foundation)

## Context

SudoMeet is a collaboration platform for developer teams — an audience that
lives in dark-mode tooling (editors, terminals). Video-call surfaces also read
better dark: tiles pop against a low-luminance canvas and long sessions are
easier on the eyes.

## Decision

- Dark is the **default** theme: the root `<html>` renders with the `dark`
  class in `app/layout.tsx`.
- All colors flow through shadcn/ui CSS variables (`--background`,
  `--foreground`, `--card`, `--border`, …) defined for both `:root` and `.dark`
  in `app/globals.css`. Components never hardcode hex values.
- A light theme remains available through the same variables; any future theme
  switcher toggles the `dark` class on `<html>` (the layout carries
  `suppressHydrationWarning` to allow pre-hydration mutation).
- Typography pairs a clean sans (`Inter`) for UI with a mono face
  (`Geist Mono`) for code-flavored accents — developer-native identity.

## Consequences

- Every new component must look correct on the dark palette first; light mode
  is verified second, never instead.
- No component may assume a specific background color; use semantic tokens.
- Future theming work is additive (swap variable values), not structural.
