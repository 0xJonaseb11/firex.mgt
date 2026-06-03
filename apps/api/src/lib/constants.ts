import config from "@api/config";

export const __prod__ = config.isProduction;

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL = "30d";
export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;
export const OVERDUE_GRACE_HOURS = 24;
