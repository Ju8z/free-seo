import type { CheerioAPI } from "cheerio";

const stopwords: Set<string> = new Set([
	"a",
	"about",
	"after",
	"all",
	"also",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"by",
	"can",
	"das",
	"de",
	"der",
	"die",
	"ein",
	"eine",
	"for",
	"from",
	"has",
	"have",
	"how",
	"in",
	"is",
	"it",
	"mit",
	"not",
	"of",
	"on",
	"or",
	"our",
	"the",
	"this",
	"to",
	"und",
	"von",
	"was",
	"we",
	"with",
	"you",
	"your",
]);

export function extractVisibleText($: CheerioAPI): string {
	const ignoreTags = new Set([
		"script",
		"style",
		"noscript",
		"svg",
		"template",
		"nav",
		"header",
		"footer",
	]);
	
	const MAX_CHARS = 500_000;
	const parts: string[] = [];
	let total = 0;
	
	function walk(node: any): boolean {
		if (!node) return true;
		if (node.type === "text") {
			parts.push(node.data);
			total += node.data.length + 1;
			return total < MAX_CHARS;
		}
		if (node.type === "tag" && !ignoreTags.has(node.name)) {
			const children = node.children || [];
			for (let i = 0; i < children.length; i++) {
				if (!walk(children[i])) return false;
			}
		}
		return true;
	}

	const bodyNodes = $("body").get();
	for (let i = 0; i < bodyNodes.length; i++) {
		if (!walk(bodyNodes[i])) break;
	}
	
	return normalizeWhitespace(parts.join(" "));
}

export function normalizeWhitespace(value: unknown): string {
	return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function countWords(text: unknown): number {
	const str = String(text ?? "").trim();
	if (!str) return 0;
	return str.split(/\s+/).length;
}

export function extractKeywords(text: unknown): string[] {
	const str = String(text ?? "");
	const rawTokens = str.split(/\s+/);
	const result: string[] = [];

	for (let i = 0; i < rawTokens.length; i++) {
		const token = rawTokens[i];
		if (!token) continue;
		
		const lower = token.toLowerCase();
		// ASCII fast-path: skip Unicode normalization for ordinary English/code text
		const normalized = /^[\x20-\x7e]+$/.test(lower)
			? lower
			: lower.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

		const matches = normalized.match(/[a-z0-9][a-z0-9'-]{2,}/g);
		if (matches) {
			for (let j = 0; j < matches.length; j++) {
				const match = matches[j]!;
				if (!stopwords.has(match) && !/^\d+$/.test(match)) {
					result.push(match);
				}
			}
		}
	}

	return result;
}

export function textLength(value: unknown): number {
	return normalizeWhitespace(value).length;
}
