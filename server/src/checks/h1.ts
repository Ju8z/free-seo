import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkH1(context: AuditContext) {
	const h1Values = context.h1Texts ?? [];
	
	if (h1Values.length === 0) {
		return createCheckResult({
			id: "h1",
			label: "H1 Header Tag Usage",
			category: "Structure",
			status: "fail",
			summary:
				"This page has 0 H1 tags.",
			explanation: "The H1 should describe the main topic of the page.",
			recommendation:
				"Add one visible H1 that matches the page topic and search intent.",
			codeExample: "<h1>Page Main Topic</h1>",
			aiPrompt: "This page is missing an H1 heading tag. Add one <h1> tag that clearly describes the main topic of the page. The H1 should match the page title and include relevant keywords.",
		});
	}
	
	if (h1Values.length > 1) {
		return createCheckResult({
			id: "h1",
			label: "H1 Header Tag Usage",
			category: "Structure",
			status: "pass",
			summary: `This page has ${ h1Values.length } H1 tags.`,
			explanation:
				"Multiple H1 tags are valid in HTML5; Google has stated publicly that pages can use any number of H1 tags.",
			recommendation:
				"Ensure each H1 accurately describes the section it belongs to.",
			codeExample: "<article>\n  <h1>Main Topic</h1>\n</article>\n<article>\n  <h1>Another Main Topic</h1>\n</article>",
			aiPrompt: "This page has multiple H1 tags. This is valid in HTML5 and for SEO, just ensure each H1 accurately reflects its respective section's content.",
		});
	}
	
	return createCheckResult({
		id: "h1",
		label: "H1 Header Tag Usage",
		category: "Structure",
		status: "pass",
		summary:
			"This page has 1 H1 tag. Recommended 1 clear primary H1.",
		explanation: `Found H1: "${ h1Values[0] }"`,
		recommendation:
			"Keep the H1 specific and aligned with the page title.",
	});
}
