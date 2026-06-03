import type { ExtinguisherBrief } from "@api/db/queries/extinguishers";
import { getExtinguishersByIds } from "@api/db/queries/extinguishers";
import { getUsersByIds } from "@api/db/queries/users";
import type { Inspection, MaintenanceLog, User } from "@api/db/schema";
import {
	serializeInspection,
	serializeMaintenance,
} from "@api/lib/serializers";

export type UserBrief = Pick<User, "id" | "firstName" | "lastName">;

function toUserBrief(user: User): UserBrief {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
	};
}

function pickUser(
	users: Map<string, User>,
	id: string | null | undefined,
): UserBrief | null {
	if (!id) {
		return null;
	}
	const user = users.get(id);
	return user ? toUserBrief(user) : null;
}

function pickExtinguisher(
	extinguishers: Map<string, ExtinguisherBrief>,
	id: string,
): ExtinguisherBrief | null {
	return extinguishers.get(id) ?? null;
}

export async function enrichInspections(items: Inspection[]) {
	const userIds = new Set<string>();
	const extinguisherIds = new Set<string>();

	for (const item of items) {
		userIds.add(item.scheduledBy);
		if (item.assignedInspectorId) {
			userIds.add(item.assignedInspectorId);
		}
		if (item.completedBy) {
			userIds.add(item.completedBy);
		}
		extinguisherIds.add(item.extinguisherId);
	}

	const [users, extinguishers] = await Promise.all([
		getUsersByIds([...userIds]),
		getExtinguishersByIds([...extinguisherIds]),
	]);

	return items.map((item) => ({
		...serializeInspection(item),
		scheduledBy: pickUser(users, item.scheduledBy),
		assignedInspector: pickUser(users, item.assignedInspectorId),
		completedBy: pickUser(users, item.completedBy),
		extinguisher: pickExtinguisher(extinguishers, item.extinguisherId),
	}));
}

export async function enrichInspection(item: Inspection) {
	return (await enrichInspections([item]))[0]!;
}

export async function enrichMaintenanceLogs(items: MaintenanceLog[]) {
	const userIds = new Set<string>();
	const extinguisherIds = new Set<string>();

	for (const item of items) {
		userIds.add(item.performedBy);
		extinguisherIds.add(item.extinguisherId);
	}

	const [users, extinguishers] = await Promise.all([
		getUsersByIds([...userIds]),
		getExtinguishersByIds([...extinguisherIds]),
	]);

	return items.map((item) => ({
		...serializeMaintenance(item),
		performedBy: pickUser(users, item.performedBy),
		extinguisher: pickExtinguisher(extinguishers, item.extinguisherId),
	}));
}

export async function enrichMaintenanceLog(item: MaintenanceLog) {
	return (await enrichMaintenanceLogs([item]))[0]!;
}
