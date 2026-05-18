import { utilityClient } from "./httpClients.js";
import { fetchTextWithRedirects } from "./fetchText.js";
import { evaluateRobotsAccess } from "./robots.js";
import { getGeoCheckScore } from "./geoScoring.js";
import { buildSampleLlmsTxtTemplate } from "./llmsTxtTemplate.js";
import type { AuditContext, FetchTextResult, GeoLlmsTxtResult, } from "../types.js";

export interface LinkProbeResult {
	url: string;
	statusCode: number | null;
	ok: boolean;
	redirectsExceeded: boolean;
	error: string | null;
}

export type TextFetcher = (url: string) => Promise<FetchTextResult>;
export type LinkProbe = (url: string) => Promise<LinkProbeResult>;

const maxLlmsTxtSizeBytes = 200_000;
const privateUrlPattern = /(?:\/admin\b|\/wp-admin\b|staging|localhost|\.local\b|\/login\b)/i;

// Pre-compiled regex patterns to avoid recompilation on every function call
const CONTENT_TYPE_REGEX = /text\/plain|text\/markdown|text\/x-markdown|application\/octet-stream/i;
const H1_REGEX = /^#\s+\S+/m;
const REDIRECT_REGEX = /redirect/i;
const SECTION_REGEX = /^#{2,6}\s+(.+)$/;
const NEWLINE_REGEX = /\r?\n/;
const LINK_PATTERN_REGEX = /\[[^\]]+\]\(([^)\s]+)\)|https?:\/\/[^\s)]+/gi;
const USEFUL_LINK_REGEX = /\/(?:about|services?|contact|pricing|docs|blog|resources?|sitemap\.xml)(?:[/?#]|$)/i;

export async function checkGeoLlmsTxt(
	context: AuditContext,
	fetchText: TextFetcher = fetchLlmsTxt,
	probeLink: LinkProbe = probeLlmsTxtLink,
): Promise<GeoLlmsTxtResult> {
	const llmsTxtUrl = new URL("/llms.txt", context.finalUrl).href;
	const sampleTemplate = buildSampleLlmsTxtTemplate(context.finalUrl);
	const issues: string[] = [];
	const recommendations: string[] = [];
	
	if (context.robots.found && !evaluateRobotsAccess(context.robots.content, llmsTxtUrl).allowed) {
		issues.push("llms.txt is blocked by robots.txt.");
		recommendations.push("Allow /llms.txt in robots.txt so AI crawlers can read it.");
	}
	
	let response: FetchTextResult;
	try {
		response = await fetchText(llmsTxtUrl);
	} catch (error) {
		issues.push(
			error instanceof Error
				? `llms.txt could not be requested: ${ error.message }`
				: "llms.txt could not be requested.",
		);
		recommendations.push(
			"Create a Markdown llms.txt file at the domain root that summarizes the site and links to the most useful canonical pages for AI systems.",
		);
		return buildResult({
			status: "warning",
			exists: false,
			url: llmsTxtUrl,
			statusCode: null,
			contentType: null,
			fileSizeBytes: null,
			linkCount: 0,
			validLinks: 0,
			brokenLinks: 0,
			blockedLinks: 0,
			sections: [],
			issues,
			recommendations,
			sampleTemplate,
		});
	}
	
	const exists = response.statusCode >= 200 && response.statusCode < 300;
	const contentType = getHeader(response.headers, "content-type");
	const fileSizeBytes = Buffer.byteLength(response.text || "", "utf8");
	if (!exists) {
		issues.push(`llms.txt returned HTTP ${ response.statusCode }.`);
		recommendations.push(
			"Create a Markdown llms.txt file at the domain root that summarizes the site and links to the most useful canonical pages for AI systems.",
		);
		return buildResult({
			status: "warning",
			exists: false,
			url: response.url || llmsTxtUrl,
			statusCode: response.statusCode,
			contentType,
			fileSizeBytes,
			linkCount: 0,
			validLinks: 0,
			brokenLinks: 0,
			blockedLinks: 0,
			sections: [],
			issues,
			recommendations,
			sampleTemplate,
		});
	}
	
	if (contentType && !CONTENT_TYPE_REGEX.test(contentType)) {
		issues.push(`llms.txt content type is unusual: ${ contentType }.`);
		recommendations.push("Serve llms.txt as text/plain or text/markdown.");
	}
	
	if (fileSizeBytes > maxLlmsTxtSizeBytes) {
		issues.push("llms.txt is very large and may be difficult for AI systems to use.");
		recommendations.push("Keep llms.txt concise and link to canonical resources instead of pasting large content blocks.");
	}
	
	const sections = extractSections(response.text);
	if (!H1_REGEX.test(response.text)) {
		issues.push("llms.txt is missing a clear H1 title.");
	}
	if (sections.length === 0) {
		issues.push("llms.txt does not include section headings.");
	}
	if (!hasShortSummary(response.text)) {
		issues.push("llms.txt is missing a short site or business summary.");
	}
	
	const links = extractLinks(response.text, response.url || llmsTxtUrl);
	let validLinks = 0;
	let brokenLinks = 0;
	let blockedLinks = 0;
	let usefulLinks = 0;

	const linksToProbe = links.slice(0, 20);
	const probeResults = await Promise.all(
		linksToProbe.map(async (link) => {
			if (privateUrlPattern.test(link)) {
				issues.push(`llms.txt contains a private or utility-looking URL: ${ link }.`);
				return { link, broken: true, blocked: false, valid: false, useful: false };
			}
			
			if (context.robots.found && !evaluateRobotsAccess(context.robots.content, link).allowed) {
				return { link, broken: false, blocked: true, valid: false, useful: false };
			}
			
			const probeResult = await probeLink(link);
			const useful = probeResult.ok && isUsefulCanonicalLink(link);
			return { link, broken: false, blocked: false, valid: probeResult.ok, useful, probeResult };
		})
	);

	for (const result of probeResults) {
		if (result.broken) {
			brokenLinks += 1;
		} else if (result.blocked) {
			blockedLinks += 1;
		} else if (result.valid) {
			validLinks += 1;
			if (result.useful) usefulLinks += 1;
		} else {
			brokenLinks += 1;
			if (result.probeResult?.redirectsExceeded) {
				issues.push(`A link redirects excessively: ${ result.link }.`);
			}
		}
	}
	
	if (links.length === 0) {
		issues.push("llms.txt does not include links to useful canonical pages.");
		recommendations.push("Add links to about, services, contact, sitemap, docs, blog, pricing, or other high-value resources.");
	}
	
	if (brokenLinks > 0) {
		issues.push(`${ brokenLinks } llms.txt link(s) are broken or unreachable.`);
		recommendations.push("Replace broken llms.txt links with stable canonical URLs.");
	}
	
	if (blockedLinks > 0) {
		issues.push(`${ blockedLinks } llms.txt link(s) are blocked by robots.txt.`);
		recommendations.push("Only include links that AI crawlers are allowed to request.");
	}
	
	if (links.length > 0 && usefulLinks === 0) {
		issues.push("llms.txt links appear to point mostly to utility or low-value pages.");
	}
	
	const status = issues.length === 0
		? "pass"
		: links.length > 0 && validLinks > 0
			? "warning"
			: "fail";
	
	return buildResult({
		status,
		exists: true,
		url: response.url || llmsTxtUrl,
		statusCode: response.statusCode,
		contentType,
		fileSizeBytes,
		linkCount: links.length,
		validLinks,
		brokenLinks,
		blockedLinks,
		sections,
		issues,
		recommendations: recommendations.length > 0
			? recommendations
			: ["Keep llms.txt concise, current, and focused on canonical resources."],
		sampleTemplate,
	});
}

async function fetchLlmsTxt(url: string): Promise<FetchTextResult> {
	return await fetchTextWithRedirects(url, utilityClient, {
		label: "llms.txt URL",
		maxRedirects: 3,
	});
}

async function probeLlmsTxtLink(url: string): Promise<LinkProbeResult> {
	try {
		const response = await fetchTextWithRedirects(url, utilityClient, {
			label: "llms.txt link",
			maxRedirects: 3,
		});
		return {
			url: response.url,
			statusCode: response.statusCode,
			ok: response.statusCode >= 200 && response.statusCode < 300,
			redirectsExceeded: false,
			error: null,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return {
			url,
			statusCode: null,
			ok: false,
			redirectsExceeded: REDIRECT_REGEX.test(message),
			error: message,
		};
	}
}

function buildResult(params: Omit<GeoLlmsTxtResult, "score" | "qualityStatus">): GeoLlmsTxtResult {
	return {
		...params,
		score: getGeoCheckScore(params.status),
		qualityStatus: params.status,
		recommendations: Array.from(new Set(params.recommendations)),
	};
}

function extractSections(text: string): string[] {
	return String(text ?? "")
		.split(NEWLINE_REGEX)
		.map((line) => line.match(SECTION_REGEX)?.[1])
		.filter(Boolean)
		.map((section) => section!.trim());
}

function extractLinks(
	text: string,
	baseUrl: string,
): string[] {
	const links = new Set<string>();
	for (const match of String(text ?? "").matchAll(LINK_PATTERN_REGEX)) {
		const rawUrl = match[1] || match[0];
		try {
			const parsedUrl = new URL(rawUrl, baseUrl);
			parsedUrl.hash = "";
			links.add(parsedUrl.href);
		} catch {
			// Ignore unresolvable link-like text; quality checks handle low link counts.
		}
	}
	return [...links];
}

function hasShortSummary(text: string): boolean {
	return String(text ?? "")
		.split(NEWLINE_REGEX)
		.some((line) => {
			const trimmedLine = line.trim();
			return trimmedLine.length >= 30 && !trimmedLine.startsWith("#") && !trimmedLine.startsWith("-");
		});
}

function isUsefulCanonicalLink(url: string): boolean {
	return USEFUL_LINK_REGEX.test(url);
}

function getHeader(
	headers: Record<string, string | string[] | undefined>,
	name: string,
): string | null {
	const value = headers[name] || headers[name.toLowerCase()];
	return Array.isArray(value) ? value.join(", ") : value || null;
}
