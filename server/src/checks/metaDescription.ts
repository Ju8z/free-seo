import { createCheckResult } from "../utils/checkResult.js";
import { textLength } from "../utils/text.js";
import type { AuditContext } from "../types.js";

export function checkMetaDescription(context: AuditContext) {
	const description = context.metaDescription ?? "";
	const length = textLength(description);
	const count = context.$("head meta[name='description']").length;

	if (!description || count === 0) {
		return createCheckResult({
			id: "meta-description",
			label: "Meta Description",
			category: "Metadata",
			status: "fail",
			summary:
				"No non-empty meta description was found in the page head.",
			explanation: "Recommended maximum ~160 characters before truncation.",
			recommendation:
				"Add one practical meta description that summarizes the page and includes the main search intent.",
			codeExample: "<head>\n  <meta name=\"description\" content=\"Your page description here (120-160 characters)...\">\n</head>",
			aiPrompt: "The page is missing a meta description in the <head> section. Add a <meta name=\"description\"> tag with under 160 characters that summarizes the page content and includes relevant keywords for search engines.",
		});
	}

	if (count > 1) {
		return createCheckResult({
			id: "meta-description",
			label: "Meta Description",
			category: "Metadata",
			status: "warning",
			summary: `This page has ${ count } meta descriptions. Recommended 1 meta description.`,
			explanation: `First meta description is ${ length } characters long. Recommended maximum ~160 characters.`,
			recommendation:
				"Keep one meta description so search engines do not need to choose between competing values.",
			codeExample: "<head>\n  <meta name=\"description\" content=\"Your single page description (120-160 characters)...\">\n</head>",
			aiPrompt: "This page has multiple meta descriptions which can confuse search engines. Remove all duplicate <meta name=\"description\"> tags and keep only one concise description that summarizes the page.",
		});
	}
	
	if (length > 160) {
		return createCheckResult({
			id: "meta-description",
			label: "Meta Description",
			category: "Metadata",
			status: "warning",
			summary: `Meta description is ${ length } characters long. Recommended maximum ~160 characters.`,
			explanation: `Found meta description: "${ description }". Google does not penalize short descriptions, but descriptions over ~160 characters will likely be truncated.`,
			recommendation:
				"Shorten the description so it gives a specific page summary within 160 characters.",
			codeExample: "<head>\n  <meta name=\"description\" content=\"Your concise optimized description (under 160 characters)...\">\n</head>",
			aiPrompt: `The meta description is ${ length } characters which is over the recommended 160 character limit. Rewrite it to be concise so it doesn't get truncated in search results.`,
		});
	}
	
	return createCheckResult({
		id: "meta-description",
		label: "Meta Description",
		category: "Metadata",
		status: "pass",
		summary: `Meta description is ${ length } characters long (within the ~160 character maximum).`,
		explanation: `Found meta description: "${ description }". Concise descriptions are perfectly valid for SEO.`,
		recommendation:
			"Keep the description useful, accurate, and aligned with the visible page content.",
	});
}
