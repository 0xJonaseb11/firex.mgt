import { getUserById } from "@api/db/queries";
import type { FireExtinguisher, Inspection } from "@api/db/schema";
import {
	appUrl,
	inspectionCancelledEmail,
	inspectionCompletedEmail,
	inspectionOverdueEmail,
	inspectionScheduledEmail,
} from "@api/lib/email/templates";
import { notifyUser } from "@api/lib/notify-user";

async function emailForUser(
	userId: string,
	build: (
		firstName: string,
	) => { subject: string; html: string; text?: string },
) {
	const user = await getUserById(userId);
	if (!user?.email) {
		return null;
	}
	const content = build(user.firstName);
	return {
		to: user.email,
		...content,
	};
}

export async function notifyInspectionScheduled(
	inspection: Inspection,
	extinguisher: FireExtinguisher,
	inspectorIds: string[],
) {
	const inspectionUrl = appUrl("/inspections");
	const details = {
		serialNumber: extinguisher.serialNumber,
		location: extinguisher.location,
		scheduledDate: inspection.scheduledDate,
		scheduledTime: inspection.scheduledTime,
	};

	for (const userId of inspectorIds) {
		const email = await emailForUser(userId, (firstName) =>
			inspectionScheduledEmail(firstName, details, inspectionUrl),
		);
		await notifyUser({
			userId,
			title: "Inspection scheduled",
			message: `Inspection for ${extinguisher.serialNumber} on ${inspection.scheduledDate} at ${inspection.scheduledTime}`,
			type: "inspection_scheduled",
			relatedEntityType: "inspection",
			relatedEntityId: inspection.id,
			email,
		});
	}
}

export async function notifyInspectionCompleted(
	inspection: Inspection,
	extinguisher: FireExtinguisher | undefined,
) {
	const serial = extinguisher?.serialNumber ?? "extinguisher";
	const url = extinguisher
		? appUrl(`/extinguishers/${extinguisher.id}`)
		: appUrl("/inspections");
	const email = await emailForUser(inspection.scheduledBy, (firstName) =>
		inspectionCompletedEmail(firstName, serial, url),
	);
	await notifyUser({
		userId: inspection.scheduledBy,
		title: "Inspection completed",
		message: `Inspection for ${serial} was completed`,
		type: "inspection_completed",
		relatedEntityType: "inspection",
		relatedEntityId: inspection.id,
		email,
	});
}

export async function notifyInspectionOverdue(
	inspection: Inspection,
	extinguisher: FireExtinguisher | undefined,
	inspectorIds: string[],
) {
	const serial = extinguisher?.serialNumber ?? "extinguisher";
	const url = appUrl("/inspections");
	const message = `Inspection for ${serial} on ${inspection.scheduledDate} is overdue`;

	for (const userId of inspectorIds) {
		const email = await emailForUser(userId, (firstName) =>
			inspectionOverdueEmail(
				firstName,
				serial,
				inspection.scheduledDate,
				url,
			),
		);
		await notifyUser({
			userId,
			title: "Inspection overdue",
			message,
			type: "inspection_overdue",
			relatedEntityType: "inspection",
			relatedEntityId: inspection.id,
			email,
		});
	}
}

export async function notifyInspectionCancelled(
	inspection: Inspection,
	extinguisher: FireExtinguisher | undefined,
	recipientIds: string[],
) {
	const serial = extinguisher?.serialNumber ?? "extinguisher";
	const url = appUrl("/inspections");
	const reason = inspection.cancelReason ?? null;

	for (const userId of recipientIds) {
		const email = await emailForUser(userId, (firstName) =>
			inspectionCancelledEmail(firstName, serial, reason, url),
		);
		await notifyUser({
			userId,
			title: "Inspection cancelled",
			message: `Inspection for ${serial} was cancelled`,
			type: "general",
			relatedEntityType: "inspection",
			relatedEntityId: inspection.id,
			email,
		});
	}
}
