import { Resend } from "resend";

import config from "@api/config";
import logger from "@api/utils/logger";

export interface SendEmailInput {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

let resendClient: Resend | null = null;

function getResend() {
	if (!config.resendApiKey) {
		return null;
	}
	resendClient ??= new Resend(config.resendApiKey);
	return resendClient;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
	const resend = getResend();

	if (!resend) {
		logger.info("Email (dev — no RESEND_API_KEY)", {
			to: input.to,
			subject: input.subject,
			textPreview: input.text ?? input.html.slice(0, 200),
		});
		return true;
	}

	const { error } = await resend.emails.send({
		from: config.emailFrom,
		to: input.to,
		subject: input.subject,
		html: input.html,
		text: input.text,
	});

	if (error) {
		logger.error("Failed to send email", { error, to: input.to, subject: input.subject });
		return false;
	}

	return true;
}
