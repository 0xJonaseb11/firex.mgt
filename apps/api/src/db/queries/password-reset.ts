import { eq } from "drizzle-orm";

import { db } from "@api/db";
import { passwordResetTokens } from "@api/db/schema";
import { hashResetTokenLookup } from "@api/lib/password";

export async function createPasswordResetToken(data: {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
}) {
	const [record] = await db
		.insert(passwordResetTokens)
		.values(data)
		.returning();
	return record;
}

export async function deletePasswordResetTokensForUser(
	userId: string,
): Promise<void> {
	await db
		.delete(passwordResetTokens)
		.where(eq(passwordResetTokens.userId, userId));
}

export async function findValidPasswordResetToken(
	token: string,
): Promise<(typeof passwordResetTokens.$inferSelect) | undefined> {
	const tokenHash = hashResetTokenLookup(token);
	const now = new Date();
	const [record] = await db
		.select()
		.from(passwordResetTokens)
		.where(eq(passwordResetTokens.tokenHash, tokenHash))
		.limit(1);

	if (!record || record.expiresAt <= now) {
		return undefined;
	}
	return record;
}

export async function deletePasswordResetToken(id: string): Promise<void> {
	await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, id));
}
