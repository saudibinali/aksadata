# ADR 0002 — Cookie sessions

## Status

Proposed for confirmation.

## Decision

The web application authenticates with an HttpOnly session cookie. The database stores a hash of the token. Passwords live on an `accounts` row with provider `credentials`.

## Why

Sessions can be revoked and audited. A boolean admin flag is not required. A future native app can add a bearer-token table beside sessions without replacing user accounts.

## Consequence

`/api/v1/auth/login` currently establishes a browser session. It does not return a mobile access token.
