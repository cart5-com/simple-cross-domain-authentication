import { encodeBase32 } from "@oslojs/encoding";

export function generateSessionToken(): string {
    const tokenBytes = new Uint8Array(20);
    crypto.getRandomValues(tokenBytes);
    return encodeBase32(tokenBytes).toLowerCase();
}