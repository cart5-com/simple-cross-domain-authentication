import { decodeBase64, encodeBase64 } from "@oslojs/encoding";  // Make sure encodeBase64 is imported
import { createCipheriv, createDecipheriv } from "crypto";
import { DynamicBuffer } from "@oslojs/binary";
import { getEnvironmentVariable } from "./getEnvironmentVariable";

const ENCRYPTION_KEY = decodeBase64(getEnvironmentVariable("ENCRYPTION_KEY"));

export function encryptAesGcm(data: Uint8Array): Uint8Array {
	const iv = new Uint8Array(16);
	crypto.getRandomValues(iv);
	const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
	const encrypted = new DynamicBuffer(0);
	encrypted.write(iv);
	encrypted.write(cipher.update(data));
	encrypted.write(cipher.final());
	encrypted.write(cipher.getAuthTag());
	return encrypted.bytes();
}

export function encryptString(data: string): Uint8Array {
	return encryptAesGcm(new TextEncoder().encode(data));
}

export function decryptAesGcm(encrypted: Uint8Array): Uint8Array {
	if (encrypted.byteLength < 33) {
		throw new Error("Invalid data");
	}
	const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, encrypted.slice(0, 16));
	decipher.setAuthTag(encrypted.slice(encrypted.byteLength - 16));
	const decrypted = new DynamicBuffer(0);
	decrypted.write(decipher.update(encrypted.slice(16, encrypted.byteLength - 16)));
	decrypted.write(decipher.final());
	return decrypted.bytes();
}

export function decryptToString(data: Uint8Array): string {
	return new TextDecoder().decode(decryptAesGcm(data));
}

export function encrypt(data: string): string {
	const encrypted = encryptString(data);
	return encodeBase64(encrypted);
}

export function decrypt(data: string): string {
	const encryptedBytes = decodeBase64(data);
	return decryptToString(encryptedBytes);
}