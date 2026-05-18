import { evaluateRobotsAccess } from "../services/robots.js";
import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkBlockedByRobots(context: AuditContext) {
	if (!context.robots.found || !context.robots.content) {
		return createCheckResult({
			id: "blocked-by-robots",
			label: "Blocked by robots.txt",
			category: "Indexing",
			status: "pass",
			summary:
				"No robots.txt was available, so the audited path is crawlable by default.",
			explanation:
				"When robots.txt is absent, search engines assume all paths are allowed. This check evaluates googlebot rules first and falls back to the wildcard user-agent.",
			recommendation:
				"Add a robots.txt file to explicitly manage crawler access, though it is not strictly required if you want everything crawled.",
		});
	}
	
	const access = evaluateRobotsAccess(context.robots.content, context.finalUrl);
	
	if (!access.allowed) {
		return createCheckResult({
			id: "blocked-by-robots",
			label: "Blocked by robots.txt",
			category: "Indexing",
			status: "fail",
			summary: "The audited path is disallowed by robots.txt.",
			explanation: `Matching rule for ${ access.userAgent }: ${ access.matchingRule!.raw }`,
			recommendation:
				"Remove or modify the 'Disallow' directive in your robots.txt file that blocks this URL path, as Googlebot must be able to crawl the page to index its content.",
			codeExample: "robots.txt:\nUser-agent: *\nAllow: /page-path/\nDisallow: /",
			aiPrompt: `This page is blocked by robots.txt (rule: ${ access.matchingRule!.raw }). If this page should be indexed by search engines, modify robots.txt to allow crawling of this path.`,
		});
	}
	
	return createCheckResult({
		id: "blocked-by-robots",
		label: "Blocked by robots.txt",
		category: "Indexing",
		status: "pass",
		summary: "The audited path is allowed by robots.txt.",
		explanation: access.matchingRule
			? `Matching allow rule for ${ access.userAgent }: ${ access.matchingRule.raw }`
			: `No blocking rule matched for ${ access.userAgent }.`,
		recommendation: "Keep important indexable pages crawlable. Ensure no future 'Disallow' directives in robots.txt accidentally block this URL path.",
	});
}
