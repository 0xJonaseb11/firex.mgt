import { and, eq, inArray, lt } from "drizzle-orm";

import { db } from "@api/db";
import { users } from "@api/db/schema";
import logger from "@api/utils/logger";

/** Accounts created before email verification shipped (2026-06-03 UTC). */
const EMAIL_VERIFICATION_ROLLOUT = new Date("2026-06-03T12:00:00.000Z");

/**
 * One-time style fix: pre-rollout accounts and staff roles stay verified so
 * demos and existing marker logins keep working without re-registering.
 */
export async function grandfatherExistingUserEmails(): Promise<number> {
	const updated = await db
		.update(users)
		.set({ emailVerified: true, updatedAt: new Date() })
		.where(
			and(
				eq(users.emailVerified, false),
				lt(users.createdAt, EMAIL_VERIFICATION_ROLLOUT),
			),
		)
		.returning({ id: users.id });

	const staff = await db
		.update(users)
		.set({ emailVerified: true, updatedAt: new Date() })
		.where(
			and(
				eq(users.emailVerified, false),
				inArray(users.role, ["admin", "inspector"]),
			),
		)
		.returning({ id: users.id });

	const total = updated.length + staff.length;
	if (total > 0) {
		logger.info("Grandfathered user emails as verified", {
			preRollout: updated.length,
			staff: staff.length,
		});
	}

	return total;
}
