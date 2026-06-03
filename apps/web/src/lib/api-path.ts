const rawBase = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE = (rawBase ?? "/api").replace(/\/$/, "");

export function apiPath(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE}${normalized}`;
}
