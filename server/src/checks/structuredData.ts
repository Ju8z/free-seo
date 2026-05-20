import { createCheckResult } from "../utils/checkResult.js";
import { parseStructuredData } from "../services/schemaParser.js";
import type { AuditContext, StructuredDataParseResult } from "../types.js";

interface StructuredDataSummary extends Record<string, unknown> {
	jsonLdBlocks: number;
	validJsonLdBlocks: number;
	invalidJsonLdBlocks: number;
	microdataItems: number;
	rdfaItems: number;
	types: string[];
	errors: string[];
}

export function checkStructuredData(
	context: AuditContext,
	preParsed?: StructuredDataParseResult,
) {
	const summary = summarizeStructuredData(context, preParsed);
	const totalStructuredBlocks =
		summary.validJsonLdBlocks + summary.microdataItems + summary.rdfaItems;
	
	if (summary.invalidJsonLdBlocks > 0) {
		return createCheckResult({
			id: "structured-data",
			label: "Schema.org Structured Data",
			category: "Structure",
			status: "warning",
			summary: `${ summary.invalidJsonLdBlocks } JSON-LD block(s) could not be parsed.`,
			explanation:
				totalStructuredBlocks > 0
					? "Some structured data was detected, but malformed JSON-LD may be ignored by crawlers."
					: "Structured data was present, but the JSON-LD could not be parsed.",
			recommendation:
				"Fix the malformed JSON-LD syntax. Google can't read invalid JSON-LD, so errors prevent Google from understanding the entities on the page and from making it eligible for Rich Results.",
			codeExample: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "Your Article Title",\n  "author": { "@type": "Person", "name": "Author Name" }\n}\n</script>',
			aiPrompt: `${ summary.invalidJsonLdBlocks } JSON-LD block(s) on this page have syntax errors that Google can't parse. Validate and fix the JSON-LD using Google's Rich Results Test or the Schema.org validator. Common issues include missing commas, unquoted property names, or invalid @type values.`,
		});
	}
	
	if (totalStructuredBlocks === 0) {
		return createCheckResult({
			id: "structured-data",
			label: "Schema.org Structured Data",
			category: "Structure",
			status: "info",
			summary:
				"No schema.org JSON-LD, microdata, or RDFa structured data was detected.",
			explanation:
				"Structured data is optional, but it can help eligible pages qualify for richer search presentation.",
			recommendation:
				"Add schema.org JSON-LD markup if the page features a clear entity (like an Article, Product, or LocalBusiness) to become eligible for Google Rich Results and improve AI-driven entity understanding.",
		});
	}
	
	return createCheckResult({
		id: "structured-data",
		label: "Schema.org Structured Data",
		category: "Structure",
		status: "pass",
		summary: `${ totalStructuredBlocks } structured data block(s) were detected.`,
		explanation:
			summary.types.length > 0
				? `Detected schema type(s): ${ summary.types.join(", ") }.`
				: "Structured data was detected, but no schema.org type names were found.",
		recommendation:
			"Continue validating any changes to your structured data with Google's Rich Results Test to ensure ongoing eligibility for enhanced SERP features.",
	});
}

export function summarizeStructuredData(
	context: AuditContext,
	preParsed?: StructuredDataParseResult,
): StructuredDataSummary {
	const parsedData = preParsed ?? parseStructuredData(context);
	
	return {
		jsonLdBlocks: parsedData.jsonLdBlocks,
		validJsonLdBlocks: parsedData.validJsonLdBlocks,
		invalidJsonLdBlocks: parsedData.invalidJsonLdBlocks,
		microdataItems: parsedData.microdataItems,
		rdfaItems: parsedData.rdfaItems,
		types: parsedData.types,
		errors: parsedData.errors,
	};
}
