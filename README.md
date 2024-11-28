# Simple Cross-Domain Authentication Monorepo

This is a monorepo for a simple cross-domain authentication example.
(used auth sample from lucia-auth by pilcrowonpaper.com)

## Features

- ✅ Cross-domain authentication
- ✅ One-time password (OTP) authentication
- ✅ Cloudflare Turnstile integration
- ✅ Email verification

## Basic Flow for cross-domain auth

1. User visits Store Site (e.g., sample-store-1.com)

   - User clicks "Login" button
   - Gets redirected to auth.cart5dev.com with return URL

2. On Auth Site (auth.cart5dev.com)

   - User logs in using OTP (one-time password)
   - After successful login, initiates cross-domain auth process

3. Cross-Domain Authentication
   - Creates temporary session
   - Encrypts session data
   - Redirects back to store with encrypted data
   - Store website validates and creates its own session

## Basic Flow details for OTP

1. User enters email and completes Turnstile verification

   - System generates OTP
   - Encrypts OTP and email into JWT token
   - Stores token in **HTTP-only cookie**
   - Sends OTP to user's email

2. User enters received OTP code
   - System validates OTP code against stored token
   - Creates or updates user record
   - Generates session token
   - Sets session cookie

## Architecture

- **Frontend**: Astro (SSG & SSR)
- **Backend**: Hono (TypeScript)
- **Database**: SQLite with Drizzle ORM
- **Proxy**: Caddy for local development (yes, I do not like dealing with CORS issues)

## Project Structure

```
apps/
├── auth-api-hono/ # Authentication API service
├── auth-client-astro/ # Authentication client (SSG)
├── web-store-ssr-astro/# Demo store with SSR
└── proxy-caddy/ # Local development proxy
```

## Prerequisites

- Node.js v20.11+ (recommended: use nvm)
- pnpm v9.9.0+ (`npm install -g pnpm`)
- Caddy v2.8.4+ (macOS: `brew install caddy`)

## Local Development Setup

1. Configure hosts file:

Add to /etc/hosts

```
127.0.0.1 auth.cart5dev.com
127.0.0.1 sample-store-1.com
127.0.0.1 sample-store-2.com
127.0.0.1 unknown-store.com
```

2. Setup environment:

```
cp .env.example .env
```

3. Install dependencies and start development servers:

```
pnpm install
pnpm dev
```

4. Access the demo store at https://sample-store-1.com

## Roadmap

- ✅ One-time password authentication
- ✅ Email/password authentication
- ✅ Google OAuth integration
- [ ] Two-factor authentication (2FA)
