# Auth API Service (Hono)

Authentication service built with Hono, providing secure cross-domain authentication capabilities.

## Features

- Cross-domain session management
- OTP authentication
- Email verification
- CSRF protection
- Cloudflare Turnstile integration

## API Endpoints

- `POST /api/otp/otp` - Request OTP
- `POST /api/otp/verify` - Verify OTP
- `POST /api/user/whoami` - Get current user
- `POST /api/user/logout` - Logout user
- `POST /api/cross_domain/redirector` - Handle cross-domain auth
