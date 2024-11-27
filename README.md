# simple-cross-domain-authentication monorepo

This is a monorepo(turborepo) for a simple cross-domain authentication example.
learned from [lucia-auth](https://lucia-auth.com/).

## Requirements for local development

What I used to develop:

- Node.js v20.11 (use nvm to install)
- pnpm v9.9.0 ( npm install -g pnpm )
- caddy v2.8.4 (use brew to install)

## Hosts file to use https with caddy proxy

```
127.0.0.1 auth.cart5dev.com
127.0.0.1 sample-store-1.com
127.0.0.1 sample-store-2.com
127.0.0.1 unknown-store.com
```
