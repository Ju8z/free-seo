import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

interface AnalyticsProviderPattern {
	id: string;
	name: string;
	patterns: RegExp[];
}

const analyticsProviders: AnalyticsProviderPattern[] = [
	{
		id: "google-analytics",
		name: "Google Analytics",
		patterns: [
			/googletagmanager\.com\/gtag\/js/i,
			/google-analytics\.com\/analytics\.js/i,
			/google-analytics\.com\/ga\.js/i,
			/\bgtag\s*\(/i,
			/\bga\s*\(/i,
		],
	},
	{
		id: "google-tag-manager",
		name: "Google Tag Manager",
		patterns: [
			/googletagmanager\.com\/gtm\.js/i,
			/GTM-[A-Z0-9]+/i,
		],
	},
	{
		id: "matomo",
		name: "Matomo",
		patterns: [/matomo\.js/i, /piwik\.js/i, /\b_paq\b/i],
	},
	{
		id: "plausible",
		name: "Plausible",
		patterns: [/plausible\.io\/js\/script/i, /data-domain=.*plausible/i],
	},
	{
		id: "umami",
		name: "Umami",
		patterns: [/umami\.js/i, /data-website-id/i],
	},
	{
		id: "fathom",
		name: "Fathom",
		patterns: [/cdn\.usefathom\.com\/script\.js/i, /\bfathom\.track/i],
	},
	{
		id: "microsoft-clarity",
		name: "Microsoft Clarity",
		patterns: [/clarity\.ms\/tag/i, /\bclarity\s*\(/i],
	},
	{
		id: "segment",
		name: "Segment",
		patterns: [/cdn\.segment\.com\/analytics\.js/i, /\banalytics\.load\s*\(/i],
	},
	{
		id: "posthog",
		name: "PostHog",
		patterns: [/posthog-js/i, /\bposthog\.init\s*\(/i],
	},
	{
		id: "meta-pixel",
		name: "Meta Pixel",
		patterns: [/connect\.facebook\.net\/.*\/fbevents\.js/i, /\bfbq\s*\(/i],
	},
	{
		id: "adobe-analytics",
		name: "Adobe Analytics / Launch",
		patterns: [/assets\.adobedtm\.com/i, /\bs_gi\s*\(/i],
	},
];

export function checkAnalytics(context: AuditContext) {
	const html = context.html || "";
	
	// Pre-filter: only run full regex if HTML contains analytics-related substrings
	const hasGoogle = html.includes("google") || html.includes("googletagmanager") || html.includes("gtag");
	const hasFacebook = html.includes("facebook") || html.includes("fbevents") || html.includes("fbq");
	
	const detectedProviders = analyticsProviders
		.filter((provider) => {
			// Skip full regex testing when HTML clearly lacks the provider's indicators
			if (provider.id === "meta-pixel" && !hasFacebook) return false;
			if ((provider.id === "google-analytics" || provider.id === "google-tag-manager") && !hasGoogle) return false;
			return provider.patterns.some((pattern) => pattern.test(html));
		})
		.map((provider) => ({
			id: provider.id,
			name: provider.name,
		}));
	
	if (detectedProviders.length === 0) {
		return createCheckResult({
			id: "analytics",
			label: "Analytics Tracking",
			category: "Technical",
			status: "info",
			summary:
				"No common analytics or tag-manager snippet was detected in the raw HTML.",
			explanation:
				"This only checks raw HTML for known snippets and does not connect to provider APIs.",
			recommendation:
				"Add analytics only if measurement is part of the site's operating requirements. Analytics tracking is not a Google ranking factor, but verifying your site with Search Console helps monitor performance.",
		});
	}
	
	return createCheckResult({
		id: "analytics",
		label: "Analytics Tracking",
		category: "Technical",
		status: "pass",
		summary: `${ detectedProviders.length } analytics or tag-manager provider(s) were detected.`,
		explanation: `Detected: ${ detectedProviders.map((provider) => provider.name).join(", ") }.`,
		recommendation:
			"Use provider reporting to verify that page views and events are collected correctly. While analytics tools don't directly influence Google rankings, they are essential for measuring SEO success.",
	});
}
