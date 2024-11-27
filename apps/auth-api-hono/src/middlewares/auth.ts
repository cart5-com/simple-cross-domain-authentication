import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { SESSION_COOKIE_NAME } from "../consts";
import { validateSessionCookie } from "../session/validateSessionCookie";

export const authChecks = createMiddleware(async (c, next) => {
    const cookieValue = getCookie(c, SESSION_COOKIE_NAME) ?? null;
    if (cookieValue === null) {
        c.set("USER", null);
        c.set("SESSION", null);
        await next();
    } else {
        const hostname = c.req.header('Host');
        const { user, session } = await validateSessionCookie(cookieValue, hostname!);
        if (session && session.fresh) {
            // c.header("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, cookieValue, {
            //     httpOnly: true,
            //     path: "/",
            //     secure: true, // using https in dev with caddy
            //     sameSite: "strict",
            //     expires: session.expiresAt
            // }), { append: true });
            setCookie(c, SESSION_COOKIE_NAME, cookieValue, {
                path: "/",
                secure: true, // using https in dev with caddy
                httpOnly: true,
                expires: session.expiresAt,
                sameSite: "strict"
            });
        }
        if (!session) {
            // c.header("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, "", {
            //     httpOnly: true,
            //     path: "/",
            //     secure: true, // using https in dev with caddy
            //     sameSite: "strict",
            //     maxAge: 0,
            // }), { append: true });
            setCookie(c, SESSION_COOKIE_NAME, "", {
                path: "/",
                secure: true, // using https in dev with caddy
                httpOnly: true,
                sameSite: "strict",
                maxAge: 0,
            });
        }
        c.set("SESSION", session);
        c.set("USER", user);
        await next();
    }
});