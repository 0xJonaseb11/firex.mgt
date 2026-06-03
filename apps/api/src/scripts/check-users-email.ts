import { grandfatherExistingUserEmails } from "@api/db/queries";
import { db } from "@api/db";
import { users } from "@api/db/schema";

const rows = await db
	.select({
		email: users.email,
		role: users.role,
		emailVerified: users.emailVerified,
		createdAt: users.createdAt,
	})
	.from(users);

console.log("Before grandfather:", rows);
const count = await grandfatherExistingUserEmails();
const after = await db
	.select({
		email: users.email,
		role: users.role,
		emailVerified: users.emailVerified,
	})
	.from(users);
console.log("Grandfathered:", count);
console.log("After:", after);
process.exit(0);
