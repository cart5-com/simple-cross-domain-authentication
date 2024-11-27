import { defineMiddleware } from "astro:middleware";
import { createAuthApiClient } from '../../../auth-api-hono/src/authApiClient'

export const authMiddleware = defineMiddleware(async (context, next) => {
    const authApiClient = createAuthApiClient(`${context.url.origin}/__p_auth/`);
    const whoamiUrl = await authApiClient.api.user.whoami.$url();
    whoamiUrl.protocol = "https";
    if (import.meta.env.DEV) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    const whoamiResponse = await fetch(whoamiUrl.toString(), {
        method: "POST",
        headers: {
            origin: context.url.origin,
            cookie: context.request.headers.get("cookie") ?? ""
        }
    });
    try {
        const whoamiData = await whoamiResponse.json();
        if (whoamiData.data) {
            context.locals.USER = whoamiData.data;
        } else {
            context.locals.USER = null;
        }
    } catch (e) {
        context.locals.USER = null;
    }
    const response = await next();
    const setCookieHeaders = whoamiResponse.headers.getSetCookie();
    for (const setCookie of setCookieHeaders) {
        response.headers.append("Set-Cookie", setCookie);
    }
    return response;
});