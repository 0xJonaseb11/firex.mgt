import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve("apps/api/.env");

if (existsSync(envPath)) {
	console.log("apps/api/.env already exists. Edit it or delete it to regenerate.");
	process.exit(0);
}

const accessSecret = randomBytes(48).toString("base64url");
const refreshSecret = randomBytes(48).toString("base64url");

const template = `PORT=8080
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173

SUPABASE_URL=https://zwatjezmrbbslyirvrlm.supabase.co
SUPABASE_PROJECT_REF=zwatjezmrbbslyirvrlm
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=

ACCESS_TOKEN_SECRET=${accessSecret}
REFRESH_TOKEN_SECRET=${refreshSecret}
DOMAIN=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
`;

writeFileSync(envPath, template, "utf8");
console.log(`Created ${envPath}`);
console.log("Fill SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_DB_PASSWORD.");
console.log("Database password: Supabase Dashboard → Project Settings → Database.");
