# Development Proxy (Caddy)

Caddy proxy configuration for local development, enabling cross-domain testing.

## Features

- HTTPS with automatic certificates
- Cross-domain request handling

## Configuration

See `Caddyfile_dev` for routing rules:

- Auth API: `/__p_auth/*`
- Auth Client: `auth.{$PUBLIC_DOMAIN_NAME}/*`
- Web Store: `* all other domains`
