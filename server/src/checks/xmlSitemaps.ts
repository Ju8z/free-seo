import { XMLParser } from "fast-xml-parser";
import { utilityClient } from "../services/httpClients.js";
import { fetchTextWithRedirects } from "../services/fetchText.js";
import { getSitemapUrlsFromRobots } from "../services/robots.js";
import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext, SitemapProbeResult, } from "../types.js";

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	allowBooleanAttributes: true,
});

export async function checkXmlSitemaps(
	context: AuditContext,
) {
	const sitemapUrls = getCandidateSitemapUrls(context);
	
	const probeResults = await Promise.all(
		sitemapUrls.map((url) => probeSitemap(url))
	);
	
	const discoveredSitemaps = probeResults.filter((result) => result.valid);
	
		const domain = new URL(context.finalUrl).hostname;

		if (discoveredSitemaps.length === 0) {
		return createCheckResult({
			id: "xml-sitemaps",
			label: "XML Sitemaps",
			category: "Indexing",
			status: "warning",
			summary:
				"No valid XML sitemap was found in robots.txt or common sitemap paths.",
			explanation: `Checked ${ sitemapUrls.length } sitemap URL(s).`,
			recommendation:
				"Generate an XML Sitemap and reference its URL in your robots.txt. This is Google's preferred, most efficient method for discovering new or updated URLs.",
			codeExample: `# robots.txt\nSitemap: https://${domain}/sitemap.xml\n\n# sitemap.xml structure\n<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://${domain}/page</loc>\n  </url>\n</urlset>`,
			aiPrompt: `No valid XML sitemap was found. Create an XML sitemap listing your important pages and reference it in robots.txt with: Sitemap: https://${domain}/sitemap.xml`,
		});
	}
	
	return createCheckResult({
		id: "xml-sitemaps",
		label: "XML Sitemaps",
		category: "Indexing",
		status: "pass",
		summary: `${ discoveredSitemaps.length } valid XML sitemap(s) were found.`,
		explanation: `Detected types: ${ [...new Set(discoveredSitemaps.map((s) => s.type))].join(", ") }.`,
		recommendation:
			"Keep your XML sitemaps up to date and correctly listed in robots.txt so Google can rapidly discover new content.",
	});
}

function getCandidateSitemapUrls(
	context: AuditContext,
): string[] {
	const root = new URL(context.finalUrl);
	const fallbackUrls = [
		new URL("/sitemap.xml", root).href,
		new URL("/sitemap_index.xml", root).href,
	];
	
	const robotsUrls = getSitemapUrlsFromRobots(
		context.robots.content,
	)
		.map((url) => {
			try {
				return new URL(url, root).href;
			} catch {
				return null;
			}
		})
		.filter(Boolean) as string[];
	
	return [...new Set([...robotsUrls, ...fallbackUrls])];
}

async function probeSitemap(
	url: string,
): Promise<SitemapProbeResult> {
	try {
		const response = await fetchTextWithRedirects(
			url,
			utilityClient,
			{
				label: "Sitemap URL",
				maxRedirects: 3,
			},
		);
		
		if (
			response.statusCode < 200 ||
			response.statusCode >= 300
		) {
			return {
				url,
				valid: false,
				statusCode: response.statusCode,
			};
		}
		
		const parsedXml = xmlParser.parse(
			response.text,
		) as Record<string, unknown>;
		const rootName = getRootName(parsedXml);
		if (
			!["urlset", "sitemapindex"].includes(rootName ?? "")
		) {
			return {
				url: response.url,
				valid: false,
				statusCode: response.statusCode,
				type: rootName || "unknown",
			};
		}
		
		return {
			url: response.url,
			valid: true,
			statusCode: response.statusCode,
			type: rootName ?? undefined,
		};
	} catch (error) {
		return {
			url,
			valid: false,
			statusCode: null,
			error: error instanceof Error
				? error.message
				: "Unknown error",
		};
	}
}

function getRootName(
	parsedXml: Record<string, unknown>,
): string | null {
	return (
		Object.keys(parsedXml || {}).find(
			(key) => !key.startsWith("?"),
		) || null
	);
}
