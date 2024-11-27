
export class KNOWN_ERROR extends Error {
    type: string;
    code: string;
    constructor(message: string, code: string) {
        super(message);
        this.type = "KNOWN_ERROR";
        this.code = code;
    }
}

export type ErrorType = {
    message?: string;
    issues?: {
        message: string;
        path: string[];
    }[];
} | null;
