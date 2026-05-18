import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkNoindexHeader(
	context: AuditContext,
) {
	const headerValue = normalizeHeaderValue(
		context.headers["x-robots-tag"],
	);
	const containsNoindex =
		/\bnoindex\b/i.test(headerValue);

	if (containsNoindex) {
		return createCheckResult({
			id: "noindex-header",
			label: "Noindex Header Test",
			category: "Indexing",
			status: "fail",
			summary:
				"The X-Robots-Tag response header contains noindex.",
			explanation: `Header value: "${headerValue}"`,
			recommendation:
				"Remove noindex from X-Robots-Tag if this page should appear in search results. Google honors this directive strictly and will drop the page entirely from Search results while it is present.",
			codeExample: "HTTP Response Header:\nX-Robots-Tag: index, follow",
			aiPrompt: "The page has an X-Robots-Tag header with noindex which prevents it from appearing in search results. Configure your server to remove noindex from this header or use index,follow instead if the page should be indexed.",
		});
	}

	return createCheckResult({
		id: "noindex-header",
		label: "Noindex Header Test",
		category: "Indexing",
		status: "pass",
		summary:
			"No X-Robots-Tag noindex directive was found.",
		explanation: headerValue
			? `Header value: "${headerValue}"`
			: "No X-Robots-Tag header was present.",
		recommendation:
			"Keep the X-Robots-Tag header free of noindex directives so search engines can freely index this page.",
	});
}

function normalizeHeaderValue(
	value: string | string[] | undefined,
): string {
	if (Array.isArray(value)) {
		return value.join(", ");
	}

	return value ? String(value) : "";
}
