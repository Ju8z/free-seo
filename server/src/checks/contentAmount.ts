import { createCheckResult } from "../utils/checkResult.js";
import { countWords } from "../utils/text.js";
import type { AuditContext } from "../types.js";

export function checkContentAmount(context: AuditContext) {
	const wordCount = countWords(context.visibleText);
	
	if (wordCount < 150) {
		return createCheckResult({
			id: "content-amount",
			label: "Amount of Content",
			category: "Content",
			status: "fail",
			summary: `Visible content has ${ wordCount } words. Recommended 300+ words for substantial pages.`,
			explanation:
				"Heuristic bands: under 150 words = fail, 150-299 words = warning, 300+ words = pass.",
			recommendation:
				"Expand the content with useful information that answers the main search intent. While Google has no strict minimum word count, extremely thin content often fails to satisfy user intent.",
			codeExample: "<article>\n  <h1>Your Page Topic</h1>\n  <p>Add at least 300+ words of meaningful content here...</p>\n</article>",
			aiPrompt: `This page only has ${ wordCount } words of visible content which is below the 150-word minimum. Add at least 300+ words of helpful, relevant content that addresses the page's main topic and user search intent.`,
		});
	}
	
	if (wordCount < 300) {
		return createCheckResult({
			id: "content-amount",
			label: "Amount of Content",
			category: "Content",
			status: "warning",
			summary: `Visible content has ${ wordCount } words. Recommended 300+ words for substantial pages.`,
			explanation:
				"This is a heuristic best-practice check; short utility pages may be valid.",
			recommendation:
				"Consider expanding the page if it aims to rank for informational search queries. Focus on comprehensive, 'people-first' content rather than hitting arbitrary word counts.",
			codeExample: "<article>\n  <h1>Your Page Topic</h1>\n  <p>Expand with more paragraphs explaining key points...</p>\n</article>",
			aiPrompt: `This page has ${ wordCount } words which is below the recommended 300+ words. Expand the content with more detailed information about the page topic to better satisfy informational search intent.`,
		});
	}
	
	return createCheckResult({
		id: "content-amount",
		label: "Amount of Content",
		category: "Content",
		status: "pass",
		summary: `Visible content has ${ wordCount } words. Recommended 300+ words for substantial pages.`,
		explanation:
			"This is a heuristic best-practice check based on raw HTML visible text.",
		recommendation:
			"Keep the content specific, helpful, and aligned with the target query. Google prioritizes content quality and intent satisfaction over sheer length.",
	});
}
