import * as cheerio from "cheerio";
import { fetchPage } from "./fetchPage.js";
import { fetchRobotsTxt } from "./robots.js";
import { normalizeInput } from "./normalizeInput.js";
import { summarizeStatuses } from "./score.js";
import { countWords, extractVisibleText, normalizeWhitespace } from "../utils/text.js";
import { checkTitleTag } from "../checks/titleTag.js";
import { checkMetaDescription } from "../checks/metaDescription.js";
import { checkHreflang } from "../checks/hreflang.js";
import { checkLanguage } from "../checks/language.js";
import { checkH1 } from "../checks/h1.js";
import { checkHeadings } from "../checks/headings.js";
import { checkKeywordConsistency } from "../checks/keywordConsistency.js";
import { checkContentAmount } from "../checks/contentAmount.js";
import { checkImageAlt } from "../checks/imageAlt.js";
import { checkCanonical } from "../checks/canonical.js";
import { checkNoindexMeta } from "../checks/noindexMeta.js";
import { checkNoindexHeader } from "../checks/noindexHeader.js";
import { checkSslEnabled } from "../checks/sslEnabled.js";
import { checkHttpsRedirect } from "../checks/httpsRedirect.js";
import { checkAnalytics } from "../checks/analytics.js";
import { checkStructuredData } from "../checks/structuredData.js";
import { checkRobotsTxt } from "../checks/robotsTxt.js";
import { checkBlockedByRobots } from "../checks/blockedByRobots.js";
import { checkXmlSitemaps } from "../checks/xmlSitemaps.js";
import { buildSerpSnippetPreview } from "./serpPreview.js";
import { buildGeoReport } from "./geo.js";
import { buildSeoCategoriesReport } from "./seoCategories.js";
import { buildSocialResultsReport } from "./socialScore.js";
import { parseStructuredData } from "./schemaParser.js";
import type { AuditContext, AuditReport, CheckResult, StructuredDataParseResult } from "../types.js";

export async function runAudit(
	input: unknown,
): Promise<AuditReport> {
	const normalizedInput = normalizeInput(input);
	const [page, initialRobots] = await Promise.all([
		fetchPage(input),
		fetchRobotsTxt(normalizedInput.href),
	]);
	let robots = initialRobots;
	if (new URL(page.finalUrl).origin !== new URL(normalizedInput.href).origin) {
		robots = await fetchRobotsTxt(page.finalUrl);
	}

	const $ = cheerio.load(page.html || "");
	const visibleText = extractVisibleText($);

	const titleText = normalizeWhitespace($("head title").first().text());
	let metaDescription = "";
	let canonicalUrl = "";
	const h1Texts: string[] = [];

	// Single-pass meta extraction instead of three separate loops
	$("head meta").each((_i, el) => {
		if (!metaDescription) {
			const name = ($(el).attr("name") || "").toLowerCase();
			if (name === "description") {
				metaDescription = normalizeWhitespace($(el).attr("content"));
			}
		}
	});

	$("head link").each((_i, el) => {
		if (!canonicalUrl) {
			const rel = ($(el).attr("rel") || "").toLowerCase();
			if (rel.split(/\s+/).includes("canonical")) {
				canonicalUrl = $(el).attr("href") || "";
			}
		}
	});

	$("h1").each((_i, el) => {
		h1Texts.push(normalizeWhitespace($(el).text()));
	});

	const context: AuditContext = {
		...page,
		$,
		visibleText,
		robots,
		titleText,
		metaDescription,
		canonicalUrl,
		h1Texts,
	};

	// Parse structuredData once for reuse across checks
	const structuredDataResult = parseStructuredData(context);

	const syncChecks: CheckResult[] = [
		checkTitleTag(context),
		checkMetaDescription(context),
		checkHreflang(context),
		checkLanguage(context),
		checkH1(context),
		checkHeadings(context),
		checkKeywordConsistency(context),
		checkContentAmount(context),
		checkImageAlt(context),
		checkCanonical(context),
		checkNoindexMeta(context),
		checkNoindexHeader(context),
		checkAnalytics(context),
		checkStructuredData(context, structuredDataResult),
		checkRobotsTxt(context),
		checkBlockedByRobots(context),
	];

	// Run independent async checks in parallel
	const [sslResult, httpsResult, sitemapsResult, geo, socialResults] = await Promise.all([
		checkSslEnabled(context),
		checkHttpsRedirect(context),
		checkXmlSitemaps(context),
		buildGeoReport(context, structuredDataResult),
		buildSocialResultsReport(context),
	]);

	const checks: CheckResult[] = [
		...syncChecks,
		sslResult,
		httpsResult,
		sitemapsResult,
	];

	const seoCategories = buildSeoCategoriesReport(checks, geo, socialResults, page.finalUrl);

	return {
		input: page.input,
		normalizedInput: page.normalizedInput,
		testedUrl: page.testedUrl,
		finalUrl: page.finalUrl,
		serpPreview: buildSerpSnippetPreview(context),
		geo,
		seoCategories,
		socialResults,
		score: seoCategories.overallScore,
		statusSummary: summarizeStatuses(checks),
		checks,
		notes: buildNotes(context),
	};
}

function buildNotes(context: AuditContext): string[] {
	const notes: string[] = [];
	const wordCount = countWords(context.visibleText);

	if (wordCount < 80 && /<script[\s>]/i.test(context.html)) {
		notes.push(
			"This page has very little visible text in raw HTML and includes scripts. If it renders most content with JavaScript, results may be incomplete because this POC does not use a headless browser.",
		);
	}

	return notes;
}
