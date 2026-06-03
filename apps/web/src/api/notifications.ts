import { apiRequest } from "@web/api/client";
import type { NotificationItem, NotificationsResponse } from "@web/api/types";

type ListResponse = {
	items: NotificationItem[];
	unreadCount: number;
};

export const notificationsApi = {
	async list() {
		const response = await apiRequest<ListResponse>("/notifications");
		return {
			unreadCount: response.unreadCount,
			items: response.items,
		} satisfies NotificationsResponse;
	},

	markRead(id: string) {
		return apiRequest<void>(`/notifications/${id}/read`, {
			method: "PATCH",
		});
	},
};
