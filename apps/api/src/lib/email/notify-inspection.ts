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

type AssignmentContext = {
	isAssignedToRecipient: boolean;
	assignmentHtml: string;
	inAppPrefix: string;
};

async function formatInspectorName(userId: string | null): Promise<string | null> {
	if (!userId) {
		return null;
	}
	const user = await getUserById(userId);
	if (!user) {
		return null;
	}
	return `${user.firstName} ${user.lastName}`.trim();
}

function buildAssignmentContext(
	inspection: Inspection,
	recipientId: string,
	assignedInspectorName: string | null,
): AssignmentContext {
	const isAssignedToRecipient =
		inspection.assignedInspectorId === recipientId;
	const isScheduler = inspection.scheduledBy === recipientId;

	if (isAssignedToRecipient) {
		return {
			isAssignedToRecipient: true,
			assignmentHtml:
				'<p style="padding:12px 14px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;margin:16px 0"><strong>This inspection is assigned to you.</strong> Please complete it by the scheduled date and time.</p>',
			inAppPrefix: "Assigned to you: ",
		};
	}

	if (isScheduler && assignedInspectorName) {
		return {
			isAssignedToRecipient: false,
			assignmentHtml: `<p>You scheduled this inspection. It is <strong>assigned to ${assignedInspectorName}</strong>.</p>`,
			inAppPrefix: `You scheduled (assigned to ${assignedInspectorName}): `,
		};
	}

	if (isScheduler && !inspection.assignedInspectorId) {
		return {
			isAssignedToRecipient: false,
			assignmentHtml:
				"<p>You scheduled this inspection. It is <strong>not yet assigned</strong> to a specific inspector — it appears in the open inspector queue.</p>",
			inAppPrefix: "You scheduled (open queue): ",
		};
	}

	if (!inspection.assignedInspectorId) {
		return {
			isAssignedToRecipient: false,
			assignmentHtml:
				'<p style="padding:12px 14px;background:#f9fafb;border-left:4px solid #6b7280;border-radius:4px;margin:16px 0">This inspection is in the <strong>open queue</strong> (not assigned to a specific inspector yet). Any inspector may complete it.</p>',
			inAppPrefix: "Open queue: ",
		};
	}

	return {
		isAssignedToRecipient: false,
		assignmentHtml: `<p>This inspection is assigned to <strong>${assignedInspectorName ?? "another inspector"}</strong>, not to you.</p>`,
		inAppPrefix: `Assigned to ${assignedInspectorName ?? "another inspector"}: `,
	};
}

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
	const assignedInspectorName = await formatInspectorName(
		inspection.assignedInspectorId,
	);

	const recipients = new Set<string>([...inspectorIds, inspection.scheduledBy]);

	for (const userId of recipients) {
		const ctx = buildAssignmentContext(
			inspection,
			userId,
			assignedInspectorName,
		);
		const email = await emailForUser(userId, (firstName) =>
			inspectionScheduledEmail(
				firstName,
				details,
				ctx.assignmentHtml,
				inspectionUrl,
				ctx.isAssignedToRecipient,
			),
		);
		await notifyUser({
			userId,
			title: ctx.isAssignedToRecipient
				? "Inspection assigned to you"
				: "Inspection scheduled",
			message: `${ctx.inAppPrefix}Inspection for ${extinguisher.serialNumber} on ${inspection.scheduledDate} at ${inspection.scheduledTime}`,
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
	const assignedInspectorName = await formatInspectorName(
		inspection.assignedInspectorId,
	);

	const notifyIds = new Set<string>([inspection.scheduledBy]);
	if (inspection.assignedInspectorId) {
		notifyIds.add(inspection.assignedInspectorId);
	}

	for (const userId of notifyIds) {
		const ctx = buildAssignmentContext(
			inspection,
			userId,
			assignedInspectorName,
		);
		const email = await emailForUser(userId, (firstName) =>
			inspectionCompletedEmail(firstName, serial, url),
		);
		await notifyUser({
			userId,
			title: "Inspection completed",
			message: `${ctx.inAppPrefix}Inspection for ${serial} was completed`,
			type: "inspection_completed",
			relatedEntityType: "inspection",
			relatedEntityId: inspection.id,
			email,
		});
	}
}

export async function notifyInspectionOverdue(
	inspection: Inspection,
	extinguisher: FireExtinguisher | undefined,
	inspectorIds: string[],
) {
	const serial = extinguisher?.serialNumber ?? "extinguisher";
	const url = appUrl("/inspections");
	const assignedInspectorName = await formatInspectorName(
		inspection.assignedInspectorId,
	);

	for (const userId of inspectorIds) {
		const ctx = buildAssignmentContext(
			inspection,
			userId,
			assignedInspectorName,
		);
		const email = await emailForUser(userId, (firstName) =>
			inspectionOverdueEmail(
				firstName,
				serial,
				inspection.scheduledDate,
				ctx.assignmentHtml,
				url,
				ctx.isAssignedToRecipient,
			),
		);
		await notifyUser({
			userId,
			title: ctx.isAssignedToRecipient
				? "Your inspection is overdue"
				: "Inspection overdue",
			message: `${ctx.inAppPrefix}Inspection for ${serial} on ${inspection.scheduledDate} is overdue`,
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
	const assignedInspectorName = await formatInspectorName(
		inspection.assignedInspectorId,
	);

	for (const userId of recipientIds) {
		const ctx = buildAssignmentContext(
			inspection,
			userId,
			assignedInspectorName,
		);
		const email = await emailForUser(userId, (firstName) =>
			inspectionCancelledEmail(
				firstName,
				serial,
				reason,
				ctx.assignmentHtml,
				url,
			),
		);
		await notifyUser({
			userId,
			title: "Inspection cancelled",
			message: `${ctx.inAppPrefix}Inspection for ${serial} was cancelled`,
			type: "general",
			relatedEntityType: "inspection",
			relatedEntityId: inspection.id,
			email,
		});
	}
}
