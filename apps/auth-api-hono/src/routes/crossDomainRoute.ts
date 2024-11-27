import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { validateTurnstile } from '../utils/validateTurnstile';
import { KNOWN_ERROR } from '../errors';
import { isKnownHostname } from '../utils/knownHostnames';
import { createSession, createUserSessionAndSetCookie } from '../db/db-actions/createSession';
import { generateSessionToken } from '../utils/generateSessionToken';
import { CROSS_DOMAIN_SESSION_EXPIRES_IN, SESSION_COOKIE_NAME } from '../consts';
import { decryptAndVerifyJwt, signJwtAndEncrypt } from '../utils/jwt';
import { getEnvironmentVariable } from '../utils/getEnvironmentVariable';
import { validateSessionCookie } from '../db/db-actions/validateSessionCookie';
import deleteSession from '../db/db-actions/deleteSession';

/**
 * Cross domain authentication route handler
 * Handles authentication across different domains in a secure way
 */
export const crossDomainRoute = new Hono<honoTypes>()
    .post(
        '/redirector',
        // Validate the form data - redirectUrl must not be pre-encoded and turnstile token required
        zValidator('form', z.object({
            // post without encoding, getCrossDomainCallbackUrl will encode
            redirectUrl: z.string()
                .min(1, { message: "Redirect URL required" })
                .refine((url) => {
                    try {
                        // If the URL is encoded, decoding it will change it
                        return url === decodeURIComponent(url);
                    } catch {
                        return false;
                    }
                }, { message: "Redirect URL must not be encoded" }),
            turnstile: z.string().min(1, { message: "Verification required" })
        })),
        async (c) => {
            const { redirectUrl, turnstile } = c.req.valid('form');

            // Security check: Verify request comes from our auth domain
            const refererHeader = c.req.header('referer')
            if (!refererHeader) {
                throw new KNOWN_ERROR("Referer header not found", "REFERRER_HEADER_NOT_FOUND");
            }
            if (!refererHeader.startsWith(`https://auth.${getEnvironmentVariable("PUBLIC_DOMAIN_NAME")}`)) {
                throw new KNOWN_ERROR("Invalid referer header", "INVALID_REFERER_HEADER");
            }

            // Verify user is authenticated
            const user = c.get("USER");
            if (!user || !user.id) {
                throw new KNOWN_ERROR("User not found", "USER_NOT_FOUND");
            }

            // Validate target domain is in our allowed list
            const url = new URL(redirectUrl);
            if (!await isKnownHostname(url.hostname)) {
                throw new KNOWN_ERROR("Invalid redirect URL", "INVALID_REDIRECT_URL");
            }

            // Create temporary cross-domain session
            const sessionToken = generateSessionToken();
            const session = await createSession(sessionToken, user.id, url.hostname, CROSS_DOMAIN_SESSION_EXPIRES_IN);

            // Create encrypted JWT containing session info
            const code = await signJwtAndEncrypt(
                {
                    sessionToken,
                    sessionId: session.id,
                    turnstile,
                },
                getEnvironmentVariable("JWT_SECRET"),
                getEnvironmentVariable("ENCRYPTION_KEY")
            );

            // Redirect to callback URL on target domain
            return c.redirect(getCrossDomainCallbackUrl(code, redirectUrl));
        }
    )
    .get(
        '/callback',
        // this is the callback url from the target domain, we use proxy to get the request here.
        // Validate query parameters - require code and redirectUrl
        zValidator('query', z.object({
            code: z.string().min(1, { message: "code required" }),
            redirectUrl: z.string().min(1, { message: "redirectUrl required" }),
        })),
        async (c) => {
            const query = c.req.valid('query');
            const redirectUrl = new URL(decodeURIComponent(query.redirectUrl));

            // Decrypt and verify the JWT token
            const {
                sessionToken: tmpSessionToken,
                sessionId: tmpSessionId,
                turnstile
            } = await decryptAndVerifyJwt<{ sessionToken: string, sessionId: string, turnstile: string }>(
                query.code,
                getEnvironmentVariable("JWT_SECRET"),
                getEnvironmentVariable("ENCRYPTION_KEY")
            );

            // Verify turnstile token is valid
            await validateTurnstile(turnstile, c.req.header('X-Forwarded-For'));

            // Validate current domain is in allowed list
            const host = c.req.header('host');
            if (!host) {
                throw new KNOWN_ERROR("Host not found", "HOST_NOT_FOUND");
            }
            if (!await isKnownHostname(host)) {
                throw new KNOWN_ERROR("Invalid redirect URL", "INVALID_REDIRECT_URL");
            }

            // Validate temporary session
            const { user, session: tmpSession } = await validateSessionCookie(tmpSessionToken, host);
            if (!tmpSession) {
                throw new KNOWN_ERROR("Session not found", "SESSION_NOT_FOUND");
            }
            if (tmpSession.id !== tmpSessionId) {
                throw new KNOWN_ERROR("Invalid session", "INVALID_SESSION");
            }

            // Delete temporary session
            await deleteSession(tmpSession.id);

            // Create new permanent session for this domain
            const hostname = c.req.header('host');
            if (!hostname) {
                throw new KNOWN_ERROR("Host not found", "HOST_NOT_FOUND");
            }
            await createUserSessionAndSetCookie(c, user);

            // Redirect to final destination
            return c.redirect(redirectUrl.toString());
        }
    )

/**
 * Generates the callback URL for cross-domain authentication
 * @param code - Encrypted JWT containing session information
 * @param redirectUrl - Final destination URL after authentication
 * @returns Full callback URL with parameters
 */
const getCrossDomainCallbackUrl = (code: string, redirectUrl: string) => {
    const url = new URL(redirectUrl);
    // import { createAuthApiClient } from '../authApiClient'
    // const authApiClient = createAuthApiClient(`${url.origin}/__p_auth/`);
    // const goToUrl = new URL(authApiClient.api.cross_domain.callback.$url());
    const goToUrl = new URL(`${url.origin}/__p_auth/api/cross_domain/callback`);
    goToUrl.searchParams.set("code", code);
    goToUrl.searchParams.set("redirectUrl", encodeURIComponent(redirectUrl));
    return goToUrl.toString();
}