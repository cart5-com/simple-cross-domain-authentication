import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { encodeBase64, decodeBase64 } from "@oslojs/encoding";
import { createTOTPKeyURI, verifyTOTP } from "@oslojs/otp";
import { renderSVG } from "uqr";
import { KNOWN_ERROR } from '../errors';
import { getUserByEmail, updateTwoFactorAuthKey, updateTwoFactorAuthRecoveryCode } from '../db/db-actions/userActions';
import { generateRandomRecoveryCode } from '../utils/generateRandomOtp';
import { decryptAesGcm, encryptAesGcm, encryptString } from '../utils/encryption';
import { getEnvironmentVariable } from '../utils/getEnvironmentVariable';
import { deleteCookie, getCookie } from 'hono/cookie';
import { TWO_FACTOR_AUTH_COOKIE_NAME } from '../consts';
import { decryptAndVerifyJwt } from '../utils/jwt';
import type { TwoFactorAuthVerifyPayload } from '../types/UserType';
import { validateTurnstile } from '../utils/validateTurnstile';
import { createUserSessionAndSetCookie } from '../db/db-actions/createSession';

const PUBLIC_DOMAIN_NAME = getEnvironmentVariable("PUBLIC_DOMAIN_NAME");

export const twoFactorAuthRoute = new Hono<honoTypes>()
    .use(async (c, next) => {
        const origin = c.req.header('origin');
        if (origin !== `https://auth.${PUBLIC_DOMAIN_NAME}`) {
            throw new KNOWN_ERROR("Invalid origin", "INVALID_ORIGIN");
        }
        await next();
    })
    .post(
        '/new',
        async (c) => {
            const user = c.get("USER");
            if (!user || !user.id) {
                throw new KNOWN_ERROR("User not found", "USER_NOT_FOUND");
            }
            const totpKey = new Uint8Array(20);
            crypto.getRandomValues(totpKey);
            const encodedTOTPKey = encodeBase64(totpKey);
            const keyURI = createTOTPKeyURI(`auth.${PUBLIC_DOMAIN_NAME}`, user.email, totpKey, 30, 6);
            return c.json({
                data: {
                    qrCodeSVG: renderSVG(keyURI),
                    encodedTOTPKey,
                    name: `auth.${PUBLIC_DOMAIN_NAME}: ${user.email}`,
                },
                error: null
            }, 200);
        }
    )
    .post(
        '/save',
        zValidator('form', z.object({
            encodedTOTPKey: z.string().length(28, { message: "Invalid TOTP key length" }),
            userProvidedCode: z.string().length(6, { message: "TOTP code must be 6 digits" }),
        })),
        async (c) => {
            const user = c.get("USER");
            if (!user || !user.id) {
                throw new KNOWN_ERROR("User not found", "USER_NOT_FOUND");
            }
            const { encodedTOTPKey, userProvidedCode } = c.req.valid('form');
            let key: Uint8Array;
            try {
                key = decodeBase64(encodedTOTPKey);
                // Validate key byte length
                if (key.byteLength !== 20) {
                    throw new KNOWN_ERROR("Invalid key byte length", "INVALID_KEY");
                }
            } catch {
                throw new KNOWN_ERROR("Invalid TOTP key format", "INVALID_KEY");
            }

            if (!verifyTOTP(key, 30, 6, userProvidedCode)) {
                throw new KNOWN_ERROR("Invalid TOTP code", "INVALID_TOTP");
            }

            const encryptedKey = encryptAesGcm(key);
            await updateTwoFactorAuthKey(user.id, encryptedKey);
            const recoveryCode = generateRandomRecoveryCode();
            const encryptedRecoveryCode = encryptString(recoveryCode);
            await updateTwoFactorAuthRecoveryCode(user.id, encryptedRecoveryCode);

            return c.json({
                data: {
                    recoveryCode,
                },
                error: null
            }, 200);
        }
    )
    .post(
        '/verify',
        zValidator('form', z.object({
            userProvidedCode: z.string().length(6, { message: "TOTP code must be 6 digits" }),
            turnstile: z.string().min(1, { message: "Verification required" })
        })),
        async (c) => {
            const { userProvidedCode, turnstile } = c.req.valid('form');

            await validateTurnstile(turnstile, c.req.header('X-Forwarded-For'));
            const twoFactorAuthToken = getCookie(c, TWO_FACTOR_AUTH_COOKIE_NAME);

            if (!twoFactorAuthToken) {
                throw new KNOWN_ERROR("Invalid or expired two factor authentication token", "INVALID_TWO_FACTOR_AUTH_TOKEN");
            }

            const { userId, email } = await decryptAndVerifyJwt<TwoFactorAuthVerifyPayload>(
                twoFactorAuthToken
            );
            const user = await getUserByEmail(email);
            if (!user) {
                throw new KNOWN_ERROR("User not found", "USER_NOT_FOUND");
            }
            if (!user.twoFactorAuthKey) {
                // no need to throw error here, as it's not expected to happen
                throw new KNOWN_ERROR("UNKNOWN_ERROR", "UNKNOWN_ERROR");
            }
            if (!verifyTOTP(decryptAesGcm(user.twoFactorAuthKey), 30, 6, userProvidedCode)) {
                throw new KNOWN_ERROR("Invalid TOTP code", "INVALID_TOTP");
            }

            await createUserSessionAndSetCookie(c, user.id);
            deleteCookie(c, TWO_FACTOR_AUTH_COOKIE_NAME);

            return c.json({
                data: "success",
                error: null
            }, 200);

        }
    )

