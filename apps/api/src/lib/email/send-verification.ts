import {
	createEmailVerificationToken,
	deleteEmailVerificationTokensForUser,
} from "@api/db/queries";
import type { User } from "@api/db/schema";
import { EMAIL_VERIFICATION_TTL_MS } from "@api/lib/constants";
import { sendEmail } from "@api/lib/email/client";
import { appUrl, verificationEmail } from "@api/lib/email/templates";
import { hashResetTokenLookup } from "@api/lib/password";
import { generateId, generateResetToken } from "@api/utils/generate-id";
import logger from "@api/utils/logger";

export async function sendAccountVerificationEmail(user: User): Promise<void> {
	await deleteEmailVerificationTokensForUser(user.id);
	const token = generateResetToken();
	await createEmailVerificationToken({
		id: await generateId(),
		userId: user.id,
		tokenHash: hashResetTokenLookup(token),
		expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
	});

	const verifyUrl = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
	const content = verificationEmail(user.firstName, verifyUrl);

	await sendEmail({
		to: user.email,
		subject: content.subject,
		html: content.html,
		text: content.text,
	});

	logger.info("Verification email queued", { email: user.email });
}
