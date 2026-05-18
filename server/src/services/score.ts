import type { CheckId, CheckResult, CheckStatus, StatusSummary } from "../types.js";
import { checkWeights, statusMultipliers } from "../types.js";
export { checkWeights, statusMultipliers };


export function calculateScore(checks: CheckResult[]): number {
	let possibleScore = 0;
	let earnedScore = 0;
	
	for (const check of checks) {
		if (check.status === "info") {
			continue;
		}
		
		const weight = checkWeights[check.id] || 4;
		possibleScore += weight;
		earnedScore += weight * (statusMultipliers[check.status] ?? 0);
	}
	
	if (possibleScore === 0) {
		return 100;
	}
	
	return Math.max(
		0,
		Math.min(100, Math.round((earnedScore / possibleScore) * 100)),
	);
}

export function getCheckWeight(checkId: CheckId): number {
	return checkWeights[checkId] ?? 4;
}

export function getCheckScore(status: CheckStatus): number | null {
	if (status === "info") {
		return null;
	}
	return Math.round((statusMultipliers[status] ?? 0) * 100);
}

export function summarizeStatuses(
	checks: CheckResult[],
): StatusSummary {
	return checks.reduce(
		(summary, check) => {
			summary[check.status] += 1;
			return summary;
		},
		{ pass: 0, warning: 0, fail: 0, info: 0 } as StatusSummary,
	);
}
