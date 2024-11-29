export const SESSION_COOKIE_NAME = `auth_session`;
export const GOOGLE_OAUTH_COOKIE_NAME = `google_oauth_token`;
export const OTP_COOKIE_NAME = "otp_token";
export const TWO_FACTOR_AUTH_COOKIE_NAME = "two_factor_auth_token";
export const localDbPath = "file:./sqlite.db";
export const SESSION_EXPIRES_IN = 2592000000; //1000 * 60 * 60 * 24 * 30; // 30 days
export const SESSION_ACTIVE_PERIOD_EXPIRATION_IN = 1296000000; //1000 * 60 * 60 * 24 * 15; // 15 days
export const CROSS_DOMAIN_SESSION_EXPIRES_IN = 600000; // 10 minutes
