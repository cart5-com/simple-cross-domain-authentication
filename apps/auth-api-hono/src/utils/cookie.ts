export interface CookieAttributes {
    secure?: boolean;
    path?: string;
    domain?: string;
    sameSite?: "lax" | "strict" | "none";
    httpOnly?: boolean;
    maxAge?: number;
    expires?: Date;
}

function serializeCookieFunc(name: string, value: string, attributes: CookieAttributes): string {
    const keyValueEntries: Array<[string, string] | [string]> = [];
    keyValueEntries.push([encodeURIComponent(name), encodeURIComponent(value)]);
    if (attributes?.domain !== undefined) {
        keyValueEntries.push(["Domain", attributes.domain]);
    }
    if (attributes?.expires !== undefined) {
        keyValueEntries.push(["Expires", attributes.expires.toUTCString()]);
    }
    if (attributes?.httpOnly) {
        keyValueEntries.push(["HttpOnly"]);
    }
    if (attributes?.maxAge !== undefined) {
        keyValueEntries.push(["Max-Age", attributes.maxAge.toString()]);
    }
    if (attributes?.path !== undefined) {
        keyValueEntries.push(["Path", attributes.path]);
    }
    if (attributes?.sameSite === "lax") {
        keyValueEntries.push(["SameSite", "Lax"]);
    }
    if (attributes?.sameSite === "none") {
        keyValueEntries.push(["SameSite", "None"]);
    }
    if (attributes?.sameSite === "strict") {
        keyValueEntries.push(["SameSite", "Strict"]);
    }
    if (attributes?.secure) {
        keyValueEntries.push(["Secure"]);
    }
    return keyValueEntries.map((pair) => pair.join("=")).join("; ");
}


export function parseCookies(header: string): Map<string, string> {
    const cookies = new Map<string, string>();
    const items = header.split("; ");
    for (const item of items) {
        const pair = item.split("=");
        const rawKey = pair[0];
        const rawValue = pair[1] ?? "";
        if (!rawKey) continue;
        cookies.set(decodeURIComponent(rawKey), decodeURIComponent(rawValue));
    }
    return cookies;
}

export function serializeCookie(name: string, value: string, attributes: CookieAttributes): string {
    return serializeCookieFunc(name, value, attributes);
}
