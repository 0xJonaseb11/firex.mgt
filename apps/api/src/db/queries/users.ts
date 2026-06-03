import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@api/db";
import type { NewUser, User } from "@api/db/schema";
import { users } from "@api/db/schema";
import { ApiError } from "@api/lib/errors";

export async function createUser(data: NewUser): Promise<User> {
	const [user] = await db.insert(users).values(data).returning();
	if (!user) {
		throw new ApiError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create user",
		});
	}
	return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
	const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
	return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1);
	return user;
}

export async function updateUser(
	id: string,
	updates: Partial<
		Pick<User, "firstName" | "lastName" | "email" | "password" | "role">
	>,
): Promise<User | undefined> {
	const [user] = await db
		.update(users)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning();
	return user;
}

export async function revokeRefreshTokens(userId: string): Promise<void> {
	await db
		.update(users)
		.set({
			refreshTokenVersion: sql`${users.refreshTokenVersion} + 1`,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId));
}

export async function listUsers(): Promise<User[]> {
	return db.select().from(users).orderBy(users.createdAt);
}

export async function listInspectors(): Promise<User[]> {
	return db
		.select()
		.from(users)
		.where(inArray(users.role, ["inspector", "admin"]))
		.orderBy(users.lastName, users.firstName);
}

export async function deleteUser(id: string): Promise<boolean> {
	const result = await db.delete(users).where(eq(users.id, id)).returning();
	return result.length > 0;
}
