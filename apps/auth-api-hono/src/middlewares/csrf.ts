import { createMiddleware } from "hono/factory";
import { verifyRequestOrigin } from "../utils/requestCheck";
import { getEnvironmentVariable } from "../utils/getEnvironmentVariable";

export const csrfChecks = createMiddleware(async (c, next) => {
	if (c.req.method === "GET") {
		await next();
	} else {
		const originHeader = c.req.header("Origin") ?? null;
		const hostHeader = c.req.header("Host") ?? null;
		const internalSecret = c.req.header("internalSecret") ?? null;
		if (internalSecret === getEnvironmentVariable('JWT_SECRET')) {
			await next();
		} else {
			if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
				return c.body("csrfChecks:403", 403);
			}
			await next();
		}
	}
});
