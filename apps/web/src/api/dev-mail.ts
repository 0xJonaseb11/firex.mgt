import { apiRequest } from "@web/api/client";

export interface DevMailEntry {
	id: string;
	to: string;
	subject: string;
	html: string;
	text?: string;
	provider: string;
	previewUrl?: string;
	createdAt: string;
}

export const devMailApi = {
	list() {
		return apiRequest<{ items: DevMailEntry[] }>("/dev/mail");
	},
};
