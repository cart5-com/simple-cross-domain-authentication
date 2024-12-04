import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { SESSION_COOKIE_NAME } from "../consts";
import { validateSessionCookie } from "../db/db-actions/validateSessionCookie";
import { getEnvironmentVariable } from "../utils/getEnvironmentVariable";

export const authChecks = createMiddleware(async (c, next) => {
    const cookieValue = getCookie(c, SESSION_COOKIE_NAME) ?? null;
    if (cookieValue === null) {
        c.set("USER", null);
        c.set("SESSION", null);
        await next();
    } else {
        let hostname = c.req.header('Host');
        const internalSecret = c.req.header("internalSecret") ?? null;
        if (internalSecret === getEnvironmentVariable('JWT_SECRET')) {
            hostname = c.req.header("internalHost");
        }
        const { user, session } = await validateSessionCookie(cookieValue, hostname!);
        if (session && session.fresh) {
            setCookie(c, SESSION_COOKIE_NAME, cookieValue, {
                path: "/",
                secure: true, // using https in dev with caddy
                httpOnly: true,
                expires: session.expiresAt,
                sameSite: "strict"
            });
        }
        if (!session) {
            deleteCookie(c, SESSION_COOKIE_NAME);
        }
        c.set("SESSION", session);
        c.set("USER", user);
        await next();
    }
});