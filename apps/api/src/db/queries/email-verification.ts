import { eq } from "drizzle-orm";

import { db } from "@api/db";
import { emailVerificationTokens } from "@api/db/schema";
import { hashResetTokenLookup } from "@api/lib/password";

export async function createEmailVerificationToken(data: {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
}) {
	const [record] = await db
		.insert(emailVerificationTokens)
		.values(data)
		.returning();
	return record;
}

export async function deleteEmailVerificationTokensForUser(
	userId: string,
): Promise<void> {
	await db
		.delete(emailVerificationTokens)
		.where(eq(emailVerificationTokens.userId, userId));
}

export async function findValidEmailVerificationToken(
	token: string,
): Promise<(typeof emailVerificationTokens.$inferSelect) | undefined> {
	const tokenHash = hashResetTokenLookup(token);
	const now = new Date();
	const [record] = await db
		.select()
		.from(emailVerificationTokens)
		.where(eq(emailVerificationTokens.tokenHash, tokenHash))
		.limit(1);

	if (!record || record.expiresAt <= now) {
		return undefined;
	}
	return record;
}

export async function deleteEmailVerificationToken(id: string): Promise<void> {
	await db
		.delete(emailVerificationTokens)
		.where(eq(emailVerificationTokens.id, id));
}
