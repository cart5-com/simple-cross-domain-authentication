# simple-cross-domain-authentication monorepo

This is a monorepo for a simple cross-domain authentication example.
(used auth sample from lucia-auth by pilcrowonpaper.com)

## Requirements for local development

What I used to develop:

- Node.js v20.11 (use nvm to install)
- pnpm v9.9.0 ( npm install -g pnpm )
- caddy v2.8.4 (you may use brew to install)

## Hosts file

Add the following to your hosts file:

```
127.0.0.1 auth.cart5dev.com
127.0.0.1 sample-store-1.com
127.0.0.1 sample-store-2.com
127.0.0.1 unknown-store.com
```

## Copy .env.example

```
cp .env.example .env
```

## Run

```
pnpm i
pnpm dev
```

then open browser and navigate to https://sample-store-1.com

## Stack

- Hono for API
- Astro for web client
- Drizzle with sqlite

## Apps

- proxy-caddy: I do not like dealing with CORS issues. So I use caddy to proxy requests to the apps.
- auth-api-hono:
- auth-client-astro: used for static site generation
- web-store-ssr-astro:

## TODO

- [ ] add signup with email/password
- [ ] add login with email/password
- [ ] add login with google
- [ ] add 2FA
