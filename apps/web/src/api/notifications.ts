import { apiRequest } from "@web/api/client";
import type { NotificationItem } from "@web/api/types";

type ListResponse = {
	items: NotificationItem[];
	total: number;
	unreadCount: number;
	page: number;
	limit: number;
};

export const notificationsApi = {
	async list(params?: { unreadOnly?: boolean }) {
		const query = params?.unreadOnly ? "?unreadOnly=true" : "";
		const response = await apiRequest<ListResponse>(`/notifications${query}`);
		return {
			unreadCount: response.unreadCount,
			items: response.items,
			raw: response,
		};
	},

	markRead(id: string) {
		return apiRequest<{ notification: NotificationItem }>(
			`/notifications/${id}/read`,
			{ method: "PATCH" },
		);
	},

	markAllRead() {
		return apiRequest<{ success: boolean; updated: number }>(
			"/notifications/read-all",
			{ method: "POST" },
		);
	},
};
