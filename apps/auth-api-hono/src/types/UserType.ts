export interface User {
    id: string;
    email: string;
    isEmailVerified: boolean;
    name: string;
}

export type TwoFactorAuthVerifyPayload = {
    userId: string,
    email: string,
    nonce: string,
}