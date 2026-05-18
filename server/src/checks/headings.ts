import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkHeadings(context: AuditContext) {
	const counts: Record<string, number> = { h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
	let total = 0;
	
	context.$("h2, h3, h4, h5, h6").each((_i, el) => {
		const tagName = (el as { tagName?: string }).tagName?.toLowerCase();
		if (tagName && counts[tagName] !== undefined) {
			counts[tagName]++;
			total++;
		}
	});
	
	if (total === 0) {
		return createCheckResult({
			id: "headings",
			label: "H2-H6 Header Tag Usage",
			category: "Structure",
			status: "warning",
			summary:
				"No H2-H6 subheadings were found. use subheadings to structure content.",
			explanation:
				"Subheadings help users scan the page and help search engines understand sections.",
			recommendation:
				"Add descriptive H2-H6 headings to structure your content into logical sections. Google uses heading tags to understand the context and hierarchy of your page.",
			codeExample: "<h2>Section Title</h2>\n<p>Content...</p>\n<h3>Subsection</h3>\n<p>More content...</p>",
			aiPrompt: "This page lacks subheadings (H2-H6). Add descriptive <h2> and <h3> tags to structure the content into logical sections. This helps both users scan the page and search engines understand the content hierarchy.",
		});
	}
	
	if (total < 2) {
		return createCheckResult({
			id: "headings",
			label: "H2-H6 Header Tag Usage",
			category: "Structure",
			status: "warning",
			summary: `This page has ${ total } H2-H6 subheading. Recommended at least 2 meaningful subheadings.`,
			explanation:
				"One subheading may be too thin for pages with meaningful body content.",
			recommendation:
				"Add additional descriptive subheadings if the page has multiple topics. A well-structured document outline helps both users and Google scan the content.",
			codeExample: "<h2>Section Title</h2>\n<p>Content...</p>\n<h3>Subsection</h3>\n<p>More content...</p>",
			aiPrompt: `This page only has ${ total } subheading(s). Add more descriptive <h2> and <h3> tags to create a clear content structure with at least 2-3 logical sections.`,
		});
	}
	
	return createCheckResult({
		id: "headings",
		label: "H2-H6 Header Tag Usage",
		category: "Structure",
		status: "pass",
		summary: `This page has ${ total } H2-H6 subheadings. Recommended at least 2 meaningful subheadings.`,
		explanation:
		`Breakdown: H2: ${ counts.h2 }, H3: ${ counts.h3 }, H4: ${ counts.h4 }, H5: ${ counts.h5 }, H6: ${ counts.h6 }.`,
		recommendation:
			"Keep headings descriptive and ordered sequentially. A clear H1-H6 hierarchy continues to help Google understand the relationship between different content blocks.",
	});
}
