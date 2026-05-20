import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

const GENERIC_ANCHOR_TEXTS = new Set([
	"click here",
	"read more",
	"learn more",
	"here",
	"link",
	"more",
	"go",
	"details",
]);

export function checkCrawlableLinks(context: AuditContext) {
	const $ = context.$;
	const links = $("a");
	
	if (links.length === 0) {
		return createCheckResult({
			id: "crawlable-links",
			label: "Crawlable Links",
			category: "Content",
			status: "info",
			summary: "No links were found on the page.",
			explanation: "No <a> tags were detected on this page.",
			recommendation: "Ensure your page includes links to other pages to assist search engines in discovering your content.",
		});
	}
	
	let uncrawlableCount = 0;
	let genericCount = 0;
	
	links.each((_i, el) => {
		const href = ($(el).attr("href") || "").trim();
		const text = ($(el).text() || "").trim().toLowerCase();
		
		if (!href || href.startsWith("javascript:") || href.startsWith("void(")) {
			uncrawlableCount++;
		}
		
		if (text && GENERIC_ANCHOR_TEXTS.has(text)) {
			genericCount++;
		}
	});
	
	if (uncrawlableCount > 0) {
		return createCheckResult({
			id: "crawlable-links",
			label: "Crawlable Links",
			category: "Content",
			status: "fail",
			summary: `${ uncrawlableCount } uncrawlable link(s) detected.`,
			explanation: `Google cannot follow links that use javascript: pseudoprotocols or lack a valid URL href attribute.`,
			recommendation: "Ensure all links use standard <a> tags with a valid destination URL in the href attribute.",
			codeExample: '<a href="/target-page">Descriptive Anchor Text</a>',
			aiPrompt: `${ uncrawlableCount } link(s) on this page use invalid/uncrawlable patterns like empty hrefs or javascript: pseudoprotocols. Change them to standard <a> elements with valid URL destinations in their href attributes.`,
		});
	}
	
	if (genericCount > 0) {
		return createCheckResult({
			id: "crawlable-links",
			label: "Crawlable Links",
			category: "Content",
			status: "warning",
			summary: `${ genericCount } link(s) use generic anchor text.`,
			explanation: `Using non-descriptive text like "click here" or "read more" provides no SEO context to Google about the destination page.`,
			recommendation: "Use descriptive anchor text that explains exactly where the link leads.",
			codeExample: '<a href="/target-page">Descriptive Anchor Text</a>',
			aiPrompt: `${ genericCount } link(s) on this page use generic anchor texts (such as "click here", "read more"). Replace them with descriptive link text that provides clear semantic context about the target destination.`,
		});
	}
	
	return createCheckResult({
		id: "crawlable-links",
		label: "Crawlable Links",
		category: "Content",
		status: "pass",
		summary: "All links are crawlable and use descriptive anchor text.",
		explanation: `Checked ${ links.length } link(s) and found no uncrawlable href attributes or generic anchor texts.`,
		recommendation: "Continue using crawlable URLs and descriptive link texts.",
	});
}
