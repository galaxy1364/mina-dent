# ADR-001 — Run ESLint from repo root

## Status
Accepted

## Context
Workspace-level ESLint could not locate configuration file.

## Decision
Run ESLint only from repository root in CI.

## Consequences
- CI and local lint aligned
- No ESLint config drift
- Deterministic CI behavior
