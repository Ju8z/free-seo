import { useCallback, useRef, useState } from "react";
import type { AuditReport } from "../../../shared/types";
import { requestAudit } from "../api/audit";

export interface UseAuditState {
	audit: AuditReport | null;
	error: string;
	isLoading: boolean;
}

export interface UseAuditActions {
	runAudit: (input: string) => Promise<void>;
	clearError: () => void;
}

export function useAudit(): UseAuditState & UseAuditActions {
	const [audit, setAudit] = useState<AuditReport | null>(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const abortRef = useRef<AbortController | null>(null);
	
	const runAudit = useCallback(async(input: string) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		
		setIsLoading(true);
		setError("");
		
		try {
			const result = await requestAudit(input, controller.signal);
			setAudit(result);
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") {
				return;
			}
			setAudit(null);
			setError(
				err instanceof Error
					? err.message
					: "The audit could not be completed.",
			);
		} finally {
			if (abortRef.current === controller) {
				abortRef.current = null;
			}
			setIsLoading(false);
		}
	}, []);
	
	const clearError = useCallback(() => setError(""), []);
	
	return { audit, error, isLoading, runAudit, clearError };
}
