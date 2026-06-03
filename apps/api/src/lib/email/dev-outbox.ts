import type { SendEmailInput } from "@api/lib/email/types";

export interface DevMailEntry extends SendEmailInput {
	id: string;
	provider: string;
	previewUrl?: string;
	createdAt: string;
}

const MAX_ENTRIES = 50;
const outbox: DevMailEntry[] = [];

export function recordDevMail(
	entry: SendEmailInput & { provider: string; previewUrl?: string },
): void {
	outbox.unshift({
		id: crypto.randomUUID(),
		...entry,
		createdAt: new Date().toISOString(),
	});
	if (outbox.length > MAX_ENTRIES) {
		outbox.length = MAX_ENTRIES;
	}
}

export function listDevMail(): DevMailEntry[] {
	return [...outbox];
}
