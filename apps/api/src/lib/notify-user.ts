import { createNotification } from "@api/db/queries";
import type { Notification } from "@api/db/schema";
import { sendEmail, type SendEmailInput } from "@api/lib/email/client";
import { generateId } from "@api/utils/generate-id";

type NotificationType = Notification["type"];

export interface NotifyUserInput {
	userId: string;
	title: string;
	message: string;
	type: NotificationType;
	relatedEntityType?: string | null;
	relatedEntityId?: string | null;
	email?: SendEmailInput | null;
}

export async function notifyUser(
	input: NotifyUserInput,
): Promise<Notification | undefined> {
	const notification = await createNotification({
		id: await generateId(),
		userId: input.userId,
		title: input.title,
		message: input.message,
		type: input.type,
		relatedEntityType: input.relatedEntityType ?? null,
		relatedEntityId: input.relatedEntityId ?? null,
	});

	if (input.email) {
		void sendEmail(input.email).catch(() => {});
	}

	return notification;
}
