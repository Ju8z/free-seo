import { useCallback, useRef, useState } from "react";
import type { AuditCategoryId, AuditReport } from "../../../shared/types";
import { requestAudit } from "../api/audit";

export interface UseAuditState {
	audit: AuditReport | null;
	error: string;
	isLoading: boolean;
	durationMs: number | null;
}

export interface UseAuditActions {
	runAudit: (input: string, categories: AuditCategoryId[]) => Promise<void>;
	clearError: () => void;
}

export function useAudit(): UseAuditState & UseAuditActions {
	const [audit, setAudit] = useState<AuditReport | null>(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [durationMs, setDurationMs] = useState<number | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	
	const runAudit = useCallback(async(input: string, categories: AuditCategoryId[]) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		
		setIsLoading(true);
		setError("");
		setDurationMs(null);
		const startedAt = performance.now();
		
		try {
			const result = await requestAudit(input, categories, controller.signal);
			setAudit(result);
			setDurationMs(performance.now() - startedAt);
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
	
	return { audit, error, isLoading, durationMs, runAudit, clearError };
}
