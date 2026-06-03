import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@api/db";
import type { Notification } from "@api/db/schema";
import { notifications } from "@api/db/schema";

export async function createNotification(
	data: typeof notifications.$inferInsert,
): Promise<Notification> {
	const [record] = await db.insert(notifications).values(data).returning();
	if (!record) {
		throw new Error("Failed to create notification");
	}
	return record;
}

export async function listNotificationsForUser(
	userId: string,
	page = 1,
	limit = 20,
	unreadOnly = false,
): Promise<{ items: Notification[]; total: number }> {
	const offset = (page - 1) * limit;
	const conditions = unreadOnly
		? and(eq(notifications.userId, userId), eq(notifications.read, false))
		: eq(notifications.userId, userId);

	const items = await db
		.select()
		.from(notifications)
		.where(conditions)
		.orderBy(desc(notifications.createdAt))
		.limit(limit)
		.offset(offset);

	const countRow = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(conditions);

	return { items, total: countRow[0]?.count ?? 0 };
}

export async function markNotificationRead(
	id: string,
	userId: string,
): Promise<Notification | undefined> {
	const [record] = await db
		.update(notifications)
		.set({ read: true })
		.where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
		.returning();
	return record;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
	const result = await db
		.update(notifications)
		.set({ read: true })
		.where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
		.returning();
	return result.length;
}

export async function getUnreadCount(userId: string): Promise<number> {
	const countRow = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
	return countRow[0]?.count ?? 0;
}
