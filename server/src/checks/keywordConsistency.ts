import { createCheckResult } from "../utils/checkResult.js";
import { extractKeywords, normalizeWhitespace } from "../utils/text.js";
import type { AuditContext, KeywordEntry } from "../types.js";

export function checkKeywordConsistency(
	context: AuditContext,
) {
	const zones: Record<string, string> = {
		title: context.titleText ?? "",
		metaDescription: context.metaDescription ?? "",
		h1: (context.h1Texts ?? []).join(" "),
		subheadings: context.subheadingsText ?? "",
		body: context.visibleText,
		imageAlt: context.imageAltText ?? "",
	};
	
	const keywordMap = new Map<
		string,
		{ keyword: string; count: number; zones: Set<string> }
	>();
	for (const [zoneName, zoneText] of Object.entries(zones)) {
		const keywords = extractKeywords(normalizeWhitespace(zoneText));
		for (const keyword of keywords) {
			if (!keywordMap.has(keyword)) {
				keywordMap.set(keyword, {
					keyword,
					count: 0,
					zones: new Set(),
				});
			}
			
			const entry = keywordMap.get(keyword)!;
			entry.count += 1;
			entry.zones.add(zoneName);
		}
	}
	
	const topKeywords: KeywordEntry[] = [...keywordMap.values()]
		.filter((entry) => entry.count > 1)
		.map((entry) => ({
			keyword: entry.keyword,
			count: entry.count,
			zones: [...entry.zones],
		}))
		.sort((left, right) => {
			if (right.zones.length !== left.zones.length) {
				return right.zones.length - left.zones.length;
			}
			
			return right.count - left.count;
		})
		.slice(0, 10);
	
	const solidOverlap =
		topKeywords.some((entry) => entry.zones.length >= 4) ||
		topKeywords.filter((entry) => entry.zones.length >= 3)
			.length >= 2;
	
	if (topKeywords.length === 0 || !solidOverlap) {
		return createCheckResult({
			id: "keyword-consistency",
			label: "Keyword Consistency",
			category: "Content",
			status: "warning",
			summary:
				"Keyword overlap across title, meta description, headings, body text, and image alt text looks weak.",
			explanation:
				"This is a heuristic best-practice check, not a hard technical failure.",
			recommendation:
				"Spread your main topic naturally across the title, meta description, H1, subheadings, and body. Google uses NLP (BERT) to understand context, so exact-match keyword stuffing is unnecessary.",
			codeExample: "Title: \"Best Pizza Recipe\"\nMeta: \"Learn the best pizza recipe...\"\nH1: \"Best Pizza Recipe\"\nH2: \"Ingredients for Perfect Pizza\"\nBody: \"This best pizza recipe uses...\"\nAlt: \"pizza recipe ingredients photo\"",
			aiPrompt: "The page content lacks keyword consistency across important zones (title, meta description, headings, body, image alt text). Spread your primary keyword naturally across these areas: title, meta description, H1, subheadings, body text, and image alt attributes.",
		});
	}
	
	return createCheckResult({
		id: "keyword-consistency",
		label: "Keyword Consistency",
		category: "Content",
		status: "pass",
		summary:
			"Recurring keywords appear across several important page zones.",
		explanation:
			"This is a heuristic best-practice check based on repeated normalized keywords.",
		recommendation:
			"Keep keyword usage natural and contextually relevant. Since Google understands synonyms, focus on comprehensive topic coverage rather than artificially repeating terms.",
	});
}
