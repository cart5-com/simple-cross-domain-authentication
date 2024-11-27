import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generateRandomOTP } from '../utils/generateRandomOtp';
import { decryptAndVerifyJwt, signJwtAndEncrypt } from '../utils/jwt';
import { getEnvironmentVariable } from '../utils/getEnvironmentVariable';
import { OTP_COOKIE_NAME, SESSION_COOKIE_NAME } from '../consts';
import { sendUserOtpEmail } from '../utils/email';
import { validateTurnstile } from '../utils/validateTurnstile';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { KNOWN_ERROR } from '../errors';
import { upsertUser } from '../db/dbUtils/upsertUser';
import { generateSessionToken } from '../utils/generateSessionToken';
import { createSession } from '../db/dbUtils/createSession';

export const otpRoute = new Hono<honoTypes>()
    .use(async (c, next) => {
        const referer = c.req.header('referer');
        if (referer !== `https://auth.${getEnvironmentVariable("PUBLIC_DOMAIN_NAME")}/`) {
            throw new KNOWN_ERROR("Invalid referer", "INVALID_REFERER");
        }
        await next();
    })
    .post(
        '/otp',
        zValidator('form', z.object({
            verifyEmail: z.string().email().max(200),
            turnstile: z.string().min(1, { message: "Verification required" })
        })),
        async (c) => {
            const { verifyEmail, turnstile } = c.req.valid('form');
            await validateTurnstile(turnstile, c.req.header('X-Forwarded-For'));

            const otp = generateRandomOTP().toUpperCase();
            const otpToken = await signJwtAndEncrypt(
                {
                    email: verifyEmail,
                    otp,
                    exp: Math.floor(Date.now() / 1000) + 600, // Token expires in 10 minutes
                },
                getEnvironmentVariable("JWT_SECRET"),
                getEnvironmentVariable("ENCRYPTION_KEY")
            );

            setCookie(c, OTP_COOKIE_NAME, otpToken, {
                path: "/",
                secure: true, // using https in dev with caddy
                httpOnly: true,
                maxAge: 600, // 10 minutes
                sameSite: "strict"
            });

            await sendUserOtpEmail(verifyEmail, otp);

            return c.json({
                data: "success",
                error: null
            }, 200);
        }
    )
    .post(
        '/verify',
        zValidator('form', z.object({
            verifyEmail: z.string().email().max(200),
            code: z.string().min(1, { message: "One-time password required" }),
            turnstile: z.string().min(1, { message: "Verification required" })
        })),
        async (c) => {
            const { verifyEmail, code, turnstile } = c.req.valid('form');
            await validateTurnstile(turnstile, c.req.header('X-Forwarded-For'));
            const otpToken = getCookie(c, OTP_COOKIE_NAME);
            deleteCookie(c, OTP_COOKIE_NAME);

            if (!otpToken) {
                throw new KNOWN_ERROR("Invalid or expired OTP", "INVALID_OTP");
            }
            const { email, otp } = await decryptAndVerifyJwt<{ email: string, otp: string }>(
                otpToken,
                getEnvironmentVariable("JWT_SECRET"),
                getEnvironmentVariable("ENCRYPTION_KEY")
            );
            if (verifyEmail.toUpperCase() !== email.toUpperCase() || otp.toUpperCase() !== code.toUpperCase()) {
                throw new KNOWN_ERROR("Invalid OTP", "INVALID_OTP");
            }

            const { userId } = (await upsertUser(email, true))[0];
            const sessionToken = generateSessionToken();
            const session = await createSession(sessionToken, userId, c.req.header('host')!);
            setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
                path: "/",
                secure: true, // using https in dev with caddy
                httpOnly: true,
                expires: session.expiresAt,
                sameSite: "strict"
            });

            return c.json({
                data: "success",
                error: null
            }, 200);
        }
    )