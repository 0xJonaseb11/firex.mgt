import type { User } from "@api/db/schema";
import { serializeUser } from "@api/lib/serializers";

export type PublicUser = ReturnType<typeof serializeUser>;

export function sanitizeUser(user: User): PublicUser {
	return serializeUser(user);
}
