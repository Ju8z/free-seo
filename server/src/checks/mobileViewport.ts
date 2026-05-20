import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkMobileViewport(context: AuditContext) {
	const $ = context.$;
	const viewportTag = $("head meta[name='viewport']");
	
	if (viewportTag.length === 0) {
		return createCheckResult({
			id: "mobile-viewport",
			label: "Mobile Viewport",
			category: "Technical",
			status: "fail",
			summary: "No viewport meta tag was found.",
			explanation: "A viewport meta tag is missing. This prevents mobile browsers from rendering the page responsively, leading to poor mobile page experience.",
			recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the <head> of your document to enable responsive mobile rendering.",
			codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
			aiPrompt: "A mobile viewport meta tag is missing from this page. Add `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` to the HTML `<head>` block to make the page responsive and mobile-friendly.",
		});
	}
	
	const content = (viewportTag.attr("content") || "").toLowerCase();
	const hasWidth = /\bwidth\s*=\s*device-width\b/.test(content);
	const hasScale = /\binitial-scale\s*=\s*[0-9]*\.?[0-9]+\b/.test(content);
	const restrictsScaling =
		/\buser-scalable\s*=\s*(no|0)\b/.test(content) ||
		/\bmaximum-scale\s*=\s*(0|1(\.0)?)\b/.test(content);
	
	if (!hasWidth || !hasScale) {
		return createCheckResult({
			id: "mobile-viewport",
			label: "Mobile Viewport",
			category: "Technical",
			status: "warning",
			summary: "Viewport tag is present but not configured correctly.",
			explanation: `Viewport tag content is: "${ content }". It is missing recommended responsive attributes like "width=device-width" or "initial-scale=1".`,
			recommendation: "Update the viewport tag to: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.",
			codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
			aiPrompt: `The mobile viewport meta tag is present but misconfigured: "${ content }". Correct it by replacing it with: \`<meta name="viewport" content="width=device-width, initial-scale=1">\` to enable optimal scaling.`,
		});
	}
	
	if (restrictsScaling) {
		return createCheckResult({
			id: "mobile-viewport",
			label: "Mobile Viewport",
			category: "Technical",
			status: "warning",
			summary: "Viewport tag restricts user scalability.",
			explanation: `Viewport tag content "${ content }" restricts mobile users from zooming. Google recommends avoiding scalability restrictions for web accessibility.`,
			recommendation: "Remove user-scalable=no or maximum-scale restrictions from the viewport tag's content attribute.",
			codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
			aiPrompt: `The mobile viewport tag restricts user scalability: "${ content }". Remove scale-limiting attributes or disabled scaling tags (like user-scalable=no or maximum-scale=1) and ensure the viewport is set to: \`<meta name="viewport" content="width=device-width, initial-scale=1">\`.`,
		});
	}
	
	return createCheckResult({
		id: "mobile-viewport",
		label: "Mobile Viewport",
		category: "Technical",
		status: "pass",
		summary: "Mobile viewport is properly configured.",
		explanation: `Found responsive viewport tag content: "${ content }".`,
		recommendation: "Keep the viewport tag config as is.",
	});
}
