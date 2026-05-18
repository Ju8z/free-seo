import type { CheckResult } from "../types.js";

export function createCheckResult(params: {
	id: CheckResult["id"];
	label: string;
	category: CheckResult["category"];
	status: CheckResult["status"];
	summary: string;
	explanation: string;
	recommendation: string;
	codeExample?: string;
	aiPrompt?: string;
}): CheckResult {
	return {
		id: params.id,
		label: params.label,
		category: params.category,
		status: params.status,
		summary: params.summary,
		explanation: params.explanation,
		recommendation: params.recommendation,
		codeExample: params.codeExample,
		aiPrompt: params.aiPrompt,
	};
}
