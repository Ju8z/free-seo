import type { AuditContext, BaseCheckStatus } from "../types.js";

export interface FacebookPageLinkResult {
	found: boolean;
	url: string | null;
}

export interface OpenGraphTagsResult {
	status: BaseCheckStatus;
	found: string[];
	missing: string[];
}

export interface FacebookPixelResult {
	found: boolean;
}

export interface XAccountLinkResult {
	found: boolean;
	url: string | null;
}

export interface XCardTagsResult {
	status: BaseCheckStatus;
	found: string[];
	missing: string[];
}

export interface InstagramLinkResult {
	found: boolean;
	url: string | null;
}

export interface LinkedInLinkResult {
	found: boolean;
	url: string | null;
}

export interface YouTubeChannelLinkResult {
	found: boolean;
	url: string | null;
	channelId: string | null;
}

function resolveHref(href: string, baseUrl: string): URL | null {
	try {
		return new URL(href, baseUrl);
	} catch {
		return null;
	}
}

function isFacebookHost(hostname: string): boolean {
	return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
}

function isXHost(hostname: string): boolean {
	return hostname === "x.com" || hostname === "twitter.com";
}

function isInstagramHost(hostname: string): boolean {
	return hostname === "instagram.com" || hostname === "www.instagram.com";
}

function isLinkedInHost(hostname: string): boolean {
	return hostname === "linkedin.com" || hostname === "www.linkedin.com";
}

function isYouTubeHost(hostname: string): boolean {
	return (
		hostname === "youtube.com" ||
		hostname === "www.youtube.com" ||
		hostname === "youtu.be"
	);
}

const ignoredXPaths = new Set(["intent", "i", "hashtag"]);
const ignoredInstagramPaths = new Set(["p", "reel", "explore", "direct", "accounts"]);
const ignoredLinkedInPaths = new Set(["feed", "jobs", "messaging"]);
const ignoredYouTubePaths = new Set(["watch", "shorts", "embed"]);

interface AllSocialLinks {
	facebookResult: FacebookPageLinkResult;
	xResult: XAccountLinkResult;
	instagramResult: InstagramLinkResult;
	linkedinResult: LinkedInLinkResult;
	youtubeResult: YouTubeChannelLinkResult;
}

export function detectAllSocialLinks(context: AuditContext): AllSocialLinks {
	const $ = context.$;
	const baseUrl = context.finalUrl || "https://example.com/";

	let facebookResult: FacebookPageLinkResult = { found: false, url: null };
	let xResult: XAccountLinkResult = { found: false, url: null };
	let instagramResult: InstagramLinkResult = { found: false, url: null };
	let linkedinResult: LinkedInLinkResult = { found: false, url: null };
	let youtubeResult: YouTubeChannelLinkResult = { found: false, url: null, channelId: null };

	for (const element of $("a[href]").toArray()) {
		if (
			facebookResult.found &&
			xResult.found &&
			instagramResult.found &&
			linkedinResult.found &&
			youtubeResult.found
		) {
			break;
		}

		const raw = $(element).attr("href");
		if (!raw) continue;

		const resolved = resolveHref(raw, baseUrl);
		if (!resolved) continue;

		const hostname = resolved.hostname;
		const pathname = resolved.pathname;
		const parts = pathname.split("/").filter(Boolean);

		if (!facebookResult.found && isFacebookHost(hostname)) {
			if (
				pathname !== "/dialog/oauth" &&
				!pathname.startsWith("/dialog/") &&
				pathname !== "/login" &&
				!pathname.startsWith("/login/") &&
				pathname !== "/sharer.php" &&
				!pathname.startsWith("/sharer.php?")
			) {
				facebookResult = { found: true, url: resolved.href };
			}
		}

		if (!xResult.found && isXHost(hostname)) {
			if (parts.length === 1) {
				const first = parts[0]!;
				if (!ignoredXPaths.has(first)) {
					xResult = { found: true, url: resolved.href };
				}
			}
		}

		if (!instagramResult.found && isInstagramHost(hostname)) {
			if (parts.length === 1 && !ignoredInstagramPaths.has(parts[0]!)) {
				instagramResult = { found: true, url: resolved.href };
			}
		}

		if (!linkedinResult.found && isLinkedInHost(hostname)) {
			if (parts.length >= 1) {
				const firstLower = parts[0]!.toLowerCase();
				if (!(ignoredLinkedInPaths.has(firstLower) && (parts.length === 1 || parts.length >= 2))) {
					linkedinResult = { found: true, url: resolved.href };
				}
			}
		}

		if (!youtubeResult.found && isYouTubeHost(hostname)) {
			const first = parts[0]?.toLowerCase();
			if (first && !ignoredYouTubePaths.has(first)) {
				const validPrefixes = ["channel", "@", "c", "user"];
				if (parts.length >= 2 && validPrefixes.includes(first)) {
					let channelId: string | null = null;
					if (first === "channel") {
						channelId = parts[1] || null;
					}
					youtubeResult = { found: true, url: resolved.href, channelId };
				} else if (parts.length === 1 && first.startsWith("@")) {
					youtubeResult = { found: true, url: resolved.href, channelId: null };
				}
			}
		}
	}

	const result: AllSocialLinks = { facebookResult, xResult, instagramResult, linkedinResult, youtubeResult };
	return result;
}

export function detectFacebookPageLink(context: AuditContext): FacebookPageLinkResult {
	return detectAllSocialLinks(context).facebookResult;
}

export function detectXAccountLink(context: AuditContext): XAccountLinkResult {
	return detectAllSocialLinks(context).xResult;
}

export function detectInstagramLink(context: AuditContext): InstagramLinkResult {
	return detectAllSocialLinks(context).instagramResult;
}

export function detectLinkedInLink(context: AuditContext): LinkedInLinkResult {
	return detectAllSocialLinks(context).linkedinResult;
}

export function detectYouTubeChannelLink(context: AuditContext): YouTubeChannelLinkResult {
	return detectAllSocialLinks(context).youtubeResult;
}

export function detectOpenGraphTags(
	context: AuditContext,
): OpenGraphTagsResult {
	const $ = context.$;
	const coreTags = [
		"og:title",
		"og:description",
		"og:image",
		"og:url",
		"og:type",
	];

	const found: string[] = [];
	const foundProps = new Set<string>();

	for (const element of $('meta[property^="og:"]').toArray()) {
		const prop = ($(element).attr("property") || "").trim().toLowerCase();
		if (coreTags.includes(prop) && !foundProps.has(prop)) {
			found.push(prop);
			foundProps.add(prop);
		}
	}

	const missing = coreTags.filter((tag) => !foundProps.has(tag));

	if (found.length === 0) {
		return { status: "fail", found, missing };
	}
	if (found.length === 5) {
		return { status: "pass", found, missing };
	}
	return { status: "warning", found, missing };
}

export function detectFacebookPixel(
	context: AuditContext,
): FacebookPixelResult {
	const html = context.html || "";
	const patterns = [
		/\bfbq\s*\(/i,
		/\bfbq\.push\s*\(/i,
		/connect\.facebook\.net/i,
		/fbevents\.js/i,
	];
	const found = patterns.some((pattern) => pattern.test(html));
	return { found };
}

export function detectXCardTags(
	context: AuditContext,
): XCardTagsResult {
	const $ = context.$;
	const coreTags = [
		"twitter:card",
		"twitter:title",
		"twitter:description",
		"twitter:image",
		"twitter:site",
		"twitter:creator",
	];

	const found: string[] = [];
	const foundNames = new Set<string>();

	for (const element of $('meta[name^="twitter:"]').toArray()) {
		const name = ($(element).attr("name") || "").trim().toLowerCase();
		if (coreTags.includes(name) && !foundNames.has(name)) {
			found.push(name);
			foundNames.add(name);
		}
	}

	const missing = coreTags.filter((tag) => !foundNames.has(tag));

	if (found.length === 0) {
		return { status: "fail", found, missing };
	}
	if (found.length === 6) {
		return { status: "pass", found, missing };
	}
	return { status: "warning", found, missing };
}
