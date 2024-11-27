import { sign, verify } from 'hono/jwt'
import { type JWTPayload } from "hono/utils/jwt/types";
import { decrypt, encrypt } from './encryption';
import { KNOWN_ERROR } from '../errors';
import { getEnvironmentVariable } from "./getEnvironmentVariable";
const key = getEnvironmentVariable("JWT_SECRET");

export const signJWT = (payloadParam: JWTPayload, JWT_SECRET: string) => {
    if (!payloadParam.hasOwnProperty("exp")) {
        const payload: JWTPayload = {
            ...payloadParam,
            exp: Math.floor(Date.now() / 1000) + 600, //  default: expires in 10 minutes
        };
        return sign(payload, JWT_SECRET);
    } else {
        return sign(payloadParam as JWTPayload, JWT_SECRET);
    }
};

export const verifyJWT = <T>(token: string, JWT_SECRET: string): T => {
    return verify(token, JWT_SECRET) as T;
};

export const signJwtAndEncrypt = async (
    payloadParam: JWTPayload,
    JWT_SECRET: string,
    ENCRYPTION_KEY: string
): Promise<string> => {
    const jwt = await signJWT(payloadParam, JWT_SECRET);
    return await encrypt(jwt, ENCRYPTION_KEY);
};

export const decryptAndVerifyJwt = async <T>(
    token: string,
    JWT_SECRET: string,
    ENCRYPTION_KEY: string
): Promise<T> => {
    try {
        const jwt = await decrypt(token, ENCRYPTION_KEY);
        return await verifyJWT<T>(jwt, JWT_SECRET);
    } catch (error) {
        if (error instanceof Error && error.name === 'JwtTokenExpired') {
            throw new KNOWN_ERROR("EXPIRED", "EXPIRED_TOKEN");
        }
        console.error("Error decrypting and verifying JWT:");
        console.error(error);
        throw new KNOWN_ERROR("INVALID TOKEN", "INVALID_TOKEN");
    }
};