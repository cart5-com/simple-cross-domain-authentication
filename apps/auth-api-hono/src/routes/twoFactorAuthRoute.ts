import { Hono } from 'hono'
import type { honoTypes } from '../index'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { encodeBase64, decodeBase64 } from "@oslojs/encoding";
import { createTOTPKeyURI, verifyTOTP } from "@oslojs/otp";
import { renderSVG } from "uqr";
import { KNOWN_ERROR } from '../errors';
import { PUBLIC_DOMAIN_NAME } from '../consts';

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
                    encodedTOTPKey
                },
                error: null
            }, 200);
        }
    )
    .post(
        '/verify',
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

            return c.json({
                data: "success",
                error: null
            }, 200);
        }
    )