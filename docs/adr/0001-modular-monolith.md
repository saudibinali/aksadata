# ADR 0001 — Modular monolith

## Status

Proposed for confirmation.

## Decision

Phase 1 ships as one Next.js application. UI routes, the `/api/v1` HTTP API, and domain code are separated by directory. Domain code does not import React.

## Why

A second deployable service would add network, auth, and migration complexity before any mobile client exists. The directory boundary is enough to move the API later without rewriting screens.

## Consequence

Horizontal scaling is one application plus PostgreSQL. The in-process rate limiter is not shared across instances.
