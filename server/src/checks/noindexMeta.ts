import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkNoindexMeta(context: AuditContext) {
	const robotsMetaContents = context
		.$("head meta")
		.filter((_i, el) => {
			const name = (
				context.$(el).attr("name") || ""
			).toLowerCase();
			return ["robots", "googlebot"].includes(name);
		})
		.map((_i, el) => context.$(el).attr("content") || "")
		.get()
		.filter(Boolean);
	
	const noindexContent = robotsMetaContents.find((content) =>
		/\bnoindex\b/i.test(content),
	);
	
	if (noindexContent) {
		return createCheckResult({
			id: "noindex-meta",
			label: "Noindex Tag Test",
			category: "Indexing",
			status: "fail",
			summary: "A robots meta tag contains noindex.",
			explanation: `Found robots meta content: "${ noindexContent }"`,
			recommendation:
				"Remove 'noindex' from the robots meta tag if this page should be indexed. Google honors this directive strictly and will remove the page from search results.",
			codeExample: '<meta name="robots" content="index, follow">',
			aiPrompt: `The page has a noindex directive: "${ noindexContent }". This prevents the page from appearing in search results. If this page should be indexed, remove noindex from the robots meta tag.`,
		});
	}
	
	return createCheckResult({
		id: "noindex-meta",
		label: "Noindex Tag Test",
		category: "Indexing",
		status: "pass",
		summary: "No robots meta noindex directive was found.",
		explanation:
			robotsMetaContents.length > 0
				? `Robots meta content found: ${ robotsMetaContents.join(" | ") }`
				: "No robots meta content was found.",
		recommendation:
			"Keep 'noindex' absent from your robots meta tags to ensure search engines can freely index the page.",
	});
}
