import { parseStructuredData } from "./schemaParser.js";
import { getGeoCheckScore } from "./geoScoring.js";
import { normalizeWhitespace } from "../utils/text.js";
import type { AuditContext, BaseCheckStatus, GeoEntitySummary, GeoIdentitySchemaResult, StructuredDataParseResult } from "../types.js";

export interface UrlProbeResult {
	url: string;
	statusCode: number | null;
	ok: boolean;
	error: string | null;
}

export type UrlProbe = (url: string) => Promise<UrlProbeResult>;

const primaryIdentityTypes = new Set([
	"Organization",
	"LocalBusiness",
	"ProfessionalService",
	"Service",
	"Person",
]);

const identityTypes = new Set([
	...primaryIdentityTypes,
	"WebSite",
	"WebPage",
]);

export async function checkGeoIdentitySchema(
	context: AuditContext,
	probeUrl: UrlProbe,
	preParsed?: StructuredDataParseResult,
): Promise<GeoIdentitySchemaResult> {
	const parsedData = preParsed ?? parseStructuredData(context);
	const issues: string[] = [];
	const recommendations: string[] = [];
	const entities = parsedData.entities.filter((entity) =>
		identityTypes.has(entity.type),
	);
	const primaryEntities = entities.filter((entity) =>
		primaryIdentityTypes.has(entity.type) && isQualifiedPerson(context, entity),
	);
	const primaryEntity = selectPrimaryEntity(primaryEntities);
	
	if (parsedData.invalidJsonLdBlocks > 0) {
		issues.push("One or more JSON-LD blocks are invalid.");
		recommendations.push(
			"Fix invalid JSON-LD so AI systems and search engines can parse entity data reliably.",
		);
	}
	
	if (!primaryEntity) {
		issues.push("No clear primary identity schema entity was found.");
		recommendations.push(
			"Add Organization, LocalBusiness, ProfessionalService, Service, or qualified Person schema with clear identity fields.",
		);
	}
	
	if (primaryEntities.length > 1) {
		const entityKeys = new Set(
			primaryEntities.map((entity) =>
				`${ entity.type }:${ (entity.name || "").toLowerCase() }:${ entity.url || "" }`,
			),
		);
		if (entityKeys.size > 1) {
			issues.push("Multiple conflicting primary identity entities were found.");
			recommendations.push(
				"Keep one clear primary identity entity and connect secondary entities with clear relationships.",
			);
		}
	}
	
	if (primaryEntity) {
		for (const field of ["name", "url", "description"] as const) {
			if (!primaryEntity[field]) {
				issues.push(`Primary entity is missing ${ field }.`);
			}
		}
		
		if (
			primaryEntity.type !== "Person" &&
			primaryEntity.sameAs.length === 0
		) {
			issues.push("Primary business/entity schema is missing sameAs links.");
			recommendations.push(
				"Add sameAs links to authoritative profiles such as social, directory, or knowledge sources.",
			);
		}
		
		if (primaryEntity.name && schemaNameConflictsWithVisibleBrand(context, primaryEntity.name)) {
			issues.push("Schema name does not clearly match the visible brand or site name.");
			recommendations.push(
				"Align schema name with the visible brand or primary site identity.",
			);
		}
		
		if (primaryEntity.url && schemaUrlConflictsWithCanonical(context, primaryEntity.url)) {
			issues.push("Schema URL appears to conflict with the canonical URL.");
			recommendations.push(
				"Use a schema URL that matches the canonical identity or page URL.",
			);
		}
		
		const mediaUrls = [primaryEntity.logo, primaryEntity.image].filter(Boolean) as string[];
		const probeResults = await Promise.all(
			mediaUrls.map(async (mediaUrl) => {
				const resolvedMediaUrl = new URL(mediaUrl, context.finalUrl).href;
				const probeResult = await probeUrl(resolvedMediaUrl);
				return { resolvedMediaUrl, probeResult };
			})
		);
		for (const { resolvedMediaUrl, probeResult } of probeResults) {
			if (!probeResult.ok) {
				issues.push(`Schema media URL is not crawlable: ${ resolvedMediaUrl }.`);
				recommendations.push(
					"Use crawlable absolute URLs for schema logo and image fields.",
				);
			}
		}
		
		if (primaryEntity.type === "ProfessionalService") {
			issues.push("ProfessionalService was detected; a more specific LocalBusiness or Service subtype may be better where applicable.");
			recommendations.push(
				"Use the most specific schema.org business or service subtype that accurately describes the entity.",
			);
		}
	}
	
	if (primaryEntity && ["name", "url", "description"].some((field) => !primaryEntity[field as keyof GeoEntitySummary])) {
		recommendations.push(
			"Complete the primary identity schema with name, url, and description.",
		);
	}
	
	const status = getIdentityStatus(primaryEntity, issues, parsedData.invalidJsonLdBlocks);
	return {
		status,
		score: getGeoCheckScore(status),
		detectedTypes: parsedData.types.filter((type) => identityTypes.has(type)),
		primaryEntity,
		entities,
		issues,
		recommendations: recommendations.length > 0
			? Array.from(new Set(recommendations))
			: ["Keep identity schema accurate, specific, and aligned with visible page content."],
	};
}

function getIdentityStatus(
	primaryEntity: GeoEntitySummary | null,
	issues: string[],
	invalidJsonLdBlocks: number,
): BaseCheckStatus {
	if (!primaryEntity && invalidJsonLdBlocks > 0) {
		return "fail";
	}
	return issues.length > 0 ? "warning" : "pass";
}

function selectPrimaryEntity(
	entities: GeoEntitySummary[],
): GeoEntitySummary | null {
	const priority = [
		"Organization",
		"LocalBusiness",
		"ProfessionalService",
		"Service",
		"Person",
	];
	return (
		[...entities].sort(
			(left, right) =>
				priority.indexOf(left.type) - priority.indexOf(right.type),
		)[0] || null
	);
}

function isQualifiedPerson(
	context: AuditContext,
	entity: GeoEntitySummary,
): boolean {
	if (entity.type !== "Person") {
		return true;
	}
	
	const pageText = normalizeWhitespace(
		`${ context.titleText ?? "" } ${ (context.h1Texts ?? [])[0] ?? "" } ${ context.visibleText }`,
	).toLowerCase();
	return Boolean(
		entity.knowsAbout ||
		entity.serviceType ||
		/professional|consultant|advisor|attorney|doctor|therapist|coach|freelancer/.test(pageText),
	);
}

function schemaNameConflictsWithVisibleBrand(
	context: AuditContext,
	schemaName: string,
): boolean {
	const normalizedSchemaName = normalizeForComparison(schemaName);
	const visibleNames = [
		context.$("meta[property='og:site_name']").attr("content"),
		context.titleText ?? "",
		(context.h1Texts ?? [])[0] ?? "",
	]
		.map(normalizeForComparison)
		.filter(Boolean);
	
	if (visibleNames.length === 0 || !normalizedSchemaName) {
		return false;
	}
	
	return !visibleNames.some(
		(value) =>
			value.includes(normalizedSchemaName) ||
			normalizedSchemaName.includes(value),
	);
}

function schemaUrlConflictsWithCanonical(
	context: AuditContext,
	schemaUrl: string,
): boolean {
	const canonicalUrl = context.canonicalUrl || context.finalUrl;
	
	try {
		const parsedSchemaUrl = new URL(schemaUrl, context.finalUrl);
		const parsedCanonicalUrl = new URL(canonicalUrl, context.finalUrl);
		return parsedSchemaUrl.hostname !== parsedCanonicalUrl.hostname;
	} catch {
		return true;
	}
}

function normalizeForComparison(value: unknown): string {
	return normalizeWhitespace(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}
