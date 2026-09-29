# ADR 0003 — Configuration in the database

## Status

Proposed for confirmation.

## Decision

Setting keys and feature-flag keys are declared in TypeScript. Their values are stored in PostgreSQL and edited from the admin panel. Permission keys stay in code. Role assignments stay in data.

## Why

New behavior needs new code. Changing a limit, a reserved name, a role grant, or an implemented feature does not.

## Consequence

A planned feature cannot be enabled from the panel. Shipping that feature is a development task, which then honors the flag that is already stored.
