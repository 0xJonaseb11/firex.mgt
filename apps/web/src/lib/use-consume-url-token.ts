import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Reads a one-time token from the URL, then removes it from the address bar
 * so it is not left in browser history or shared accidentally.
 */
export function useConsumeUrlToken(param = "token"): string {
	const [searchParams, setSearchParams] = useSearchParams();
	const [token] = useState(() => searchParams.get(param) ?? "");

	useEffect(() => {
		if (!token) {
			return;
		}
		const next = new URLSearchParams(searchParams);
		next.delete(param);
		setSearchParams(next, { replace: true });
	}, [param, searchParams, setSearchParams, token]);

	return token;
}
