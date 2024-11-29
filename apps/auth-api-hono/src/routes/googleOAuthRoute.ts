import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { decodeIdToken, generateCodeVerifier, generateState, Google, OAuth2Tokens } from 'arctic';
import { getEnvironmentVariable } from '../utils/getEnvironmentVariable';
import { decryptAndVerifyJwt, signJwtAndEncrypt } from '../utils/jwt';
import { GOOGLE_OAUTH_COOKIE_NAME, PUBLIC_DOMAIN_NAME } from '../consts';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { KNOWN_ERROR } from '../errors';
import { updateRequiredFields, upsertUser } from '../db/db-actions/userActions';
import { createUserSessionAndSetCookie } from '../db/db-actions/createSession';


export const googleOAuthRoute = new Hono<honoTypes>()
    .get(
        '/redirect',
        zValidator('query', z.object({
            redirect_uri: z.string().min(1),
        })),
        async (c) => {
            const { redirect_uri } = c.req.valid('query');

            const hostHeader = c.req.header('host');
            if (!hostHeader) {
                throw new KNOWN_ERROR("Host header not found", "HOST_HEADER_NOT_FOUND");
            }
            if (hostHeader !== `auth.${PUBLIC_DOMAIN_NAME}`) {
                throw new KNOWN_ERROR("Invalid host", "INVALID_HOST");
            }

            const refererHeader = c.req.header('referer')
            if (!refererHeader) {
                throw new KNOWN_ERROR("Referer header not found", "REFERRER_HEADER_NOT_FOUND");
            }
            if (!refererHeader.startsWith(`https://auth.${PUBLIC_DOMAIN_NAME}`)) {
                throw new KNOWN_ERROR("Invalid referer header", "INVALID_REFERER_HEADER");
            }

            const { url, state: storedState, codeVerifier: storedCodeVerifier } = await getSignInUrl();

            const google_oauth_token = await signJwtAndEncrypt<GoogleOAuthTokenPayload>(
                {
                    storedState,
                    storedCodeVerifier,
                    redirect_uri: decodeURIComponent(redirect_uri)
                }
            );

            setCookie(c, GOOGLE_OAUTH_COOKIE_NAME, google_oauth_token, {
                path: "/",
                secure: true,
                httpOnly: true,
                maxAge: 600, // 10 minutes
                sameSite: "lax" // must use lax to read cookie value after google's redirect
                // strict does not allow reading the cookie value after redirect
            });

            return c.redirect(url.toString());
        }
    )
    .get(
        '/callback',
        zValidator('query', z.object({
            code: z.string().min(1),
            state: z.string().min(1)
        })),
        async (c) => {
            const { code, state } = c.req.valid('query');
            const google_oauth_token = getCookie(c, GOOGLE_OAUTH_COOKIE_NAME);
            if (!google_oauth_token) {
                throw new KNOWN_ERROR("No google oauth token", "NO_GOOGLE_OAUTH_TOKEN");
            }
            deleteCookie(c, GOOGLE_OAUTH_COOKIE_NAME);

            const refererHeader = c.req.header('referer')
            if (!refererHeader) {
                throw new KNOWN_ERROR("Referer header not found", "REFERRER_HEADER_NOT_FOUND");
            }
            if (refererHeader !== `https://accounts.google.com/`) {
                throw new KNOWN_ERROR("Invalid referer header", "INVALID_REFERER_HEADER");
            }

            const hostHeader = c.req.header('host');
            if (!hostHeader) {
                throw new KNOWN_ERROR("Host header not found", "HOST_HEADER_NOT_FOUND");
            }
            if (hostHeader !== `auth.${PUBLIC_DOMAIN_NAME}`) {
                throw new KNOWN_ERROR("Invalid host", "INVALID_HOST");
            }

            const url = new URL(c.req.url);
            // Check if this is the Google OAuth callback request
            const isGoogleCallback = url.pathname === '/api/google_oauth/callback' &&
                url.searchParams.has('state') &&
                url.searchParams.has('code') &&
                url.searchParams.has('scope');
            if (!isGoogleCallback) {
                throw new KNOWN_ERROR("Invalid request", "INVALID_REQUEST");
            }

            const { storedState, storedCodeVerifier, redirect_uri } = await decryptAndVerifyJwt<GoogleOAuthTokenPayload>(
                google_oauth_token
            );
            if (!storedState || !storedCodeVerifier || !redirect_uri) {
                throw new KNOWN_ERROR("Expired or invalid", "EXPIRED_OR_INVALID_GOOGLE_OAUTH_TOKEN");
            }
            if (storedState !== state) {
                throw new KNOWN_ERROR("Invalid state", "INVALID_STATE");
            }

            const googleOAuthUser = await validateAuthorizationCode(code, storedCodeVerifier);

            const user = await upsertUser(googleOAuthUser.email);
            await updateRequiredFields(user, {
                name: googleOAuthUser.name,
                pictureUrl: googleOAuthUser.picture,
                isEmailVerified: true // set email as verified
            });
            await createUserSessionAndSetCookie(c, user.id);

            return c.redirect(redirect_uri.toString());
        }
    )

type GoogleOAuthTokenPayload = {
    storedState: string;
    storedCodeVerifier: string;
    redirect_uri: string;
}

type GoogleOAuthClaims = {
    at_hash: string;
    aud: string;
    azp: string;
    email: string;
    email_verified: boolean;
    exp: number;
    family_name: string;
    given_name: string;
    iat: number;
    iss: string;
    name: string;
    picture: string;
    sub: string;
}

async function validateAuthorizationCode(code: string, codeVerifier: string) {
    const google = new Google(
        getEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID"),
        getEnvironmentVariable("GOOGLE_OAUTH_CLIENT_SECRET"),
        getEnvironmentVariable("GOOGLE_OAUTH_REDIRECT_URI")
    );
    let tokens: OAuth2Tokens;
    try {
        tokens = await google.validateAuthorizationCode(code, codeVerifier);
    } catch (e) {
        throw new KNOWN_ERROR("Invalid authorization", "INVALID_AUTHORIZATION");
    }
    return decodeIdToken(tokens.idToken()) as GoogleOAuthClaims;
}

async function getSignInUrl() {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const google = new Google(
        getEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID"),
        getEnvironmentVariable("GOOGLE_OAUTH_CLIENT_SECRET"),
        getEnvironmentVariable("GOOGLE_OAUTH_REDIRECT_URI")
    );
    const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);
    return { url, state, codeVerifier };
}