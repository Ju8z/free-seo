import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext, HreflangTag, } from "../types.js";

const hreflangPattern =
	/^(x-default|[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*)$/;

export function checkHreflang(context: AuditContext) {
	const domain = new URL(context.finalUrl).hostname;
	const tags: HreflangTag[] = context
		.$("head link")
		.filter((_i, el) => {
			const rel = context.$(el).attr("rel") || "";
			return rel
				.toLowerCase()
				.split(/\s+/)
				.includes("alternate");
		})
		.map((_i, el) => ({
			hreflang: context.$(el).attr("hreflang") || "",
			href: context.$(el).attr("href") || "",
		}))
		.get()
		.filter((tag) => tag.hreflang || tag.href);
	
	if (tags.length === 0) {
		return createCheckResult({
			id: "hreflang",
			label: "hreflang Usage",
			category: "Metadata",
			status: "info",
			summary:
				"No hreflang tags detected. This is fine for single-language sites.",
			explanation:
				"hreflang is recommended only when you have language or regional alternate pages.",
			recommendation:
				"Add hreflang tags only if this page has translated or regional alternate versions. They are unnecessary for single-language sites.",
		});
	}
	
	const duplicateCodes = findDuplicateCodes(tags);
	const invalidTags = tags.filter(
		(tag) => !isValidHreflangTag(tag),
	);
	const hasSelfReference = tags.some((tag) =>
		urlsMatch(tag.href, context.finalUrl),
	);
	
	if (invalidTags.length > 0) {
		return createCheckResult({
			id: "hreflang",
			label: "hreflang Usage",
			category: "Metadata",
			status: "fail",
			summary: `${ invalidTags.length } hreflang tag(s) are missing required values or use invalid values.`,
			explanation:
				"Each hreflang tag should include a valid hreflang value and an absolute http or https href.",
			recommendation:
				"Fix malformed hreflang tags to ensure every alternate reference has a valid language code and absolute URL, which Google requires for accurate regional targeting.",
			codeExample: `<head>\n  <link rel="alternate" hreflang="en" href="https://${domain}/en/page">\n  <link rel="alternate" hreflang="es" href="https://${domain}/es/page">\n  <link rel="alternate" hreflang="x-default" href="https://${domain}/page">\n</head>`,
			aiPrompt: "Some hreflang tags are malformed. Ensure every <link rel=\"alternate\" hreflang=\"...\"> tag has a valid language code (like en, es, fr, or x-default) and absolute URL starting with https://.",
		});
	}
	
	if (duplicateCodes.length > 0 || !hasSelfReference) {
		const issue =
			duplicateCodes.length > 0
				? `Duplicate hreflang values found: ${ duplicateCodes.join(", ") }.`
				: "No self-referencing hreflang tag was detected.";

		return createCheckResult({
			id: "hreflang",
			label: "hreflang Usage",
			category: "Metadata",
			status: "warning",
			summary: issue,
			explanation:
				"Best practice: each alternate set should include unique language values and a self-reference.",
			recommendation:
				"Deduplicate your hreflang values and ensure you include a self-referencing tag. Google requires bidirectional and self-referencing tags to establish a valid alternate set.",
			codeExample: `<head>\n  <link rel="alternate" hreflang="en" href="https://${domain}/en/page">\n  <link rel="alternate" hreflang="es" href="https://${domain}/es/page">\n  <link rel="alternate" hreflang="x-default" href="https://${domain}/page">\n</head>`,
			aiPrompt: duplicateCodes.length > 0
				? `Duplicate hreflang values found: ${ duplicateCodes.join(", ") }. Remove duplicate hreflang tags and ensure each language code appears only once in your hreflang set.`
				: "The hreflang set is missing a self-reference to the current page. Add a hreflang tag pointing to this page's URL.",
		});
	}
	
	return createCheckResult({
		id: "hreflang",
		label: "hreflang Usage",
		category: "Metadata",
		status: "pass",
		summary: `${ tags.length } valid hreflang tag(s) were found, including a self-reference.`,
		explanation:
			"Each detected tag has a valid language value and absolute URL.",
		recommendation:
			"Keep your hreflang sets fully synchronized across all translated or regional page variants to maintain accurate international search presence.",
	});
}

function isValidHreflangTag(tag: HreflangTag): boolean {
	if (!hreflangPattern.test(tag.hreflang)) {
		return false;
	}
	
	try {
		const href = new URL(tag.href);
		return ["http:", "https:"].includes(href.protocol);
	} catch {
		return false;
	}
}

function findDuplicateCodes(tags: HreflangTag[]): string[] {
	const counts = new Map<string, number>();
	for (const tag of tags) {
		const code = tag.hreflang.toLowerCase();
		counts.set(code, (counts.get(code) || 0) + 1);
	}
	
	return [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([code]) => code);
}

function urlsMatch(leftUrl: string, rightUrl: string): boolean {
	try {
		const left = normalizeCompareUrl(new URL(leftUrl));
		const right = normalizeCompareUrl(new URL(rightUrl));
		return left === right;
	} catch {
		return false;
	}
}

function normalizeCompareUrl(url: URL): string {
	url.hash = "";
	if (url.pathname === "/") {
		url.pathname = "/";
	}
	
	return url.href.replace(/\/$/, "");
}
