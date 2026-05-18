import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkRobotsTxt(context: AuditContext) {
	const domain = new URL(context.finalUrl).hostname;
	const robots = context.robots;
	
	if (robots.found) {
		return createCheckResult({
			id: "robots-txt",
			label: "robots.txt",
			category: "Indexing",
			status: "pass",
			summary: `robots.txt was found with status ${ robots.statusCode }.`,
			explanation: `robots.txt URL: ${ robots.url }`,
			recommendation:
				"Keep your robots.txt available and monitor it to ensure it does not accidentally block important pages, effectively managing your crawl budget.",
		});
	}
	
	return createCheckResult({
		id: "robots-txt",
		label: "robots.txt",
		category: "Indexing",
		status: "warning",
		summary: robots.statusCode
			? `robots.txt returned status ${ robots.statusCode }. Recommended reachable robots.txt.`
			: "robots.txt could not be fetched. Recommended reachable robots.txt.",
		explanation: `robots.txt URL: ${ robots.url }`,
		recommendation:
			"Create a reachable robots.txt file at the root of your domain. Even a simple file allowing all crawling helps search engines verify your site's access rules.",
		codeExample: `# robots.txt example for a standard website
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/

# Allow AI crawlers to access public content
User-agent: ChatGPT-User
Allow: /

# Allow Googlebot
User-agent: Googlebot
Allow: /

# Sitemap location
Sitemap: https://www.${domain}/sitemap.xml`,
		aiPrompt:
			`Create a robots.txt file at your domain root (e.g., https://www.${domain}/robots.txt). The file should allow all standard crawlers with 'User-agent: *' and 'Allow: /', while disallowing only private directories like /admin/. Include a Sitemap directive pointing to your sitemap URL, and ensure AI-specific crawlers are allowed to access public content.`,
	});
}
