import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { validateTurnstile } from '../utils/validateTurnstile';
import { KNOWN_ERROR } from '../errors';
import { isKnownHostname } from '../utils/knownHostnames';
import { createSession } from '../db/dbUtils/createSession';
import { generateSessionToken } from '../utils/generateSessionToken';
import { CROSS_DOMAIN_SESSION_EXPIRES_IN, SESSION_COOKIE_NAME } from '../consts';
import { decryptAndVerifyJwt, signJwtAndEncrypt } from '../utils/jwt';
import { getEnvironmentVariable } from '../utils/getEnvironmentVariable';
import { validateSessionCookie } from '../session/validateSessionCookie';
import deleteSession from '../db/dbUtils/deleteSession';
import { setCookie } from 'hono/cookie';

export const crossDomainRoute = new Hono<honoTypes>()
    .post(
        '/redirector',
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


            const refererHeader = c.req.header('referer')
            if (!refererHeader) {
                throw new KNOWN_ERROR("Referer header not found", "REFERRER_HEADER_NOT_FOUND");
            }
            if (!refererHeader.startsWith(`https://auth.${getEnvironmentVariable("PUBLIC_DOMAIN_NAME")}`)) {
                throw new KNOWN_ERROR("Invalid referer header", "INVALID_REFERER_HEADER");
            }

            const user = c.get("USER");
            if (!user || !user.id) {
                throw new KNOWN_ERROR("User not found", "USER_NOT_FOUND");
            }
            const url = new URL(redirectUrl);
            if (!await isKnownHostname(url.hostname)) {
                throw new KNOWN_ERROR("Invalid redirect URL", "INVALID_REDIRECT_URL");
            }
            const sessionToken = generateSessionToken();
            const session = await createSession(sessionToken, user.id, url.hostname, CROSS_DOMAIN_SESSION_EXPIRES_IN);

            const code = await signJwtAndEncrypt(
                {
                    sessionToken,
                    sessionId: session.id,
                    turnstile,
                    exp: Math.floor(Date.now() / 1000) + 600, //  expires in 10 minutes
                },
                getEnvironmentVariable("JWT_SECRET"),
                getEnvironmentVariable("ENCRYPTION_KEY")
            );

            return c.redirect(getCrossDomainCallbackUrl(code, redirectUrl));
        }
    )
    .get(
        '/callback',
        zValidator('query', z.object({
            code: z.string().min(1, { message: "code required" }),
            redirectUrl: z.string().min(1, { message: "redirectUrl required" }),
        })),
        async (c) => {
            const query = c.req.valid('query');
            const redirectUrl = new URL(decodeURIComponent(query.redirectUrl));
            const {
                sessionToken: tmpSessionToken,
                sessionId: tmpSessionId,
                turnstile
            } = await decryptAndVerifyJwt<{ sessionToken: string, sessionId: string, turnstile: string }>(
                query.code,
                getEnvironmentVariable("JWT_SECRET"),
                getEnvironmentVariable("ENCRYPTION_KEY")
            );

            await validateTurnstile(turnstile, c.req.header('X-Forwarded-For'));

            const host = c.req.header('host');
            if (!host) {
                throw new KNOWN_ERROR("Host not found", "HOST_NOT_FOUND");
            }
            if (!await isKnownHostname(host)) {
                throw new KNOWN_ERROR("Invalid redirect URL", "INVALID_REDIRECT_URL");
            }

            const { user, session: tmpSession } = await validateSessionCookie(tmpSessionToken, host);
            if (!tmpSession) {
                throw new KNOWN_ERROR("Session not found", "SESSION_NOT_FOUND");
            }
            if (tmpSession.id !== tmpSessionId) {
                throw new KNOWN_ERROR("Invalid session", "INVALID_SESSION");
            }
            await deleteSession(tmpSession.id);

            const newSessionToken = generateSessionToken();
            const newSession = await createSession(newSessionToken, user.id, c.req.header('host')!);
            setCookie(c, SESSION_COOKIE_NAME, newSessionToken, {
                path: "/",
                secure: true, // using https in dev with caddy
                httpOnly: true,
                expires: newSession.expiresAt,
                sameSite: "strict"
            });
            return c.redirect(redirectUrl.toString());
        }
    )

const getCrossDomainCallbackUrl = (code: string, redirectUrl: string) => {
    const url = new URL(redirectUrl);
    // import { createAuthApiClient } from '../export/authApiClient'
    // const authApiClient = createAuthApiClient(`${url.origin}/__p_auth/`);
    // const goToUrl = new URL(authApiClient.api.cross_domain.callback.$url());
    const goToUrl = new URL(`${url.origin}/__p_auth/api/cross_domain/callback`);
    goToUrl.searchParams.set("code", code);
    goToUrl.searchParams.set("redirectUrl", encodeURIComponent(redirectUrl));
    return goToUrl.toString();
}