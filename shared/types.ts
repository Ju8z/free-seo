// ---- Check primitives ----

export type CheckId =
	| "title-tag"
	| "meta-description"
	| "hreflang"
	| "language"
	| "h1"
	| "headings"
	| "keyword-consistency"
	| "content-amount"
	| "image-alt"
	| "canonical"
	| "noindex-meta"
	| "noindex-header"
	| "ssl-enabled"
	| "https-redirect"
	| "analytics"
	| "structured-data"
	| "robots-txt"
	| "blocked-by-robots"
	| "mobile-viewport"
	| "crawlable-links"
	| "image-dimensions"
	| "search-favicon"
	| "pagespeed-desktop"
	| "pagespeed-mobile"
	| "xml-sitemaps";

export type BaseCheckStatus = "pass" | "warning" | "fail";

export type CheckStatus = BaseCheckStatus | "info";

export type CheckCategory =
	| "Metadata"
	| "Structure"
	| "Content"
	| "Indexing"
	| "Technical"
	| "Page Speed";

export interface CheckResult {
	id: CheckId;
	label: string;
	category: CheckCategory;
	status: CheckStatus;
	summary: string;
	explanation: string;
	recommendation: string;
	codeExample?: string;
	aiPrompt?: string;
}

// ---- Audit ----

export interface StatusSummary {
	pass: number;
	warning: number;
	fail: number;
	info: number;
}

export interface AuditReport {
	input: string;
	normalizedInput: string;
	testedUrl: string;
	finalUrl: string;
	serpPreview: SerpSnippetPreview;
	geo: GeoReport | null;
	seoCategories: SeoCategoriesReport;
	socialResults: SocialResultsReport | null;
	score: number;
	statusSummary: StatusSummary;
	checks: CheckResult[];
	notes: string[];
}

export interface SerpSnippetPreview {
	title: string;
	titleLength: number;
	description: string;
	descriptionLength: number;
	displayUrl: string;
	sourceUrl: string;
}

// ---- SEO categories ----

export type SeoCategoryId =
	| "metadata"
	| "structure"
	| "content"
	| "indexing"
	| "technical"
	| "pagespeed"
	| "geo"
	| "social";

export type AuditCategoryId = SeoCategoryId;

export interface AuditCategoryOption {
	id: AuditCategoryId;
	label: string;
	description: string;
	timeLabel: string;
	minSeconds: number;
	maxSeconds: number;
}

export const auditCategoryOptions = [
	{
		id: "metadata",
		label: "Metadata",
		description: "Titles, descriptions, language, canonical signals, and search-preview metadata.",
		timeLabel: "<5s",
		minSeconds: 0,
		maxSeconds: 5,
	},
	{
		id: "structure",
		label: "Structure",
		description: "Headings and structured data that help crawlers understand page hierarchy.",
		timeLabel: "<5s",
		minSeconds: 0,
		maxSeconds: 5,
	},
	{
		id: "content",
		label: "Content",
		description: "Readable content depth, keyword consistency, links, images, and alt text.",
		timeLabel: "<5s",
		minSeconds: 0,
		maxSeconds: 5,
	},
	{
		id: "indexing",
		label: "Indexing",
		description: "Indexability, robots rules, redirects, and sitemap discoverability.",
		timeLabel: "5-10s",
		minSeconds: 5,
		maxSeconds: 10,
	},
	{
		id: "technical",
		label: "Technical",
		description: "Transport security, HTTPS behavior, analytics, and mobile viewport signals.",
		timeLabel: "5-10s",
		minSeconds: 5,
		maxSeconds: 10,
	},
	{
		id: "pagespeed",
		label: "Page Speed",
		description: "Desktop and mobile PageSpeed checks via the PageSpeed Insights API.",
		timeLabel: "10-25s",
		minSeconds: 10,
		maxSeconds: 25,
	},
	{
		id: "geo",
		label: "GEO",
		description: "AI crawler readability, entity identity, rendered content, and llms.txt guidance.",
		timeLabel: "8-20s",
		minSeconds: 8,
		maxSeconds: 20,
	},
	{
		id: "social",
		label: "Social",
		description: "Social presence, Open Graph / X Card tags, and platform integrations.",
		timeLabel: "5-12s",
		minSeconds: 5,
		maxSeconds: 12,
	},
] as const satisfies readonly AuditCategoryOption[];

export const auditCategoryIds = auditCategoryOptions.map((option) => option.id);

export interface AuditRequest {
	input: string;
	categories?: AuditCategoryId[];
}

export function isAuditCategoryId(value: unknown): value is AuditCategoryId {
	return typeof value === "string" && auditCategoryIds.includes(value as AuditCategoryId);
}

export function normalizeAuditCategoryIds(value: unknown): AuditCategoryId[] {
	if (!Array.isArray(value)) {
		return [...auditCategoryIds];
	}
	return [...new Set(value.filter(isAuditCategoryId))];
}

export type AuditStatus =
	| "excellent"
	| "good"
	| "needs_improvement"
	| "poor";

export function getAuditStatus(score: number): AuditStatus {
	if (score >= 90) return "excellent";
	if (score >= 70) return "good";
	if (score >= 50) return "needs_improvement";
	return "poor";
}

export type SeoCategoryStatus = AuditStatus | "skipped";


export interface SeoCategoriesReport {
	overallScore: number;
	overallStatus: SeoCategoryStatus;
	summary: string;
	categories: Record<SeoCategoryId, SeoCategoryResult>;
}

export interface SeoCategoryResult {
	id: SeoCategoryId;
	label: string;
	description: string;
	weight: number;
	score: number;
	status: SeoCategoryStatus;
	summary: string;
	checks: SeoCategoryCheck[];
	statusSummary: {
		pass: number;
		warning: number;
		fail: number;
		not_applicable: number;
		unavailable: number;
		skipped: number;
	};
	issues: string[];
	recommendations: string[];
	prompts: string[];
	excludedFromOverall: boolean;
}

export interface SeoCategoryCheck {
	id: string;
	name: string;
	status: BaseCheckStatus | "not_applicable" | "unavailable" | "skipped";
	score: number;
	issues: string[];
	recommendations: string[];
	prompts: string[];
	codeExamples: string[];
	explanation: string;
}

// ---- Social ----



export interface SocialCheckItem {
	key: string;
	label: string;
	status: BaseCheckStatus | "unavailable";
	score: number;
	weight: number;
	message: string;
	helpText?: string;
	detectedUrl?: string;
	details?: string[];
	metrics?: {
		subscribers?: number | null;
		views?: number | null;
	};
}

export interface SocialResultsReport {
	score: number;
	availableWeight: number;
	earnedWeight: number;
	passedChecks: number;
	totalChecks: number;
	summary: string;
	items: SocialCheckItem[];
	statusSummary: {
		pass: number;
		warning: number;
		fail: number;
		unavailable: number;
	};
}

// ---- GEO ----

export type GeoStatus = AuditStatus;
	
enum GeoStatusScore {
	excellent = 90,
	good = 75,
	needs_improvement = 50,
	poor = 0,
}




export interface GeoReport {
	score: number;
	status: GeoStatus;
	summary: string;
	recommendations: string[];
	checks: {
		identitySchema: GeoIdentitySchemaResult;
		renderedContent: GeoRenderedContentResult;
		llmsTxt: GeoLlmsTxtResult;
	};
}

export interface GeoIdentitySchemaResult {
	status: BaseCheckStatus;
	score: number;
	detectedTypes: string[];
	primaryEntity: GeoEntitySummary | null;
	entities: GeoEntitySummary[];
	issues: string[];
	recommendations: string[];
}

export interface GeoEntitySummary {
	type: string;
	id: string | null;
	name: string | null;
	url: string | null;
	logo: string | null;
	image: string | null;
	description: string | null;
	sameAs: string[];
	telephone: string | null;
	email: string | null;
	address: string | null;
	contactPoint: string | null;
	areaServed: string | null;
	serviceType: string | null;
	priceRange: string | null;
	openingHours: string | null;
	geo: string | null;
	founder: string | null;
	employee: string | null;
	knowsAbout: string | null;
	source: "json-ld" | "microdata" | "rdfa";
}

export interface GeoRenderedContentResult {
	status: BaseCheckStatus;
	score: number;
	rawTextLength: number;
	renderedTextLength: number;
	rawWordCount: number;
	renderedWordCount: number;
	renderingPercentage: number;
	missingRawHeadings: string[];
	missingRawInternalLinks: string[];
	contentOnlyAvailableAfterJs: string[];
	rawInternalLinkCount: number;
	renderedInternalLinkCount: number;
	rawHasTitle: boolean;
	renderedHasTitle: boolean;
	rawHasMetaDescription: boolean;
	renderedHasMetaDescription: boolean;
	rawHasImportantSchema: boolean;
	renderedHasImportantSchema: boolean;
	renderError: string | null;
	issues: string[];
	recommendations: string[];
}

export interface GeoLlmsTxtResult {
	status: BaseCheckStatus;
	score: number;
	exists: boolean;
	url: string;
	statusCode: number | null;
	contentType: string | null;
	fileSizeBytes: number | null;
	linkCount: number;
	validLinks: number;
	brokenLinks: number;
	blockedLinks: number;
	sections: string[];
	qualityStatus: BaseCheckStatus;
	issues: string[];
	recommendations: string[];
	sampleTemplate: string;
}


// ---- Server-internal types ----

export interface RobotsTxtResult {
	url: string;
	statusCode: number | null;
	found: boolean;
	content: string;
	error: string | null;
}

export interface FetchPageResult {
	input: string;
	normalizedInput: string;
	testedUrl: string;
	finalUrl: string;
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	html: string;
	redirectChain: RedirectEntry[];
}

export interface RedirectEntry {
	from: string;
	to: string;
	statusCode: number;
}

export interface FetchTextResult {
	url: string;
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	text: string;
	redirectChain: RedirectEntry[];
}

export interface FetchTextOptions {
	label?: string;
	maxRedirects?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AuditContext {
	input: string;
	normalizedInput: string;
	testedUrl: string;
	finalUrl: string;
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	html: string;
	redirectChain: RedirectEntry[];
	$: any; // cheerio.CheerioAPI — imported server-side only
	visibleText: string;
	robots: RobotsTxtResult;
	// Pre-extracted cached values (populated once in runAudit.ts)
	titleText?: string;
	metaDescription?: string;
	canonicalUrl?: string;
	h1Texts?: string[];
	subheadingsText?: string;
	imageAltText?: string;
}

export interface RobotsRule {
	directive: "allow" | "disallow";
	path: string;
	raw: string;
}

export interface RobotsAccessResult {
	allowed: boolean;
	matchingRule: RobotsRule | null;
	userAgent: string | null;
}

export interface NormalizedInput {
	input: string;
	url: URL;
	href: string;
	displayUrl: string;
}

export interface PublicError extends Error {
	statusCode: number;
	publicMessage: string;
	cause?: unknown;
}

// ---- Check-specific types ----

export interface HreflangTag {
	hreflang: string;
	href: string;
}

export interface KeywordEntry {
	keyword: string;
	count: number;
	zones: string[];
}

export interface SitemapProbeResult {
	url: string;
	valid: boolean;
	statusCode: number | null;
	error?: string;
	type?: string;
}

export const checkWeights: Record<CheckId, number> = {
	"title-tag": 9,
	"meta-description": 6,
	hreflang: 3,
	language: 4,
	h1: 6,
	headings: 4,
	"keyword-consistency": 4,
	"content-amount": 5,
	"image-alt": 5,
	canonical: 8,
	"noindex-meta": 10,
	"noindex-header": 10,
	"ssl-enabled": 10,
	"https-redirect": 8,
	analytics: 0,
	"structured-data": 5,
	"robots-txt": 7,
	"blocked-by-robots": 10,
	"mobile-viewport": 8,
	"crawlable-links": 8,
	"image-dimensions": 5,
	"search-favicon": 4,
	"pagespeed-desktop": 5,
	"pagespeed-mobile": 7,
	"xml-sitemaps": 7,
};

export const statusMultipliers: Record<CheckStatus, number> = {
	pass: 1,
	warning: 0.5,
	fail: 0,
	info: 1,
};
