import config from "@api/config";

function layout(title: string, body: string, actionUrl?: string, actionLabel?: string) {
	const button =
		actionUrl && actionLabel
			? `<p style="margin:24px 0"><a href="${actionUrl}" style="display:inline-block;padding:12px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">${actionLabel}</a></p>
<p style="font-size:12px;color:#6b7280">Or copy this link: <a href="${actionUrl}">${actionUrl}</a></p>`
			: "";

	return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px">
  <p style="margin:0 0 8px;font-size:13px;color:#6b7280">TZW Fire Safety</p>
  <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
  ${body}
  ${button}
  <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb" />
  <p style="margin:0;font-size:12px;color:#9ca3af">This is an automated message from the TZW Fire Extinguisher Management System.</p>
</body>
</html>`;
}

export function verificationEmail(firstName: string, verifyUrl: string) {
	return {
		subject: "Confirm your TZW Fire Safety account",
		html: layout(
			"Confirm your email",
			`<p>Hi ${firstName},</p>
<p>Thanks for registering. Please confirm your email address to activate your account and sign in.</p>
<p>This link expires in 24 hours.</p>`,
			verifyUrl,
			"Confirm email",
		),
		text: `Hi ${firstName},\n\nConfirm your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
	};
}

export function passwordResetEmail(firstName: string, resetUrl: string) {
	return {
		subject: "Reset your TZW Fire Safety password",
		html: layout(
			"Password reset",
			`<p>Hi ${firstName},</p>
<p>We received a request to reset your password. If you did not request this, you can ignore this email.</p>
<p>This link expires in 1 hour.</p>`,
			resetUrl,
			"Reset password",
		),
		text: `Hi ${firstName},\n\nReset your password: ${resetUrl}\n\nExpires in 1 hour.`,
	};
}

export function inspectionScheduledEmail(
	firstName: string,
	details: {
		serialNumber: string;
		location: string;
		scheduledDate: string;
		scheduledTime: string;
	},
	assignmentHtml: string,
	inspectionUrl: string,
	isAssignedToRecipient: boolean,
) {
	const subjectPrefix = isAssignedToRecipient
		? "Assigned to you"
		: "Inspection scheduled";
	return {
		subject: `${subjectPrefix}: ${details.serialNumber}`,
		html: layout(
			isAssignedToRecipient ? "Inspection assigned to you" : "Inspection scheduled",
			`<p>Hi ${firstName},</p>
${assignmentHtml}
<p>Fire extinguisher <strong>${details.serialNumber}</strong> at ${details.location}.</p>
<ul>
  <li><strong>Date:</strong> ${details.scheduledDate}</li>
  <li><strong>Time:</strong> ${details.scheduledTime}</li>
</ul>`,
			inspectionUrl,
			"View inspections",
		),
		text: `Hi ${firstName}. ${stripHtml(assignmentHtml)} ${details.serialNumber} on ${details.scheduledDate} at ${details.scheduledTime}. ${inspectionUrl}`,
	};
}

export function inspectionCompletedEmail(
	firstName: string,
	serialNumber: string,
	extinguisherUrl: string,
) {
	return {
		subject: `Inspection completed: ${serialNumber}`,
		html: layout(
			"Inspection completed",
			`<p>Hi ${firstName},</p>
<p>The inspection for extinguisher <strong>${serialNumber}</strong> has been marked completed.</p>`,
			extinguisherUrl,
			"View extinguisher",
		),
		text: `Inspection completed for ${serialNumber}. ${extinguisherUrl}`,
	};
}

export function inspectionOverdueEmail(
	firstName: string,
	serialNumber: string,
	scheduledDate: string,
	assignmentHtml: string,
	inspectionUrl: string,
	isAssignedToRecipient: boolean,
) {
	return {
		subject: `${isAssignedToRecipient ? "Your inspection is overdue" : "Overdue inspection"}: ${serialNumber}`,
		html: layout(
			"Inspection overdue",
			`<p>Hi ${firstName},</p>
${assignmentHtml}
<p>The inspection for <strong>${serialNumber}</strong> scheduled on ${scheduledDate} is now <strong>overdue</strong>.</p>`,
			inspectionUrl,
			"View inspections",
		),
		text: `Overdue: ${serialNumber} (${scheduledDate}). ${stripHtml(assignmentHtml)} ${inspectionUrl}`,
	};
}

export function inspectionCancelledEmail(
	firstName: string,
	serialNumber: string,
	reason: string | null,
	assignmentHtml: string,
	inspectionUrl: string,
) {
	return {
		subject: `Inspection cancelled: ${serialNumber}`,
		html: layout(
			"Inspection cancelled",
			`<p>Hi ${firstName},</p>
${assignmentHtml}
<p>The inspection for <strong>${serialNumber}</strong> has been cancelled.</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`,
			inspectionUrl,
			"View inspections",
		),
		text: `Inspection cancelled for ${serialNumber}. ${stripHtml(assignmentHtml)}${reason ? ` Reason: ${reason}` : ""} ${inspectionUrl}`,
	};
}

export function maintenanceLoggedEmail(
	firstName: string,
	serialNumber: string,
	actionTaken: string,
	extinguisherUrl: string,
) {
	return {
		subject: `Maintenance logged: ${serialNumber}`,
		html: layout(
			"Maintenance recorded",
			`<p>Hi ${firstName},</p>
<p>Maintenance was logged for extinguisher <strong>${serialNumber}</strong>.</p>
<p><strong>Action:</strong> ${actionTaken}</p>`,
			extinguisherUrl,
			"View extinguisher",
		),
		text: `Maintenance logged for ${serialNumber}: ${actionTaken}. ${extinguisherUrl}`,
	};
}

export function appUrl(path: string) {
	return `${config.appPublicUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
