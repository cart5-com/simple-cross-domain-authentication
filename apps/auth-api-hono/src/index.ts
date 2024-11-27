import { serve, type HttpBindings } from '@hono/node-server'
import { Hono } from "hono";
import { csrfChecks } from "./middlewares/csrf";
import { authChecks } from './middlewares/auth';
import { otpRoute } from './routes/otpRoute';
import { userRoute } from './routes/userRoute';
import { secureHeaders } from 'hono/secure-headers'
import { KNOWN_ERROR } from './errors';
import type { Session } from './types/SessionType';
import type { User } from './types/UserType';
import { crossDomainRoute } from './routes/crossDomainRoute';

export type HonoVariables = {
	SESSION: Session | null,
	USER: User | null,
}

type Bindings = HttpBindings & {
	/* ... */
}

export type honoTypes = { Bindings: Bindings, Variables: HonoVariables };

const app = new Hono<honoTypes>();
app.use(csrfChecks);
app.use(authChecks);
app.use(secureHeaders());

app.onError((err, c) => {
	if (err instanceof KNOWN_ERROR) {
		console.log("KNOWN_ERROR err:");
		console.log(err);
		// TODO: add sentry
		c.error = undefined;
		return c.json({
			error: {
				message: err.message,
				code: err.code
			},
		}, 500);
	} else {
		// this is same with hono's own error handler. 
		// but i like JSON
		if ("getResponse" in err) {
			return err.getResponse();
		}
		console.error(err);
		return c.json({
			error: {
				message: "Internal Server Error"
			},
		}, 503);
	}
})

app.get("/", (c) => {
	return c.html(`Hello Hono!`);
});

const routes = app.basePath('/api')
	.route('/otp', otpRoute)
	.route('/user', userRoute)
	.route('/cross_domain', crossDomainRoute)

export type AuthAppType = typeof routes;

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port
});
