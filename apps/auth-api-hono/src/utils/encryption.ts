import { getEnvironmentVariable } from "./getEnvironmentVariable";
// check environment variable
const key = getEnvironmentVariable("ENCRYPTION_KEY");

const IV_LENGTH = 16; // Updated to 16 bytes
async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
	const rawKey = base64ToUint8Array(base64Key);
	if (rawKey.length !== 32) {
		throw new Error('Key must be exactly 32 bytes (256 bits)');
	}
	return await crypto.subtle.importKey(
		'raw',
		rawKey,
		'AES-CTR',
		true,
		['encrypt', 'decrypt']
	);
}
export const encrypt = async (text: string, base64Key: string): Promise<string> => {
	const key = await importKeyFromBase64(base64Key);
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

	const encodedText = new TextEncoder().encode(text);
	const encryptedBuffer = await crypto.subtle.encrypt(
		{ name: 'AES-CTR', counter: iv, length: 64 },
		key,
		encodedText
	);

	const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(encryptedBuffer), iv.length);

	return uint8ArrayToBase64(result);
};

export const decrypt = async (encryptedText: string, base64Key: string): Promise<string> => {
	if (!encryptedText) {
		throw new Error('No encrypted text provided');
	}
	const encryptedArray = base64ToUint8Array(encryptedText);
	const iv = encryptedArray.slice(0, IV_LENGTH);
	const data = encryptedArray.slice(IV_LENGTH);

	const key = await importKeyFromBase64(base64Key);
	const decryptedBuffer = await crypto.subtle.decrypt(
		{ name: 'AES-CTR', counter: iv, length: 64 },
		key,
		data
	);

	return new TextDecoder().decode(decryptedBuffer);
};

// Helper functions for Base64 encoding/decoding
function uint8ArrayToBase64(array: Uint8Array): string {
	return btoa(String.fromCharCode.apply(null, array as unknown as number[]));
}

function base64ToUint8Array(base64: string): Uint8Array {
	const binaryString = atob(base64);
	return new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
}
