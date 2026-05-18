import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkCanonical(context: AuditContext) {
	const domain = new URL(context.finalUrl).hostname;
	const cachedCanonical = context.canonicalUrl || "";
	
	const canonicalValues = cachedCanonical
		? [cachedCanonical]
		: context
			.$("head link")
			.filter((_i, el) => {
				const rel = context.$(el).attr("rel") || "";
				return rel
					.toLowerCase()
					.split(/\s+/)
					.includes("canonical");
			})
			.map((_i, el) => context.$(el).attr("href") || "")
			.get();
	
	if (canonicalValues.length === 0) {
		return createCheckResult({
			id: "canonical",
			label: "Canonical Tag",
			category: "Indexing",
			status: "warning",
			summary:
				"No canonical tag was found in the page head.",
			explanation:
				"Recommended: one absolute canonical URL for indexable pages.",
			recommendation:
				"Add one absolute <link rel=\"canonical\"> tag. This explicitly tells Google which URL version is the preferred copy, preventing ranking signal dilution across duplicate URLs.",
			codeExample: `<head>\n  <link rel="canonical" href="https://${domain}/page">\n</head>`,
			aiPrompt: "This page is missing a canonical tag. Add a <link rel=\"canonical\"> tag in the <head> section pointing to the preferred URL for this page. This helps search engines understand which version of the URL should be indexed.",
		});
	}
	
	if (canonicalValues.length > 1) {
		return createCheckResult({
			id: "canonical",
			label: "Canonical Tag",
			category: "Indexing",
			status: "fail",
			summary: `This page has ${ canonicalValues.length } canonical tags. `,
			explanation:
				"Multiple canonical tags can send conflicting indexation signals.",
			recommendation:
				"Keep only one canonical tag in the head and remove duplicates. Multiple canonical tags send conflicting signals, which may cause Google to ignore them entirely.",
			codeExample: `<head>\n  <link rel="canonical" href="https://${domain}/page">\n</head>`,
			aiPrompt: "This page has multiple canonical tags which confuses search engines about which URL to index. Remove all duplicate <link rel=\"canonical\"> tags and keep only one pointing to the preferred URL.",
		});
	}
	
	const canonicalUrl = canonicalValues[0]!.trim();
	if (!canonicalUrl) {
		return createCheckResult({
			id: "canonical",
			label: "Canonical Tag",
			category: "Indexing",
			status: "fail",
			summary:
				"The canonical tag is present but its href is empty.",
			explanation: "Recommended: one absolute canonical URL.",
			recommendation:
				"Set the canonical href to the preferred absolute URL. An empty href attribute is invalid and will be ignored by search engines.",
			codeExample: `<head>\n  <link rel="canonical" href="https://${domain}/page">\n</head>`,
			aiPrompt: `The canonical tag exists but has an empty href attribute. Set the href to the absolute preferred URL for this page (e.g., https://${domain}/page).`,
		});
	}
	
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(canonicalUrl, context.finalUrl);
	} catch {
		return createCheckResult({
			id: "canonical",
			label: "Canonical Tag",
			category: "Indexing",
			status: "fail",
			summary: `Canonical href "${ canonicalUrl }" is malformed.`,
			explanation:
				"Recommended: one valid absolute canonical URL.",
			recommendation:
				"Replace the malformed canonical href with a valid absolute http or https URL so search engines can successfully process the signal.",
			codeExample: `<head>\n  <link rel="canonical" href="https://${domain}/page">\n</head>`,
			aiPrompt: `The canonical URL is malformed or invalid. Replace it with a valid absolute URL starting with http:// or https:// (e.g., https://${domain}/page).`,
		});
	}
	
	if (!/^https?:\/\//i.test(canonicalUrl)) {
		return createCheckResult({
			id: "canonical",
			label: "Canonical Tag",
			category: "Indexing",
			status: "warning",
			summary: `Canonical URL is relative: ${ canonicalUrl }.`,
			explanation: `Resolved canonical URL: ${ parsedUrl.href }`,
			recommendation:
				"Change the relative canonical URL to an absolute URL (including https:// and the domain). Google strongly recommends absolute canonical URLs to prevent ambiguous resolution across different URL paths.",
			codeExample: `<head>\n  <link rel="canonical" href="https://${domain}/page">\n</head>`,
			aiPrompt: "The canonical URL is relative instead of absolute. Change it to an absolute URL starting with https:// to avoid ambiguity for search engines.",
		});
	}
	
	return createCheckResult({
		id: "canonical",
		label: "Canonical Tag",
		category: "Indexing",
		status: "pass",
		summary:
			"One absolute canonical URL was found in the page head.",
		explanation: `Canonical URL: ${ canonicalUrl }`,
		recommendation:
			"Ensure this canonical URL correctly matches the preferred version you want indexed. A correct absolute canonical tag solidifies your indexing signals.",
	});
}
