import * as cheerio from "cheerio";
import { type Browser, chromium } from "playwright";
import { parseStructuredData } from "./schemaParser.js";
import { getGeoCheckScore } from "./geoScoring.js";
import { assertPublicHttpUrl } from "./urlSafety.js";
import { countWords, extractVisibleText, normalizeWhitespace } from "../utils/text.js";
import { getBrowserIdleTimeout, getMaxBrowsers } from "./envConfig.js";
import type { AuditContext, BaseCheckStatus, GeoRenderedContentResult, } from "../types.js";

interface ContentSnapshot {
	html: string;
	text: string;
	textLength: number;
	wordCount: number;
	h1Texts: string[];
	mainText: string;
	title: string;
	metaDescription: string;
	internalLinks: string[];
	hasImportantSchema: boolean;
}

export interface PageRenderer {
	render: (url: string) => Promise<string>;
}

export async function checkGeoRenderedContent(
	context: AuditContext,
	renderer: PageRenderer = new PlaywrightPageRenderer(),
): Promise<GeoRenderedContentResult> {
	const rawSnapshot = buildSnapshot(context.html, context.finalUrl, context.$);
	let renderedSnapshot = rawSnapshot;
	let renderError: string | null = null;
	let classified: ReturnType<typeof classifyRenderError> | null = null;
	
	try {
		renderedSnapshot = buildSnapshot(
			await renderer.render(context.finalUrl),
			context.finalUrl,
		);
	} catch (error) {
		renderError = error instanceof Error ? error.message : "Rendering failed.";
		classified = classifyRenderError(error);
	}
	
	const renderingPercentage = calculateRenderingPercentage(
		rawSnapshot.textLength,
		renderedSnapshot.textLength,
	);
	const issues: string[] = [];
	const recommendations: string[] = [];
	const missingRawHeadings = renderedSnapshot.h1Texts.filter(
		(heading) => !rawSnapshot.h1Texts.includes(heading),
	);
	const missingRawInternalLinks = renderedSnapshot.internalLinks.filter(
		(link) => !rawSnapshot.internalLinks.includes(link),
	);
	const contentOnlyAvailableAfterJs = findRenderedOnlyContent(
		rawSnapshot.mainText || rawSnapshot.text,
		renderedSnapshot.mainText || renderedSnapshot.text,
	);
	
	if (renderError && classified) {
		issues.push(classified.userTitle);
		recommendations.push(classified.userRecommendation);
	}
	
	if (renderingPercentage < 80) {
		issues.push(
			`Only ${ renderingPercentage }% of rendered readable content is available in the initial HTML.`,
		);
		recommendations.push(
			"Use server-side rendering, static rendering, or hydration-friendly HTML for main content.",
		);
	}
	
	if (missingRawHeadings.length > 0) {
		issues.push("Some rendered H1 headings are missing from the raw HTML.");
	}
	
	if (missingRawInternalLinks.length > 0) {
		issues.push("Some rendered internal links are missing from the raw HTML.");
		recommendations.push(
			"Ensure important internal links are crawlable in the initial HTML.",
		);
	}
	
	if (!rawSnapshot.title && renderedSnapshot.title) {
		issues.push("Title is only available after JavaScript rendering.");
	}
	
	if (!rawSnapshot.metaDescription && renderedSnapshot.metaDescription) {
		issues.push("Meta description is only available after JavaScript rendering.");
	}
	
	if (!rawSnapshot.hasImportantSchema && renderedSnapshot.hasImportantSchema) {
		issues.push("Important schema appears only after JavaScript rendering.");
		recommendations.push(
			"Place identity schema in the initial HTML where AI and search crawlers can read it reliably.",
		);
	}
	
	const status = getRenderedStatus(renderingPercentage, renderError);
	return {
		status,
		score: getGeoCheckScore(status),
		rawTextLength: rawSnapshot.textLength,
		renderedTextLength: renderedSnapshot.textLength,
		rawWordCount: rawSnapshot.wordCount,
		renderedWordCount: renderedSnapshot.wordCount,
		renderingPercentage,
		missingRawHeadings,
		missingRawInternalLinks,
		contentOnlyAvailableAfterJs,
		rawInternalLinkCount: rawSnapshot.internalLinks.length,
		renderedInternalLinkCount: renderedSnapshot.internalLinks.length,
		rawHasTitle: Boolean(rawSnapshot.title),
		renderedHasTitle: Boolean(renderedSnapshot.title),
		rawHasMetaDescription: Boolean(rawSnapshot.metaDescription),
		renderedHasMetaDescription: Boolean(renderedSnapshot.metaDescription),
		rawHasImportantSchema: rawSnapshot.hasImportantSchema,
		renderedHasImportantSchema: renderedSnapshot.hasImportantSchema,
		renderError,
		issues,
		recommendations: recommendations.length > 0
			? Array.from(new Set(recommendations))
			: ["Keep main headings, body content, internal links, and schema available in the initial HTML."],
	};
}

export function buildSnapshot(
	html: string,
	baseUrl: string,
	preloaded$?: cheerio.CheerioAPI,
): ContentSnapshot {
	const $ = preloaded$ ?? cheerio.load(html || "");
	const text = extractVisibleText($);
	
	// Build a lightweight context for parseStructuredData (only needs $ and baseUrl properties)
	const sdContext = {
		$,
		finalUrl: baseUrl,
		html,
	} as AuditContext;

	return {
		html,
		text,
		textLength: text.length,
		wordCount: countWords(text),
		h1Texts: $("h1")
			.map((_index, element) => normalizeWhitespace($(element).text()))
			.get()
			.filter(Boolean),
		mainText: normalizeWhitespace($("main").text()) || text,
		title: normalizeWhitespace($("head title").first().text()),
		metaDescription: normalizeWhitespace(
			$("head meta")
				.filter((_index, element) =>
					($(element).attr("name") || "").toLowerCase() === "description",
				)
				.first()
				.attr("content"),
		),
		internalLinks: extractInternalLinks($, baseUrl),
		hasImportantSchema: parseStructuredData(sdContext).entities.some((entity) =>
			[
				"Organization",
				"LocalBusiness",
				"ProfessionalService",
				"Service",
				"Person",
				"WebSite",
				"WebPage",
			].includes(entity.type),
		),
	};
}

class PlaywrightPageRenderer implements PageRenderer {
	private static browserPool: Browser[] = [];
	private static readonly MAX_BROWSERS = getMaxBrowsers();
	private static readonly IDLE_TIMEOUT = getBrowserIdleTimeout();
	private static lastUsed: number[] = [];
	
	private static async getBrowser(): Promise<Browser> {
		const now = Date.now();
		
		// Clean up idle browsers
		for (let i = this.browserPool.length - 1 ; i >= 0 ; i--) {
			const lastUsedTime = this.lastUsed[i];
			if (lastUsedTime !== undefined && now - lastUsedTime > this.IDLE_TIMEOUT) {
				try {
					const browser = this.browserPool[i];
					if (browser) {
						await browser.close();
					}
				} catch {
					// Ignore errors during cleanup
				}
				this.browserPool.splice(i, 1);
				this.lastUsed.splice(i, 1);
			}
		}
		
		// Find least recently used browser or create new one
		if (this.browserPool.length < this.MAX_BROWSERS) {
			const browser = await chromium.launch({
				headless: true,
				args: ['--disable-dev-shm-usage', '--no-sandbox']
			});
			this.browserPool.push(browser);
			this.lastUsed.push(now);
			return browser;
		}
		
		// Return least recently used browser
		let oldestIndex = 0;
		let oldestTime = this.lastUsed[0] ?? now;
		for (let i = 1 ; i < this.lastUsed.length ; i++) {
			const time = this.lastUsed[i] ?? now;
			if (time < oldestTime) {
				oldestTime = time;
				oldestIndex = i;
			}
		}
		
		this.lastUsed[oldestIndex] = now;
		const browser = this.browserPool[oldestIndex];
		if (!browser) {
			throw new Error("Browser pool is corrupted");
		}
		return browser;
	}
	
	async render(url: string): Promise<string> {
		const publicUrl = await assertPublicHttpUrl(url, "Rendered page URL");
		const browser = await PlaywrightPageRenderer.getBrowser();
		
		const context = await browser.newContext({
			userAgent: "FreeSEOChecker/0.1 GEO Renderer",
		});
		
		const page = await context.newPage();
		try {
			page.setDefaultTimeout(8000);
			await page.route("**/*", async(route) => {
				const requestUrl = route.request().url();
				if (!["document", "script", "xhr", "fetch"].includes(route.request().resourceType())) {
					await route.abort();
					return;
				}
				
				// Fast path: same-origin requests bypass URL safety checks
				try {
					const reqUrl = new URL(requestUrl);
					if (reqUrl.hostname === publicUrl.hostname) {
						await route.continue();
						return;
					}
				} catch {
					await route.abort();
					return;
				}
				
				try {
					await assertPublicHttpUrl(requestUrl, "Rendered subresource URL");
					await route.continue();
				} catch {
					await route.abort();
				}
			});
			await page.goto(publicUrl.href, {
				waitUntil: "networkidle",
				timeout: 10000,
			});
			return await page.content();
		} finally {
			await context.close();
		}
	}
}

function calculateRenderingPercentage(
	rawTextLength: number,
	renderedTextLength: number,
): number {
	if (renderedTextLength <= 0) {
		return rawTextLength > 0 ? 100 : 0;
	}
	return Math.min(100, Math.round((rawTextLength / renderedTextLength) * 100));
}

function getRenderedStatus(
	renderingPercentage: number,
	renderError: string | null,
): BaseCheckStatus {
	if (renderError) {
		return "warning";
	}
	if (renderingPercentage >= 80) {
		return "pass";
	}
	if (renderingPercentage >= 50) {
		return "warning";
	}
	return "fail";
}

function extractInternalLinks(
	$: cheerio.CheerioAPI,
	baseUrl: string,
): string[] {
	const base = new URL(baseUrl);
	const links = $("a[href]")
		.map((_index, element) => $(element).attr("href") || "")
		.get()
		.map((href) => {
			try {
				const parsedUrl = new URL(href, base);
				parsedUrl.hash = "";
				return parsedUrl.hostname === base.hostname ? parsedUrl.href : null;
			} catch {
				return null;
			}
		})
		.filter(Boolean) as string[];
	return Array.from(new Set(links));
}

function findRenderedOnlyContent(
	rawText: string,
	renderedText: string,
): string[] {
	if (!renderedText || rawText.includes(renderedText)) {
		return [];
	}
	
	return renderedText
		.split(/(?<=[.!?])\s+/)
		.map(normalizeWhitespace)
		.filter((sentence) => sentence.length >= 40 && !rawText.includes(sentence))
		.slice(0, 5);
}

function classifyRenderError(error: unknown): {
	category: "timeout" | "navigation" | "generic";
	userTitle: string;
	userRecommendation: string;
} {
	const userRecommendation =
		"The page could not be fully rendered for this audit. Try the audit again, and ensure essential content lives in the initial HTML so AI crawlers and search-engine bots are not gated on JavaScript execution.";
	
	const message = error instanceof Error ? error.message : "";
	
	const timeoutMatch = message.match(/Timeout (\d+)ms/i);
	if (timeoutMatch) {
		const seconds = Math.round(Number(timeoutMatch[1]) / 1000);
		return {
			category: "timeout",
			userTitle: `Page rendering timed out after ${ seconds } seconds.`,
			userRecommendation,
		};
	}
	if (/timeout/i.test(message)) {
		return {
			category: "timeout",
			userTitle: "Page rendering timed out.",
			userRecommendation,
		};
	}
	
	if (/net::ERR_/.test(message) || /ENOTFOUND|ECONNREFUSED|ECONNRESET/.test(message)) {
		return {
			category: "navigation",
			userTitle: "Page rendering could not load the page.",
			userRecommendation,
		};
	}
	
	return {
		category: "generic",
		userTitle: "Page rendering failed before a snapshot could be captured.",
		userRecommendation,
	};
}
