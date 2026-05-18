import { franc } from "franc-min";
import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

const declaredLanguagePattern =
	/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

const francToIsoTwo: Record<string, string> = {
	arb: "ar",
	cmn: "zh",
	deu: "de",
	eng: "en",
	fra: "fr",
	hin: "hi",
	ita: "it",
	jpn: "ja",
	kor: "ko",
	nld: "nl",
	por: "pt",
	rus: "ru",
	spa: "es",
};

export function checkLanguage(context: AuditContext) {
	const declaredLanguage = context.$("html").attr("lang") || "";
	const visibleText = context.visibleText || "";
	const detectedCode =
		visibleText.length >= 60
			? franc(visibleText.slice(0, 5000), { minLength: 60 })
			: "und";
	const detectedLanguage = francToIsoTwo[detectedCode] || null;
	const declaredPrimary =
		declaredLanguage.split("-")[0]?.toLowerCase() || null;
	
	if (!declaredLanguage) {
		return createCheckResult({
			id: "language",
			label: "Language Check",
			category: "Metadata",
			status: "warning",
			summary: "The html lang attribute is missing.",
			explanation: detectedLanguage
				? `Detected visible text language: ${ detectedLanguage }.`
				: "The page did not contain enough visible text for confident language detection.",
			recommendation:
				"Add an HTML lang attribute (e.g., <html lang=\"en\">) for accessibility and screen readers. Google primarily relies on visible text and hreflang for language targeting, not this attribute.",
			codeExample: "<html lang=\"en\">",
			aiPrompt: "The page is missing the html lang attribute. Add lang=\"XX\" to the <html> tag where XX is the appropriate language code (e.g., en, de, es, fr, en-US).",
		});
	}
	
	if (!declaredLanguagePattern.test(declaredLanguage)) {
		return createCheckResult({
			id: "language",
			label: "Language Check",
			category: "Metadata",
			status: "warning",
			summary: `Declared language "${ declaredLanguage }" does not look like a valid language code.`,
			explanation:
				"Recommended format: a language code such as en, de, or en-US.",
			recommendation:
				"Use a valid BCP 47 language code (like 'en-US') in the HTML lang attribute to ensure screen readers can accurately interpret the page.",
			codeExample: "<html lang=\"en\">",
			aiPrompt: `The declared language code "${ declaredLanguage }" is not valid. Use a valid BCP 47 language code like en, de, es, fr, or en-US, pt-BR.`,
		});
	}
	
	if (
		detectedLanguage &&
		declaredPrimary &&
		detectedLanguage !== declaredPrimary
	) {
		return createCheckResult({
			id: "language",
			label: "Language Check",
			category: "Metadata",
			status: "warning",
			summary: `Declared language is ${ declaredLanguage }, but visible text looks like ${ detectedLanguage }.`,
			explanation:
				"This is a heuristic language check based on visible text.",
			recommendation:
				"Align the HTML lang attribute with the actual language of the visible text. While Google detects the language automatically, a mismatch can disrupt accessibility tools.",
			codeExample: "<html lang=\"en\">",
			aiPrompt: `The declared language (${ declaredLanguage }) doesn't match the visible text language (${ detectedLanguage }). Update the html lang attribute to match the actual page content language.`,
		});
	}
	
	return createCheckResult({
		id: "language",
		label: "Language Check",
		category: "Metadata",
		status: "pass",
		summary: `Declared language is ${ declaredLanguage }.`,
		explanation: detectedLanguage
			? `Detected visible text language also looks like ${ detectedLanguage }.`
			: "The page did not contain enough visible text for confident language detection.",
		recommendation:
			"Keep the HTML lang attribute accurately aligned with the main visible language for optimal accessibility compliance.",
	});
}
