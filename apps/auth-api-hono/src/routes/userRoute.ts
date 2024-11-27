import { Hono } from 'hono'
import type { honoTypes } from '../index'
import deleteSession from '../db/db-actions/deleteSession';
import { SESSION_COOKIE_NAME } from '../consts';
import { setCookie } from 'hono/cookie';

export const userRoute = new Hono<honoTypes>()
    .post(
        '/logout',
        async (c) => {
            const session = c.get('SESSION');
            if (session) {
                await deleteSession(session.id);
                setCookie(c, SESSION_COOKIE_NAME, "", {
                    path: "/",
                    secure: true, // using https in dev with caddy
                    httpOnly: true,
                    sameSite: "strict",
                    maxAge: 0,
                });
            }
            return c.json({
                data: "success",
                error: null
            }, 200);
        }
    )
    .post(
        '/whoami',
        async (c) => {
            return c.json({
                data: c.get("USER"),
                error: null
            }, 200);
        }
    )