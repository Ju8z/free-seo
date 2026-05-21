import type { CheckId, SeoCategoryId } from "../types.js";

export interface SeoCategoryConfig {
	id: SeoCategoryId;
	label: string;
	description: string;
	weight: number;
	checks: CheckId[];
	displayChecks?: {
		id: string;
		name: string;
	}[];
}

export const seoCategoryConfigs: SeoCategoryConfig[] = [
	{
		id: "metadata",
		label: "Metadata",
		description: "Titles, descriptions, language, canonical signals, and search-preview metadata.",
		weight: 0.2,
		checks: [
			"title-tag",
			"meta-description",
			"hreflang",
			"language",
			"canonical",
			"search-favicon",
		],
		displayChecks: [
			{ id: "serp-snippet-preview", name: "SERP Snippet Preview" },
		],
	},
	{
		id: "structure",
		label: "Structure",
		description: "Headings and structured data that help crawlers understand page hierarchy.",
		weight: 0.15,
		checks: ["h1", "headings", "structured-data"],
	},
	{
		id: "content",
		label: "Content",
		description: "Readable content depth, keyword consistency, and image alternative text.",
		weight: 0.2,
		checks: [
			"keyword-consistency",
			"content-amount",
			"image-alt",
			"crawlable-links",
			"image-dimensions",
		],
	},
	{
		id: "indexing",
		label: "Indexing",
		description: "Indexability, robots rules, and sitemap discoverability.",
		weight: 0.2,
		checks: [
			"noindex-meta",
			"noindex-header",
			"robots-txt",
			"blocked-by-robots",
			"xml-sitemaps",
		],
	},
	{
		id: "technical",
		label: "Technical",
		description: "Transport security, redirects, analytics, and basic technical signals.",
		weight: 0.15,
		checks: ["ssl-enabled", "https-redirect", "analytics", "mobile-viewport"],
	},
	{
		id: "pagespeed",
		label: "Page Speed",
		description: "Desktop and Mobile PageSpeed index audits and diagnostics.",
		weight: 0.1,
		checks: ["pagespeed-desktop", "pagespeed-mobile"],
	},
	{
		id: "geo",
		label: "Generative Engine Optimization",
		description: "AI crawler readability, entity identity, and llms.txt guidance.",
		weight: 0.1,
		checks: [],
	},
	{
		id: "social",
		label: "Social",
		description: "Social media presence, Open Graph / X Card tags, and platform integration.",
		weight: 0.1,
		checks: [],
	},
];
