import axios from "axios";
import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext, CheckResult } from "../types.js";

interface AuditConfig {
	recommendation: string;
	codeExample: string;
	aiPrompt: string;
}

const COMMON_AUDITS: Record<string, AuditConfig> = {
	"render-blocking-resources": {
		recommendation: "Defer non-essential JavaScript by adding the defer/async attribute to script tags, and preload or load non-critical CSS asynchronously.",
		codeExample: `<script src="bundle.js" defer></script>\n<!-- Inline critical CSS, defer non-critical -->\n<link rel="preload" href="style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">`,
		aiPrompt: "Show me how to eliminate render-blocking CSS and JS resources on my page to improve the First Contentful Paint score."
	},
	"unused-javascript": {
		recommendation: "Reduce unused JavaScript by code splitting, deferring load of non-critical bundles, or removing unused third-party scripts.",
		codeExample: `// Use dynamic import for code splitting\nimport('./heavyModule.js').then((module) => {\n  module.run();\n});`,
		aiPrompt: "Provide strategies and code examples for reducing unused JavaScript on a webpage to improve loading speed."
	},
	"unused-css-rules": {
		recommendation: "Remove unused rules from stylesheets or split CSS into multiple files loaded conditionally based on media queries.",
		codeExample: `<link rel="stylesheet" href="print.css" media="print">\n<link rel="stylesheet" href="desktop.css" media="screen and (min-width: 768px)">`,
		aiPrompt: "How can I find and remove unused CSS rules from my stylesheet, or load stylesheets conditionally to speed up page load?"
	},
	"uses-optimized-images": {
		recommendation: "Serve images in next-gen formats (WebP/AVIF), compress them, specify explicit dimensions, and enable lazy loading for offscreen images.",
		codeExample: `<img src="hero.webp" loading="lazy" width="800" height="600" alt="Hero image">`,
		aiPrompt: "Explain how to optimize images using WebP/AVIF formats, lazy loading, and responsive width/height attributes."
	},
	"uses-responsive-images": {
		recommendation: "Provide appropriately-sized images for different screen resolutions and viewports using srcset and sizes.",
		codeExample: `<img src="small.jpg" srcset="large.jpg 1024w, medium.jpg 640w, small.jpg 320w" sizes="(min-width: 36em) 33.3vw, 100vw" alt="Example">`,
		aiPrompt: "Provide code examples and explain how to use responsive images with srcset and sizes to improve loading performance on mobile."
	},
	"offscreen-images": {
		recommendation: "Enable lazy loading for offscreen images so they are only loaded when they enter the viewport.",
		codeExample: `<img src="image.jpg" loading="lazy" alt="Lazy loaded image">`,
		aiPrompt: "How do I implement native lazy loading for images that are below the fold (offscreen) to speed up initial page load?"
	},
	"unminified-javascript": {
		recommendation: "Minify JavaScript files to reduce network payload sizes and speed up script parsing time.",
		codeExample: `// Production build configuration (webpack/esbuild/vite)\n// Use minimizer: true or minify: true`,
		aiPrompt: "Explain the benefits of JavaScript minification and how to set up esbuild or terser to minify JS files in production."
	},
	"unminified-css": {
		recommendation: "Minify CSS stylesheets to reduce file sizes and browser parsing times.",
		codeExample: `/* Pre-minified CSS stylesheet */\nbody{margin:0;font-family:sans-serif}`,
		aiPrompt: "How can I set up a CSS minifier to compress my stylesheets and reduce initial load time?"
	},
	"uses-text-compression": {
		recommendation: "Enable Gzip or Brotli compression on your web server for text-based resources (HTML, CSS, JS).",
		codeExample: `# Nginx config for Gzip\ngzip on;\ngzip_types text/plain text/css application/javascript;`,
		aiPrompt: "Provide a configuration guide for enabling Brotli or Gzip compression on Nginx and Apache web servers."
	},
	"server-response-time": {
		recommendation: "Improve server response time (TTFB) by caching database queries, optimizing server-side routing, or using a CDN.",
		codeExample: `// Example Cache-Control header\nres.setHeader('Cache-Control', 'public, max-age=3600');`,
		aiPrompt: "What are the key strategies to reduce server response time (TTFB) and improve performance under load?"
	}
};

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
	recommendation: "Review the diagnostics and optimize resources by compressing assets, utilizing browser caching, and deferring non-essential scripts.",
	codeExample: `<!-- Enable text compression and cache-control on server -->\nCache-Control: public, max-age=31536000`,
	aiPrompt: "Explain how to audit and optimize a website's core web vitals and overall performance score using Google's best practices."
};

function cleanDescription(text: string): string {
	return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

const defaultFetchJson = async(url: string) => {
	const response = await axios.get(url, {
		timeout: 20000,
		headers: {
			Accept: "application/json",
		},
	});
	return response.data;
};

export async function checkPageSpeed(
	context: AuditContext,
	strategy: "desktop" | "mobile",
	fetchJson = defaultFetchJson,
): Promise<CheckResult> {
	const checkId = strategy === "desktop" ? "pagespeed-desktop" : "pagespeed-mobile";
	const label = strategy === "desktop" ? "PageSpeed Desktop" : "PageSpeed Mobile";
	
	try {
		const apiKey = process.env.PAGESPEED_API_KEY;
		const targetUrl = context.finalUrl;
		const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${ encodeURIComponent(targetUrl) }&strategy=${ strategy }&category=performance${ apiKey ? `&key=${ apiKey }` : "" }`;
		
		const data = await fetchJson(apiUrl);
		
		if (!data?.lighthouseResult?.categories?.performance) {
			throw new Error("Invalid response format from PageSpeed Insights API.");
		}

		// Determine numeric score (0-100) and overall status
		const performanceScore = data.lighthouseResult.categories.performance.score;
		let score: number | null = null;
		let status: CheckResult["status"] = "fail";

		if (typeof performanceScore === "number") {
			score = Math.round(performanceScore * 100);
			status = "pass";
			if (score < 50) {
				status = "fail";
			} else if (score < 90) {
				status = "warning";
			}
		}

		// PageSpeed API exposes different keys in various responses; prefer overall_category or assessment
		const cruxAssessment =
			data.loadingExperience?.overall_category
			|| data.loadingExperience?.assessment
			|| data.originLoadingExperience?.overall_category
			|| "NO_DATA";

		const audits = data.lighthouseResult.audits || {};
		const fcp = audits["first-contentful-paint"]?.displayValue || "N/A";
		const lcp = audits["largest-contentful-paint"]?.displayValue || "N/A";
		const cls = audits["cumulative-layout-shift"]?.displayValue || "N/A";
		const tbt = audits["total-blocking-time"]?.displayValue || "N/A";
		const speedIndex = audits["speed-index"]?.displayValue || "N/A";
		
		const allFailingAudits: { id: string; title: string; score: number; displayValue?: string; description: string }[] = [];
		for (const [auditId, audit] of Object.entries(audits)) {
			if (audit && typeof audit === "object" && "score" in (audit as any)) {
				const auditScore = (audit as any).score;
				if (auditScore !== null && auditScore < 0.9) {
					allFailingAudits.push({
						id: auditId,
						title: (audit as any).title || auditId,
						score: auditScore,
						displayValue: (audit as any).displayValue,
						description: (audit as any).description || ""
					});
				}
			}
		}
		
		// Sort by score ascending (worst first)
		allFailingAudits.sort((a, b) => a.score - b.score);
		
		// Construct the explanation (Found) listing the main metrics and issues
		let explanation = `Performance score: ${ score !== null ? `${score}/100` : "N/A" }. Core Web Vitals assessment: ${ cruxAssessment }.\n\n` +
			`Key Performance Metrics:\n` +
			`- First Contentful Paint (FCP): ${ fcp }\n` +
			`- Largest Contentful Paint (LCP): ${ lcp }\n` +
			`- Cumulative Layout Shift (CLS): ${ cls }\n` +
			`- Total Blocking Time (TBT): ${ tbt }\n` +
			`- Speed Index: ${ speedIndex }`;
		
		if (allFailingAudits.length > 0) {
			explanation += `\n\nProblems to fix:\n` +
				allFailingAudits.slice(0, 5).map(a => `- **${ a.title }**${ a.displayValue ? ` (${ a.displayValue })` : "" }: ${ cleanDescription(a.description) }`).join("\n");
		}
		
		// Select recommendation, codeExample, and aiPrompt based on the worst failing audit that we have a mapping for
		let recommendation = DEFAULT_AUDIT_CONFIG.recommendation;
		let codeExample = DEFAULT_AUDIT_CONFIG.codeExample;
		let aiPrompt = DEFAULT_AUDIT_CONFIG.aiPrompt;
		
		const worstMappedAudit = allFailingAudits.find(a => COMMON_AUDITS[a.id]);
		if (worstMappedAudit) {
			const config = COMMON_AUDITS[worstMappedAudit.id];
			if (config) {
				recommendation = config.recommendation;
				codeExample = config.codeExample;
				aiPrompt = config.aiPrompt;
			}
		} else if (allFailingAudits.length > 0) {
			// Fallback to the top failing unmapped audit description
			const topAudit = allFailingAudits[0];
			if (topAudit) {
				recommendation = cleanDescription(topAudit.description);
				aiPrompt = `Explain how to fix the issue "${ topAudit.title }" for my web page to improve its PageSpeed performance score.`;
			}
		}
		
		return createCheckResult({
			id: checkId,
			label,
			category: "Page Speed",
			status,
			summary: `Performance score is ${ score !== null ? `${score}/100` : "N/A" }.`,
			explanation,
			recommendation,
			codeExample,
			aiPrompt
		});
		
	} catch (error: any) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		return checkPageSpeedSimulated(context, strategy, errorMsg);
	}
}

function checkPageSpeedSimulated(
	context: AuditContext,
	strategy: "desktop" | "mobile",
	errorMsg: string
): CheckResult {
	const checkId = strategy === "desktop" ? "pagespeed-desktop" : "pagespeed-mobile";
	const label = strategy === "desktop" ? "PageSpeed Desktop" : "PageSpeed Mobile";
	
	let renderBlockingScriptsCount = 0;
	context.$("head script").each((_i, el) => {
		const src = context.$(el).attr("src");
		const defer = context.$(el).attr("defer");
		const async = context.$(el).attr("async");
		const type = context.$(el).attr("type");
		
		if (src && defer === undefined && async === undefined) {
			if (!type || type.toLowerCase().includes("javascript") || type.toLowerCase() === "module") {
				if (type !== "module") {
					renderBlockingScriptsCount++;
				}
			}
		}
	});
	
	const stylesheetCount = context.$("head link[rel='stylesheet']").length;
	const htmlSizeKb = context.html.length / 1024;
	
	let hasViewport = false;
	context.$("head meta[name='viewport']").each((_i, el) => {
		const content = context.$(el).attr("content") || "";
		if (content.toLowerCase().includes("width=device-width")) {
			hasViewport = true;
		}
	});
	
	// Simulated scoring
	let simulatedScore = 100;
	simulatedScore -= renderBlockingScriptsCount * 10;
	simulatedScore -= stylesheetCount * 5;
	
	if (htmlSizeKb > 150) {
		simulatedScore -= 15;
	} else if (htmlSizeKb > 50) {
		simulatedScore -= 5;
	}
	
	if (strategy === "mobile" && !hasViewport) {
		simulatedScore -= 15;
	}
	
	simulatedScore = Math.max(10, Math.min(100, simulatedScore));
	
	let status: CheckResult["status"] = "pass";
	if (simulatedScore < 50) {
		status = "fail";
	} else if (simulatedScore < 90) {
		status = "warning";
	}
	
	const explanation = `Could not contact the PageSpeed Insights API (Error: ${ errorMsg }). Displaying local simulation.\n\n` +
		`Key Simulated Metrics:\n` +
		`- Render-blocking scripts in head: ${ renderBlockingScriptsCount }\n` +
		`- External stylesheets in head: ${ stylesheetCount }\n` +
		`- HTML payload size: ${ htmlSizeKb.toFixed(1) } KB\n` +
		`- Viewport configured: ${ hasViewport ? "Yes" : "No" }`;
	
	let recommendation = DEFAULT_AUDIT_CONFIG.recommendation;
	let codeExample = DEFAULT_AUDIT_CONFIG.codeExample;
	let aiPrompt = DEFAULT_AUDIT_CONFIG.aiPrompt;
	
	if (renderBlockingScriptsCount > 0) {
		const config = COMMON_AUDITS["render-blocking-resources"];
		if (config) {
			recommendation = config.recommendation;
			codeExample = config.codeExample;
			aiPrompt = config.aiPrompt;
		}
	} else if (stylesheetCount > 3) {
		const config = COMMON_AUDITS["unused-css-rules"];
		if (config) {
			recommendation = config.recommendation;
			codeExample = config.codeExample;
			aiPrompt = config.aiPrompt;
		}
	} else if (htmlSizeKb > 150) {
		recommendation = "Reduce page payload size by minifying HTML and optimizing assets.";
		codeExample = `<!-- Minify HTML and enable compression on server -->`;
		aiPrompt = "Explain how to reduce initial HTML page size and optimize assets for page speed.";
	}
	
	return createCheckResult({
		id: checkId,
		label,
		category: "Page Speed",
		status,
		summary: `Performance score (simulated) is ${ simulatedScore }/100.`,
		explanation,
		recommendation,
		codeExample,
		aiPrompt
	});
}
