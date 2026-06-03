import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer/index.js";

import config from "@api/config";
import { recordDevMail } from "@api/lib/email/dev-outbox";
import type { SendEmailInput } from "@api/lib/email/types";
import logger from "@api/utils/logger";

let transport: Transporter | null = null;
let smtpReady = false;

export function isSmtpConfigured(): boolean {
	return Boolean(config.smtpUser && config.smtpPass);
}

export function isSmtpReady(): boolean {
	return smtpReady;
}

export async function initSmtpTransport(): Promise<boolean> {
	if (!isSmtpConfigured()) {
		smtpReady = false;
		return false;
	}

	const nextTransport = nodemailer.createTransport({
		host: config.smtpHost,
		port: config.smtpPort,
		secure: config.smtpSecure,
		auth: {
			user: config.smtpUser,
			pass: config.smtpPass,
		},
	});

	try {
		await nextTransport.verify();
		transport = nextTransport;
		smtpReady = true;
		logger.info("SMTP transport ready (real inbox delivery)", {
			host: config.smtpHost,
			port: config.smtpPort,
			user: config.smtpUser,
			from: config.emailFrom,
		});
		return true;
	} catch (err) {
		transport = null;
		smtpReady = false;
		logger.warn(
			"SMTP login failed — API will still start; reset links use Dev mail / console until fixed",
			{
				user: config.smtpUser,
				error: err instanceof Error ? err.message : String(err),
				hint: "Use a Gmail App Password (16 chars), not your normal Gmail password. Google Account → Security → 2-Step Verification → App passwords.",
			},
		);
		return false;
	}
}

export async function sendViaSmtp(input: SendEmailInput): Promise<boolean> {
	if (!isSmtpConfigured()) {
		return false;
	}

	try {
		if (!smtpReady) {
			const ok = await initSmtpTransport();
			if (!ok || !transport) {
				return false;
			}
		}

		const info = await transport.sendMail({
			from: config.emailFrom,
			to: input.to,
			subject: input.subject,
			html: input.html,
			text: input.text,
		});

		logger.info("Email sent via SMTP", {
			to: input.to,
			subject: input.subject,
			messageId: info.messageId,
		});
		recordDevMail({ ...input, provider: "smtp" });
		return true;
	} catch (err) {
		logger.error("SMTP send failed", {
			to: input.to,
			subject: input.subject,
			error: err instanceof Error ? err.message : String(err),
		});
		return false;
	}
}
