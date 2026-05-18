import { textLength } from "../utils/text.js";
import type { AuditContext, SerpSnippetPreview } from "../types.js";

export function buildSerpSnippetPreview(
	context: AuditContext,
): SerpSnippetPreview {
	const title = context.titleText ?? "";
	const description = context.metaDescription ?? "";
	const sourceUrl = getPreviewSourceUrl(context);
	
	return {
		title,
		titleLength: textLength(title),
		description,
		descriptionLength: textLength(description),
		displayUrl: buildDisplayUrl(sourceUrl),
		sourceUrl,
	};
}

function getPreviewSourceUrl(context: AuditContext): string {
	const canonicalUrl = context.canonicalUrl || "";
	
	if (canonicalUrl.trim()) {
		try {
			return new URL(canonicalUrl, context.finalUrl).href;
		} catch {
			return context.finalUrl;
		}
	}
	
	return context.finalUrl;
}

function buildDisplayUrl(url: string): string {
	try {
		const parsedUrl = new URL(url);
		const path = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname;
		return `${ parsedUrl.hostname }${ path }`;
	} catch {
		return url;
	}
}
