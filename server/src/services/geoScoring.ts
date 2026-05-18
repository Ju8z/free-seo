import type { BaseCheckStatus, GeoReport, GeoStatus } from "../types.js";
import { getAuditStatus } from "../types.js";

export function getGeoCheckScore(status: BaseCheckStatus): number {
	if (status === "pass") {
		return 100;
	}
	if (status === "warning") {
		return 60;
	}
	return 20;
}

export function calculateGeoScore(
	identitySchemaScore: number,
	renderedContentScore: number,
	llmsTxtScore: number,
): number {
	return Math.max(
		0,
		Math.min(
			100,
			Math.round(
				identitySchemaScore * 0.4 +
				renderedContentScore * 0.4 +
				llmsTxtScore * 0.2,
			),
		),
	);
}

export function getGeoStatus(score: number): GeoStatus {
	return getAuditStatus(score);
}

export function buildGeoSummary(
	score: number,
	identityIssues: string[],
	renderedIssues: string[],
	llmsTxtIssues: string[],
): string {
	if (score >= 90) {
		return "Your Generative Engine Optimization appears well positioned.";
	}
	
	if (identityIssues.length === 0 && renderedIssues.length > 0) {
		return "Your site has good identity signals, but important content may depend too heavily on JavaScript rendering.";
	}
	
	if (identityIssues.length > 0 && llmsTxtIssues.length > 0) {
		return "Your site is missing key AI-readable identity or guidance signals, making it harder for AI systems to understand your entity structure.";
	}
	
	return "Your Generative Engine Optimization has useful signals, but several improvements would make the site easier for AI systems to crawl and understand.";
}

export function collectGeoRecommendations(
	report: Pick<GeoReport, "checks">,
): string[] {
	return [
		...report.checks.identitySchema.recommendations,
		...report.checks.renderedContent.recommendations,
		...report.checks.llmsTxt.recommendations,
	].filter((recommendation, index, all) =>
		all.indexOf(recommendation) === index,
	);
}
