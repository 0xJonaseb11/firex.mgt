import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
