# AttentionSol

AttentionSol is a Solana-focused identity and verification platform for managing project identities, wallet authentication, token evidence, and risk analysis. The project combines a TypeScript monorepo, PostgreSQL-backed data model, and an Express API that supports identity registry workflows and public verification endpoints.

## Overview

This repository contains a workspace-based application with:

- A REST API for identity and token verification
- PostgreSQL persistence via Drizzle ORM
- Wallet-based authentication and session management
- Solana RPC proxying and on-chain validation
- Public API endpoints for developers and downstream clients
- Shared schema and client generation tooling

The app is organized as a pnpm monorepo with separate packages for:
- API server
- Database schema and migrations
- OpenAPI spec and generated clients
- Scripts and helper tooling

## Features

- Identity creation and lifecycle management for meme/project profiles
- Artwork and metadata publication flow
- Wallet challenge / signature verification
- Session-based privileged actions
- Token verification and relationship evidence
- Risk report generation from observed signals
- Public API routes for identity and token lookups
- Solana mainnet RPC forwarding

## Tech Stack

- Node.js 24
- TypeScript 5.9
- pnpm workspaces
- Express 5
- PostgreSQL
- Drizzle ORM
- Zod validation
- OpenAPI + Orval
- esbuild

## Repository Structure

```text
.
├── .github/
│   └── workflows/
├── artifacts/
│   └── api-server/
│       ├── src/
│       ├── build.mjs
│       ├── package.json
│       └── tsconfig.json
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   │   ├── openapi.yaml
│   │   ├── orval.config.ts
│   │   └── package.json
│   ├── api-zod/
│   └── db/
│       ├── src/
│       ├── drizzle.config.ts
│       └── package.json
├── scripts/
│   ├── src/
│   ├── post-merge.sh
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── .npmrc
├── .replit
├── .replitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── replit.md
├── tsconfig.base.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL database
- A configured `PORT` and `DATABASE_URL`

### Install dependencies

```bash
pnpm install
```

### Run the API server

```bash
PORT=5000 DATABASE_URL="postgres://user:password@localhost:5432/attentionsol" \
pnpm --filter @workspace/api-server run dev
```

The API server exposes routes under `/api`.

### Run type checks

```bash
pnpm run typecheck
```

### Build all workspace packages

```bash
pnpm run build
```

## Database

The database layer is defined in the `lib/db` package and uses Drizzle ORM with schema files under:

```text
lib/db/src/schema/
```

Key schema entries include:
- identity records
- auth challenge records
- wallet sessions
- token link records
- risk assessments
- audit event logs

To push schema changes:

```bash
pnpm --filter @workspace/db run push
```

## API

The OpenAPI contract lives at:

```text
lib/api-spec/openapi.yaml
```

This includes routes for:
- health checks
- dashboard overview
- identity management
- wallet authentication
- token verification
- risk assessment
- Solana RPC proxying
- public developer-facing endpoints

### Primary API groups

- `/api/healthz`
- `/api/identities`
- `/api/auth`
- `/api/tokens`
- `/api/solana`

## Environment Configuration

The project expects at least:

- `PORT` — server port
- `DATABASE_URL` — PostgreSQL connection string

Additional service configuration may be required depending on the deployment environment and Solana integration setup.

## Scripts

The root workspace includes shared scripts and validation tasks:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```

The repo also includes a post-merge helper script:

```bash
scripts/post-merge.sh
```

This script installs dependencies and pushes the database schema.

## Security Notes

The workspace enforces a minimum package release age policy in `pnpm-workspace.yaml` to reduce supply-chain risks. The project is designed with a security-conscious dependency setup and restricted runtime behaviors.

## License

This project is licensed under the MIT License.

## Contributing

When making changes:

1. Keep workspace packages consistent
2. Run lint and type checks before merging
3. Validate any API contract changes in `lib/api-spec/openapi.yaml`
4. Keep database schema and generated API output aligned
