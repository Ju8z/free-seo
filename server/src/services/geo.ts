import { utilityClient } from "./httpClients.js";
import { fetchTextWithRedirects } from "./fetchText.js";
import { checkGeoIdentitySchema, type UrlProbeResult } from "./geoIdentitySchema.js";
import { checkGeoRenderedContent } from "./geoRenderedContent.js";
import { checkGeoLlmsTxt } from "./geoLlmsTxt.js";
import { buildGeoSummary, calculateGeoScore, collectGeoRecommendations, getGeoStatus, } from "./geoScoring.js";
import type { AuditContext, GeoReport, StructuredDataParseResult } from "../types.js";

export async function buildGeoReport(
	context: AuditContext,
	structuredDataResult?: StructuredDataParseResult,
): Promise<GeoReport> {
	const [identitySchema, renderedContent, llmsTxt] = await Promise.all([
		checkGeoIdentitySchema(context, probeCrawlableUrl, structuredDataResult),
		checkGeoRenderedContent(context),
		checkGeoLlmsTxt(context),
	]);

	const score = calculateGeoScore(
		identitySchema.score,
		renderedContent.score,
		llmsTxt.score,
	);
	const checks = {
		identitySchema,
		renderedContent,
		llmsTxt,
	};
	
	return {
		score,
		status: getGeoStatus(score),
		summary: buildGeoSummary(
			score,
			identitySchema.issues,
			renderedContent.issues,
			llmsTxt.issues,
		),
		recommendations: collectGeoRecommendations({ checks }),
		checks,
	};
}

async function probeCrawlableUrl(url: string): Promise<UrlProbeResult> {
	try {
		const response = await fetchTextWithRedirects(url, utilityClient, {
			label: "Schema media URL",
			maxRedirects: 3,
		});
		return {
			url: response.url,
			statusCode: response.statusCode,
			ok: response.statusCode >= 200 && response.statusCode < 400,
			error: null,
		};
	} catch (error) {
		return {
			url,
			statusCode: null,
			ok: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
