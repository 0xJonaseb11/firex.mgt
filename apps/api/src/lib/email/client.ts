import { Resend } from "resend";

import config from "@api/config";
import { recordDevMail } from "@api/lib/email/dev-outbox";
import { sendViaEthereal, initEtherealTransport } from "@api/lib/email/ethereal";
import {
	initSmtpTransport,
	isSmtpConfigured,
	sendViaSmtp,
} from "@api/lib/email/smtp";
import type { SendEmailInput } from "@api/lib/email/types";
import logger from "@api/utils/logger";

export type { SendEmailInput } from "@api/lib/email/types";

let resendClient: Resend | null = null;

function getResend() {
	if (!config.resendApiKey) {
		return null;
	}
	resendClient ??= new Resend(config.resendApiKey);
	return resendClient;
}

async function sendViaBrevo(input: SendEmailInput): Promise<boolean> {
	if (!config.brevoApiKey || !config.brevoSenderEmail) {
		return false;
	}

	const response = await fetch("https://api.brevo.com/v3/smtp/email", {
		method: "POST",
		headers: {
			"api-key": config.brevoApiKey,
			"content-type": "application/json",
			accept: "application/json",
		},
		body: JSON.stringify({
			sender: {
				name: config.brevoSenderName,
				email: config.brevoSenderEmail,
			},
			to: [{ email: input.to }],
			subject: input.subject,
			htmlContent: input.html,
			textContent: input.text,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		logger.error("Failed to send email via Brevo", {
			to: input.to,
			subject: input.subject,
			status: response.status,
			body,
		});
		return false;
	}

	logger.info("Email sent via Brevo", {
		to: input.to,
		subject: input.subject,
	});
	recordDevMail({ ...input, provider: "brevo" });
	return true;
}

async function sendViaResend(input: SendEmailInput): Promise<boolean> {
	const resend = getResend();
	if (!resend) {
		return false;
	}

	const { data, error } = await resend.emails.send({
		from: config.emailFrom,
		to: input.to,
		subject: input.subject,
		html: input.html,
		text: input.text,
	});

	if (error) {
		logger.error("Failed to send email via Resend", {
			to: input.to,
			subject: input.subject,
			message: error.message,
			name: error.name,
		});
		return false;
	}

	logger.info("Email sent via Resend", {
		to: input.to,
		subject: input.subject,
		id: data?.id,
	});
	recordDevMail({ ...input, provider: "resend" });
	return true;
}

function extractLinkFromContent(input: SendEmailInput): string | undefined {
	const source = input.text ?? input.html;
	const match = source.match(/https?:\/\/[^\s<"]+/);
	return match?.[0];
}

function logConsoleFallback(input: SendEmailInput): boolean {
	const previewUrl = extractLinkFromContent(input);
	logger.warn("Email captured for dev demo (open Dev mail in app or use link below)", {
		to: input.to,
		subject: input.subject,
		previewUrl,
		textPreview: input.text ?? input.html.slice(0, 400),
	});
	recordDevMail({ ...input, provider: "console", previewUrl });
	return config.isDevelopment;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
	const provider = config.emailProvider;

	if (provider === "ethereal") {
		const sent = await sendViaEthereal(input);
		return sent || logConsoleFallback(input);
	}

	if (
		provider === "smtp" ||
		(provider === "auto" && isSmtpConfigured())
	) {
		const sent = await sendViaSmtp(input);
		if (sent) {
			return true;
		}
		if (provider === "smtp") {
			return logConsoleFallback(input);
		}
	}

	if (provider === "brevo" || (provider === "auto" && config.brevoApiKey)) {
		const sent = await sendViaBrevo(input);
		if (sent) {
			return true;
		}
		if (provider === "brevo") {
			return logConsoleFallback(input);
		}
	}

	if (provider === "resend" || (provider === "auto" && config.resendApiKey)) {
		const sent = await sendViaResend(input);
		if (sent) {
			return true;
		}
	}

	// Exam-friendly default: Ethereal needs no phone or API signup
	if (provider === "auto" && config.isDevelopment) {
		return sendViaEthereal(input);
	}

	return logConsoleFallback(input);
}

export async function bootstrapEmailTransport(): Promise<void> {
	if (
		config.emailProvider === "smtp" ||
		(config.emailProvider === "auto" && isSmtpConfigured())
	) {
		await initSmtpTransport().catch(() => false);
		return;
	}

	if (
		config.emailProvider === "ethereal" ||
		(config.emailProvider === "auto" &&
			config.isDevelopment &&
			!config.brevoApiKey &&
			!config.resendApiKey &&
			!isSmtpConfigured())
	) {
		await initEtherealTransport();
	}
}
