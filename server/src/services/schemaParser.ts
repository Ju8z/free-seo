import { normalizeWhitespace } from "../utils/text.js";
import type { AuditContext, GeoEntitySummary } from "../types.js";

export interface StructuredDataParseResult {
	jsonLdBlocks: number;
	validJsonLdBlocks: number;
	invalidJsonLdBlocks: number;
	microdataItems: number;
	rdfaItems: number;
	types: string[];
	errors: string[];
	entities: GeoEntitySummary[];
}

const identityFields = [
	"@id",
	"name",
	"url",
	"logo",
	"image",
	"description",
	"sameAs",
	"telephone",
	"email",
	"address",
	"contactPoint",
	"areaServed",
	"serviceType",
	"priceRange",
	"openingHours",
	"geo",
	"founder",
	"employee",
	"knowsAbout",
];

export function parseStructuredData(
	context: AuditContext,
): StructuredDataParseResult {
	const errors: string[] = [];
	const types = new Set<string>();
	const entities: GeoEntitySummary[] = [];
	let jsonLdBlocks = 0;
	let validJsonLdBlocks = 0;
	let invalidJsonLdBlocks = 0;
	
	context.$('script[type*="ld+json" i]').each((_index, element) => {
		jsonLdBlocks += 1;
		const rawJson = context.$(element).contents().text().trim();
		if (!rawJson) {
			invalidJsonLdBlocks += 1;
			errors.push("JSON-LD block is empty.");
			return;
		}
		
		try {
			const parsed = JSON.parse(rawJson) as unknown;
			validJsonLdBlocks += 1;
			collectJsonLdEntities(parsed, types, entities);
		} catch (error) {
			invalidJsonLdBlocks += 1;
			errors.push(
				error instanceof Error
					? error.message
					: "JSON-LD block could not be parsed.",
			);
		}
	});
	
	let microdataItems = 0;
	if (context.html.includes("itemscope")) {
		context.$("[itemscope]").each((_index, element) => {
			microdataItems++;
			const entity = buildDomEntity(
				context,
				element,
				"microdata",
				context.$(element).attr("itemtype"),
				"itemprop",
			);
			if (entity) {
				entities.push(entity);
				types.add(entity.type);
			}
		});
	}

	let rdfaItems = 0;
	if (context.html.includes("typeof=") || context.html.includes("typeof =")) {
		context.$("[typeof]").each((_index, element) => {
			rdfaItems++;
			const entity = buildDomEntity(
				context,
				element,
				"rdfa",
				context.$(element).attr("typeof"),
				"property",
			);
			if (entity) {
				entities.push(entity);
				types.add(entity.type);
			}
		});
	}
	
	return {
		jsonLdBlocks,
		validJsonLdBlocks,
		invalidJsonLdBlocks,
		microdataItems,
		rdfaItems,
		types: [...types].sort(),
		errors,
		entities,
	};
}

export function normalizeSchemaType(value: string): string | null {
	const cleanedValue = value.trim().replace(/\/$/, "");
	if (!cleanedValue) {
		return null;
	}
	
	const schemaMatch = cleanedValue.match(/schema\.org\/([^/#?]+)/i);
	if (schemaMatch?.[1]) {
		return schemaMatch[1];
	}
	
	const compactMatch = cleanedValue.match(/^schema:([^/#?]+)$/i);
	if (compactMatch?.[1]) {
		return compactMatch[1];
	}
	
	return /^[A-Z][A-Za-z0-9]+$/.test(cleanedValue)
		? cleanedValue
		: null;
}

export function collectTypeNames(value: unknown): string[] {
	const types = new Set<string>();
	collectTypeValue(value, types);
	return [...types];
}

function collectJsonLdEntities(
	value: unknown,
	types: Set<string>,
	entities: GeoEntitySummary[],
	depth = 0,
): void {
	if (depth > 10) return;
	
	if (Array.isArray(value)) {
		for (const item of value) {
			collectJsonLdEntities(item, types, entities, depth);
		}
		return;
	}
	
	if (!isRecord(value)) {
		return;
	}
	
	const entityTypes = collectTypeNames(value["@type"]);
	for (const typeName of entityTypes) {
		types.add(typeName);
	}
	
	if (entityTypes.length > 0) {
		entities.push(buildJsonLdEntity(value, entityTypes[0]!));
	}
	
	collectJsonLdEntities(value["@graph"], types, entities, depth + 1);
}

function collectTypeValue(value: unknown, types: Set<string>): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectTypeValue(item, types);
		}
		return;
	}
	
	if (typeof value !== "string") {
		return;
	}
	
	for (const typeValue of value.split(/\s+/)) {
		const typeName = normalizeSchemaType(typeValue);
		if (typeName) {
			types.add(typeName);
		}
	}
}

function buildJsonLdEntity(
	value: Record<string, unknown>,
	type: string,
): GeoEntitySummary {
	return {
		type,
		id: stringifyField(value["@id"]),
		name: stringifyField(value.name),
		url: stringifyField(value.url),
		logo: stringifyField(value.logo),
		image: stringifyField(value.image),
		description: stringifyField(value.description),
		sameAs: stringifyArrayField(value.sameAs),
		telephone: stringifyField(value.telephone),
		email: stringifyField(value.email),
		address: stringifyField(value.address),
		contactPoint: stringifyField(value.contactPoint),
		areaServed: stringifyField(value.areaServed),
		serviceType: stringifyField(value.serviceType),
		priceRange: stringifyField(value.priceRange),
		openingHours: stringifyField(value.openingHours),
		geo: stringifyField(value.geo),
		founder: stringifyField(value.founder),
		employee: stringifyField(value.employee),
		knowsAbout: stringifyField(value.knowsAbout),
		source: "json-ld",
	};
}

function buildDomEntity(
	context: AuditContext,
	element: unknown,
	source: "microdata" | "rdfa",
	typeValue: unknown,
	fieldAttribute: "itemprop" | "property",
): GeoEntitySummary | null {
	const type = collectTypeNames(typeValue)[0];
	if (!type) {
		return null;
	}
	
	const fieldValues = new Map<string, string[]>();
	for (const field of identityFields) {
		fieldValues.set(field, []);
	}
	
	context.$(element as never)
	       .find(`[${ fieldAttribute }]`)
	       .each((_index, child) => {
		       const field = context.$(child).attr(fieldAttribute);
		       if (!field || !fieldValues.has(field)) {
			       return;
		       }
		       
		       const value = extractElementValue(context, child);
		       if (value) {
			       fieldValues.get(field)!.push(value);
		       }
	       });
	
	return {
		type,
		id: firstField(fieldValues, "@id"),
		name: firstField(fieldValues, "name"),
		url: firstField(fieldValues, "url"),
		logo: firstField(fieldValues, "logo"),
		image: firstField(fieldValues, "image"),
		description: firstField(fieldValues, "description"),
		sameAs: fieldValues.get("sameAs") || [],
		telephone: firstField(fieldValues, "telephone"),
		email: firstField(fieldValues, "email"),
		address: firstField(fieldValues, "address"),
		contactPoint: firstField(fieldValues, "contactPoint"),
		areaServed: firstField(fieldValues, "areaServed"),
		serviceType: firstField(fieldValues, "serviceType"),
		priceRange: firstField(fieldValues, "priceRange"),
		openingHours: firstField(fieldValues, "openingHours"),
		geo: firstField(fieldValues, "geo"),
		founder: firstField(fieldValues, "founder"),
		employee: firstField(fieldValues, "employee"),
		knowsAbout: firstField(fieldValues, "knowsAbout"),
		source,
	};
}

function extractElementValue(
	context: AuditContext,
	element: unknown,
): string {
	const node = context.$(element as never);
	return normalizeWhitespace(
		node.attr("content") ||
		node.attr("href") ||
		node.attr("src") ||
		node.attr("datetime") ||
		node.text(),
	);
}

function firstField(
	fieldValues: Map<string, string[]>,
	field: string,
): string | null {
	return fieldValues.get(field)?.[0] || null;
}

function stringifyArrayField(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map(stringifyField).filter(Boolean) as string[];
	}
	
	const singleValue = stringifyField(value);
	return singleValue ? [singleValue] : [];
}

function stringifyField(value: unknown): string | null {
	if (typeof value === "string") {
		return normalizeWhitespace(value) || null;
	}
	
	if (Array.isArray(value)) {
		return value.map(stringifyField).filter(Boolean).join(", ") || null;
	}
	
	if (isRecord(value)) {
		if (typeof value["@id"] === "string") {
			return normalizeWhitespace(value["@id"]) || null;
		}
		if (typeof value.url === "string") {
			return normalizeWhitespace(value.url) || null;
		}
		if (typeof value.name === "string") {
			return normalizeWhitespace(value.name) || null;
		}
		if (typeof value["@type"] === "string") {
			return normalizeWhitespace(value["@type"]) || null;
		}
		return JSON.stringify(value);
	}
	
	return value == null ? null : normalizeWhitespace(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
