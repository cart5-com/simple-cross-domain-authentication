import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generateRandomOTP } from '../utils/generateRandomOtp';
import { decryptAndVerifyJwt, signJwtAndEncrypt } from '../utils/jwt';
import { OTP_COOKIE_NAME, PUBLIC_DOMAIN_NAME } from '../consts';
import { sendUserOtpEmail } from '../utils/email';
import { validateTurnstile } from '../utils/validateTurnstile';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { KNOWN_ERROR } from '../errors';
import { updateRequiredFields, upsertUser } from '../db/db-actions/userActions';
import { createUserSessionAndSetCookie } from '../db/db-actions/createSession';

export const otpRoute = new Hono<honoTypes>()
    .use(async (c, next) => {
        // const referer = c.req.header('referer');
        // const host = c.req.header('host');
        const origin = c.req.header('origin');
        if (origin !== `https://auth.${PUBLIC_DOMAIN_NAME}`) {
            throw new KNOWN_ERROR("Invalid origin", "INVALID_ORIGIN");
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
            const otpToken = await signJwtAndEncrypt<OtpTokenPayload>(
                {
                    email: verifyEmail,
                    otp,
                }
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
            const { email, otp } = await decryptAndVerifyJwt<OtpTokenPayload>(
                otpToken
            );
            if (verifyEmail.toUpperCase() !== email.toUpperCase() || otp.toUpperCase() !== code.toUpperCase()) {
                throw new KNOWN_ERROR("Invalid OTP", "INVALID_OTP");
            }

            const user = await upsertUser(email);
            await updateRequiredFields(user, {
                name: email.split('@')[0],
                pictureUrl: null,
                isEmailVerified: true // set email as verified after email OTP verification
            });
            await createUserSessionAndSetCookie(c, user.id);

            return c.json({
                data: "success",
                error: null
            }, 200);
        }
    )

type OtpTokenPayload = {
    email: string;
    otp: string;
}