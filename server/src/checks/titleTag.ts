import { createCheckResult } from "../utils/checkResult.js";
import { textLength } from "../utils/text.js";
import type { AuditContext } from "../types.js";

export function checkTitleTag(context: AuditContext) {
	const title = context.titleText ?? "";
	const length = textLength(title);
	const titles = context.$("head title").length;
	
	if (!title || titles === 0) {
		return createCheckResult({
			id: "title-tag",
			label: "Title Tag",
			category: "Metadata",
			status: "fail",
			summary: "No non-empty title tag was found in the page head.",
			explanation: "Recommended maximum ~60 characters before truncation.",
			recommendation:
				"Add one clear title tag in the head that describes the page topic and main keyword.",
			codeExample: "<head>\n  <title>Your Page Title - Main Keyword</title>\n</head>",
			aiPrompt: "The page is missing a title tag in the <head> section. Add a <title> tag that accurately describes the page content and includes the main keyword. Keep it under 60 characters to avoid truncation in search results.",
		});
	}
	
	if (titles > 1) {
		return createCheckResult({
			id: "title-tag",
			label: "Title Tag",
			category: "Metadata",
			status: "warning",
			summary: `This page has ${ titles } non-empty title tags.`,
			explanation: `First title is ${ length } characters long. `,
			recommendation:
				"Keep one title tag in the head so search engines receive one clear page title. Recommended maximum ~60 characters and 1 title tag.",
			codeExample: "<head>\n  <title>Your Single Page Title - Main Keyword</title>\n</head>",
			aiPrompt: "This page has multiple title tags which can confuse search engines. Remove all duplicate <title> tags and keep only one that accurately describes the page content with the main keyword included.",
		});
	}
	
	if (length > 60) {
		return createCheckResult({
			id: "title-tag",
			label: "Title Tag",
			category: "Metadata",
			status: "warning",
			summary: `Title tag is ${ length } characters long.`,
			explanation: `Found title: "${ title }". `,
			recommendation:
				"Shorten the title so the main keyword and offer are fully visible in search results. Google does not penalize short titles, but titles over ~60 characters will likely be truncated with an ellipsis (...).",
			codeExample: "<head>\n  <title>Your Optimized Title (Under 60 chars) - Brand</title>\n</head>",
			aiPrompt: `The title tag is ${ length } characters which is over the recommended 60 character maximum. Rewrite it to be concise so it does not get truncated in search results.`,
		});
	}
	
	return createCheckResult({
		id: "title-tag",
		label: "Title Tag",
		category: "Metadata",
		status: "pass",
		summary: `Title tag is ${ length } characters long (within the ~60 character maximum).`,
		explanation: `Found title: "${ title }".`,
		recommendation:
			"Keep the title focused on the page topic and primary keyword. Short titles are completely valid as long as they accurately describe the page content.",
	});
}
