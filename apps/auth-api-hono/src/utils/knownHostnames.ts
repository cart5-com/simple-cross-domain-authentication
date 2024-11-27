
const KNOWN_HOSTNAMES = [
    "auth.cart5dev.com",
    "sample-store-1.com",
    "sample-store-2.com",
    // "unknown-store.com",
];

export const isKnownHost = async (host: string): Promise<boolean> => {
    // fake db check
    await new Promise(resolve => setTimeout(resolve, 100));
    return KNOWN_HOSTNAMES.includes(host);
};