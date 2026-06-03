import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer/index.js";

import type { SendEmailInput } from "@api/lib/email/types";
import { recordDevMail } from "@api/lib/email/dev-outbox";
import logger from "@api/utils/logger";

let transporter: Transporter | null = null;
let fromAddress = "noreply@tzw-fire.test";

export async function initEtherealTransport(): Promise<void> {
	if (transporter) {
		return;
	}

	const testAccount = await nodemailer.createTestAccount();
	transporter = nodemailer.createTransport({
		host: testAccount.smtp.host,
		port: testAccount.smtp.port,
		secure: testAccount.smtp.secure,
		auth: {
			user: testAccount.user,
			pass: testAccount.pass,
		},
	});
	fromAddress = testAccount.user;

	logger.info("Ethereal test email ready (no phone signup required)", {
		inbox: "https://ethereal.email",
		smtpUser: testAccount.user,
	});
}

export async function sendViaEthereal(input: SendEmailInput): Promise<boolean> {
	try {
		if (!transporter) {
			await initEtherealTransport();
		}

		const info = await transporter!.sendMail({
			from: `"TZW Fire Safety" <${fromAddress}>`,
			to: input.to,
			subject: input.subject,
			html: input.html,
			text: input.text,
		});

		const previewUrl = nodemailer.getTestMessageUrl(info) ?? undefined;

		logger.info("Email sent via Ethereal — open preview to view", {
			to: input.to,
			subject: input.subject,
			previewUrl,
		});

		recordDevMail({ ...input, previewUrl, provider: "ethereal" });
		return true;
	} catch (err) {
		logger.error("Ethereal send failed", {
			to: input.to,
			subject: input.subject,
			error: err instanceof Error ? err.message : String(err),
		});
		return false;
	}
}
