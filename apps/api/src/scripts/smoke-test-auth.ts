/**
 * Quick smoke test: login + authenticated POST (requires running API + valid .env).
 * Usage: npx tsx src/scripts/smoke-test-auth.ts <email> <password>
 */
import config from "@api/config";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
	console.error("Usage: npx tsx src/scripts/smoke-test-auth.ts <email> <password>");
	process.exit(1);
}

const base = `http://localhost:${config.port}/api`;

async function main() {
	const loginRes = await fetch(`${base}/auth/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password }),
		credentials: "include",
	});
	const loginBody = await loginRes.json();
	console.log("login", loginRes.status, loginBody);

	if (!loginRes.ok) {
		process.exit(1);
	}

	const cookie = loginRes.headers.get("set-cookie") ?? "";

	const createRes = await fetch(`${base}/extinguishers`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			cookie,
		},
		body: JSON.stringify({
			serialNumber: `SMOKE-${Date.now()}`,
			location: "Smoke test",
			type: "water",
			size: "5 lbs.",
			installationDate: "2026-06-01",
			expiryDate: "2028-06-01",
			status: "active",
		}),
	});

	const createBody = await createRes.json();
	console.log("create extinguisher", createRes.status, createBody);

	if (!createRes.ok) {
		process.exit(1);
	}

	console.log("OK — auth and create extinguisher succeeded");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
