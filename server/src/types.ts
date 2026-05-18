import type { CheerioAPI } from "cheerio";
import type { AuditContext as BaseAuditContext } from "../../shared/types.js";
import type { StructuredDataParseResult } from "./services/schemaParser.js";

export type { StructuredDataParseResult };
export type {
	CheckId,
	CheckStatus,
	BaseCheckStatus,
	CheckCategory,
	CheckResult,
	StatusSummary,
	AuditReport,
	SerpSnippetPreview,
	SeoCategoryId,
	SeoCategoryStatus,
	AuditStatus,
	SeoCategoriesReport,
	SeoCategoryResult,
	SeoCategoryCheck,
	SocialCheckItem,
	SocialResultsReport,
	GeoStatus,
	GeoReport,
	GeoIdentitySchemaResult,
	GeoEntitySummary,
	GeoRenderedContentResult,
	GeoLlmsTxtResult,
	RobotsTxtResult,
	FetchPageResult,
	RedirectEntry,
	FetchTextResult,
	FetchTextOptions,
	RobotsRule,
	RobotsAccessResult,
	NormalizedInput,
	PublicError,
	HreflangTag,
	KeywordEntry,
	SitemapProbeResult,
} from "../../shared/types.js";

export interface AuditContext extends BaseAuditContext {
	$: CheerioAPI;
}

export { checkWeights, statusMultipliers, getAuditStatus } from "../../shared/types.js";
