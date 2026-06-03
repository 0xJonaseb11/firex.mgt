import { getUserById } from "@api/db/queries";
import type { FireExtinguisher, MaintenanceLog } from "@api/db/schema";
import { appUrl, maintenanceLoggedEmail } from "@api/lib/email/templates";
import { notifyUser } from "@api/lib/notify-user";

export async function notifyMaintenanceLogged(
	log: MaintenanceLog,
	extinguisher: FireExtinguisher,
) {
	const owner = await getUserById(extinguisher.createdBy);
	if (!owner) {
		return;
	}

	const url = appUrl(`/extinguishers/${extinguisher.id}`);
	const emailContent = maintenanceLoggedEmail(
		owner.firstName,
		extinguisher.serialNumber,
		log.actionTaken,
		url,
	);

	await notifyUser({
		userId: owner.id,
		title: "Maintenance logged",
		message: `Maintenance was logged for ${extinguisher.serialNumber}`,
		type: "maintenance_logged",
		relatedEntityType: "maintenance",
		relatedEntityId: log.id,
		email: {
			to: owner.email,
			subject: emailContent.subject,
			html: emailContent.html,
			text: emailContent.text,
		},
	});
}
