import * as cheerio from "cheerio";
import { fetchPage } from "./fetchPage.js";
import { fetchRobotsTxt } from "./robots.js";
import { normalizeInput } from "./normalizeInput.js";

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
import { checkMobileViewport } from "../checks/mobileViewport.js";
import { checkCrawlableLinks } from "../checks/crawlableLinks.js";
import { checkImageDimensions } from "../checks/imageDimensions.js";
import { checkSearchFavicon } from "../checks/searchFavicon.js";
import { checkPageSpeed } from "../checks/pageSpeed.js";
import { buildSerpSnippetPreview } from "./serpPreview.js";
import { buildGeoReport } from "./geo.js";
import { buildSeoCategoriesReport } from "./seoCategories.js";
import { buildSocialResultsReport } from "./socialScore.js";
import { parseStructuredData } from "./schemaParser.js";
import type { AuditCategoryId, AuditContext, AuditReport, CheckResult } from "../types.js";
import { auditCategoryIds } from "../types.js";

export async function runAudit(
	input: unknown,
	categories: readonly AuditCategoryId[] = auditCategoryIds,
): Promise<AuditReport> {
	const selectedCategories = new Set(categories);
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
	
	// Single pass over <head> children fills both meta description and canonical
	$("head").children().each((_i, el) => {
		if (metaDescription && canonicalUrl) return;
		const tag = (el as { tagName?: string }).tagName?.toLowerCase();
		if (!metaDescription && tag === "meta") {
			const name = ($(el).attr("name") || "").toLowerCase();
			if (name === "description") {
				metaDescription = normalizeWhitespace($(el).attr("content"));
			}
		} else if (!canonicalUrl && tag === "link") {
			const rel = ($(el).attr("rel") || "").toLowerCase();
			if (rel.split(/\s+/).includes("canonical")) {
				canonicalUrl = $(el).attr("href") || "";
			}
		}
	});
	
	const h1Texts: string[] = $("h1")
		.map((_i, el) => normalizeWhitespace($(el).text()))
		.get()
		.filter(Boolean);
	
	const subheadingsText = $("h2, h3, h4, h5, h6")
		.map((_i, el) => $(el).text())
		.get()
		.join(" ");
	
	const imageAltText = $("img")
		.map((_i, el) => $(el).attr("alt") || "")
		.get()
		.join(" ");

	const context: AuditContext = {
		...page,
		$,
		visibleText,
		robots,
		titleText,
		metaDescription,
		canonicalUrl,
		h1Texts,
		subheadingsText,
		imageAltText,
	};
	
	// Parse structuredData once only when a selected category needs it.
	const structuredDataResult =
		selectedCategories.has("structure") || selectedCategories.has("geo")
			? parseStructuredData(context)
			: null;
	
	const syncChecks: CheckResult[] = [];
	if (selectedCategories.has("metadata")) {
		syncChecks.push(
			checkTitleTag(context),
			checkMetaDescription(context),
			checkHreflang(context),
			checkLanguage(context),
			checkCanonical(context),
			checkSearchFavicon(context),
		);
	}
	if (selectedCategories.has("structure")) {
		syncChecks.push(
			checkH1(context),
			checkHeadings(context),
			checkStructuredData(context, structuredDataResult ?? parseStructuredData(context)),
		);
	}
	if (selectedCategories.has("content")) {
		syncChecks.push(
			checkKeywordConsistency(context),
			checkContentAmount(context),
			checkImageAlt(context),
			checkCrawlableLinks(context),
			checkImageDimensions(context),
		);
	}
	if (selectedCategories.has("indexing")) {
		syncChecks.push(
			checkNoindexMeta(context),
			checkNoindexHeader(context),
			checkRobotsTxt(context),
			checkBlockedByRobots(context),
		);
	}
	if (selectedCategories.has("technical")) {
		syncChecks.push(
			checkAnalytics(context),
			checkMobileViewport(context),
		);
	}

	// Run independent async checks in parallel
	const asyncCheckPromises: Array<Promise<CheckResult>> = [];
	if (selectedCategories.has("technical")) {
		asyncCheckPromises.push(checkSslEnabled(context), checkHttpsRedirect(context));
	}
	if (selectedCategories.has("indexing")) {
		asyncCheckPromises.push(checkXmlSitemaps(context));
	}
	if (selectedCategories.has("pagespeed")) {
		asyncCheckPromises.push(
			checkPageSpeed(context, "desktop"),
			checkPageSpeed(context, "mobile"),
		);
	}
	const [asyncChecks, geo, socialResults] = await Promise.all([
		Promise.all(asyncCheckPromises),
		selectedCategories.has("geo")
			? buildGeoReport(context, structuredDataResult ?? parseStructuredData(context))
			: Promise.resolve(null),
		selectedCategories.has("social")
			? buildSocialResultsReport(context)
			: Promise.resolve(null),
	]);

	const checks: CheckResult[] = [
		...syncChecks,
		...asyncChecks,
	];
	
	const seoCategories = buildSeoCategoriesReport(checks, geo, socialResults, page.finalUrl, categories);
	
	const statusSummary = { pass: 0, warning: 0, fail: 0, info: 0 };
	for (const cat of Object.values(seoCategories.categories)) {
		const s = cat.statusSummary;
		statusSummary.pass += s.pass;
		statusSummary.warning += s.warning;
		statusSummary.fail += s.fail;
		statusSummary.info += s.not_applicable + s.unavailable + s.skipped;
	}

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
		statusSummary,
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
