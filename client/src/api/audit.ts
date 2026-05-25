import type { AuditCategoryId, AuditReport, AuditRequest } from "../../../shared/types";

export interface AuditConfig {
	count: number;
	cooldownSeconds: number;
}

function normalizeAuditErrorMessage(message: string): string {
	const trimmed = message.trim();
	const genericMessageSet = new Set([
		"",
		"Audit failed",
		"The audit could not be completed.",
	]);

	if (genericMessageSet.has(trimmed)) {
		return "We couldn't complete the audit. The target site may be blocking automated requests, redirecting too many times, or returning a response we can't analyze right now.";
	}

	if (/too many redirects/i.test(trimmed)) {
		return "We couldn't complete the audit because the target site redirected too many times before the page could be analyzed.";
	}

	if (/failed to fetch|networkerror|load failed/i.test(trimmed)) {
		return "We couldn't reach the target site. Check the URL, try again in a moment, or verify that the site is reachable from this machine.";
	}

	return trimmed;
}

export async function requestAudit(
	input: string,
	categories: AuditCategoryId[],
	signal?: AbortSignal,
): Promise<AuditReport> {
	const timeoutSignal = AbortSignal.timeout(30_000);
	const effectiveSignal = signal
		? AbortSignal.any([signal, timeoutSignal])
		: timeoutSignal;
	
	const requestBody: AuditRequest = { input, categories };
	
	try {
		const response = await fetch("/api/audit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(requestBody),
			signal: effectiveSignal,
		});
		
			if (response.status === 429) {
				const payload = await response.json().catch(() => ({})) as { error?: string; retryAfter?: number };
				const retryAfter = (payload as { retryAfter?: number }).retryAfter ?? 0;
				throw Object.assign(
					new Error(payload.error || "Too many requests. Please wait before running another audit."),
					{ retryAfter },
				);
			}

			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(
					normalizeAuditErrorMessage(
						(payload as { error?: string }).error ||
						"The audit could not be completed.",
					),
				);
			}
		
		return (await response.json()) as Promise<AuditReport>;
		} catch (error: unknown) {
			if (error instanceof DOMException && error.name === "TimeoutError") {
				throw new Error(
					"The audit timed out. Try a simpler page or check the target site.",
				);
			}
			if (error instanceof Error) {
				throw new Error(normalizeAuditErrorMessage(error.message));
			}
			throw error;
		}
}

export async function fetchAuditConfig(): Promise<AuditConfig> {
	try {
		const response = await fetch("/api/audit/count");
		if (!response.ok) return { count: 0, cooldownSeconds: 0 };
		const data = (await response.json()) as { count: number; cooldownSeconds?: number };
		return {
			count: typeof data.count === "number" ? data.count : 0,
			cooldownSeconds: typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 0,
		};
	} catch {
		return { count: 0, cooldownSeconds: 0 };
	}
}

export async function fetchAuditCount(): Promise<number> {
	const config = await fetchAuditConfig();
	return config.count;
}

export function subscribeToAuditCount(onCount: (count: number) => void): () => void {
	const eventSource = new EventSource("/api/audit/count/stream");

	eventSource.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data) as { count: number };
			if (typeof data.count === "number") onCount(data.count);
		} catch {
			// ignore malformed data
		}
	};

	// EventSource auto-reconnects on error, no explicit handler needed

	return () => {
		eventSource.close();
	};
}
