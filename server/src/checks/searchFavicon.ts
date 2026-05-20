import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkSearchFavicon(context: AuditContext) {
	const $ = context.$;
	const faviconLinks = $("link[rel*='icon']");
	
	let faviconUrl = "";
	faviconLinks.each((_i, el) => {
		const href = ($(el).attr("href") || "").trim();
		if (href) {
			faviconUrl = href;
			return false;
		}
	});
	
	if (!faviconUrl) {
		return createCheckResult({
			id: "search-favicon",
			label: "Search Favicon",
			category: "Metadata",
			status: "fail",
			summary: "No favicon link element was found.",
			explanation: "Google Search displays a site's favicon next to search results. Pages without a favicon will default to a generic globe icon, lowering click-through rates.",
			recommendation: "Add a <link rel=\"icon\" href=\"/path/to/favicon.ico\"> tag to the <head> of your document.",
			codeExample: '<link rel="icon" href="/favicon.ico" type="image/x-icon">',
			aiPrompt: "Add a favicon link tag in the page HTML `<head>` section, for example: `<link rel=\"icon\" href=\"/favicon.ico\" type=\"image/x-icon\">`. Google Search shows your site's favicon in mobile and desktop search results.",
		});
	}
	
	return createCheckResult({
		id: "search-favicon",
		label: "Search Favicon",
		category: "Metadata",
		status: "pass",
		summary: "Favicon is defined.",
		explanation: `Found favicon link element: "${ faviconUrl }".`,
		recommendation: "Ensure the favicon image file is accessible, crawlable by Googlebot, and uses a standard format (PNG, ICO, SVG) that is a multiple of 48px square.",
	});
}
