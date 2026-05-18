import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkImageAlt(context: AuditContext) {
	let total = 0;
	let missingAlt = 0;
	let emptyAltIgnored = 0;

	context.$("img").each((_i, el) => {
		const image = context.$(el);
		const role = (image.attr("role") || "").toLowerCase();
		const ariaHidden = (image.attr("aria-hidden") || "").toLowerCase();
		if (role === "presentation" || ariaHidden === "true") return;

		const alt = image.attr("alt");
		// If alt is explicitly empty, it's a decorative image per HTML5/W3C standards.
		if (alt !== undefined && alt.trim() === "") {
			emptyAltIgnored++;
			return;
		}

		total++;
		if (alt === undefined) {
			missingAlt++;
		}
	});

	const problemCount = missingAlt;
	const problemPercentage =
		total === 0
			? 0
			: Math.round((problemCount / total) * 100);
	
	if (total === 0) {
		return createCheckResult({
			id: "image-alt",
			label: "Image Alt Attributes",
			category: "Content",
			status: "pass",
			summary: "No meaningful content images were found.",
			explanation:
				'Images marked role="presentation", aria-hidden="true", or alt="" are correctly treated as decorative and ignored.',
			recommendation:
				"When content images are added, give each one descriptive alt text. Keep using alt=\"\" for decorative images.",
		});
	}
	
	if (problemPercentage >= 40) {
		return createCheckResult({
			id: "image-alt",
			label: "Image Alt Attributes",
			category: "Content",
			status: "fail",
			summary: `${ problemCount } of ${ total } content images (${ problemPercentage }%) are missing the alt attribute entirely.`,
			explanation: `Missing alt attributes: ${ missingAlt }. Images with empty alt="" are correctly treated as decorative and do not fail this check.`,
			recommendation:
				"Add descriptive alt text to important images. If an image is purely decorative, add an empty alt=\"\" attribute so screen readers ignore it.",
			codeExample: '<img src="photo.jpg" alt="Description of the image content">\n<img src="spacer.jpg" alt=""> <!-- decorative -->',
			aiPrompt: `${ problemCount } of ${ total } images are completely missing the alt attribute. Add descriptive alt attributes to all meaningful images. For purely decorative images, add an empty alt="" attribute per W3C standards.`,
		});
	}
	
	if (problemCount > 0) {
		return createCheckResult({
			id: "image-alt",
			label: "Image Alt Attributes",
			category: "Content",
			status: "warning",
			summary: `${ problemCount } of ${ total } content images (${ problemPercentage }%) are missing the alt attribute entirely.`,
			explanation: `Missing alt attributes: ${ missingAlt }. Images with empty alt="" are correctly treated as decorative and do not fail this check.`,
			recommendation:
				"Add descriptive alt text to important images. If an image is purely decorative, add an empty alt=\"\" attribute so screen readers ignore it.",
			codeExample: '<img src="photo.jpg" alt="Description of the image content">\n<img src="spacer.jpg" alt=""> <!-- decorative -->',
			aiPrompt: `${ problemCount } of ${ total } images are missing the alt attribute. Add descriptive alt attributes to the images that need them. Use alt="" for decorative images.`,
		});
	}
	
	return createCheckResult({
		id: "image-alt",
		label: "Image Alt Attributes",
		category: "Content",
		status: "pass",
		summary: `All ${ total } content images have alt text.`,
		explanation:
			'Images with alt="", role="presentation" or aria-hidden="true" were correctly ignored as decorative.',
		recommendation:
			"Keep using descriptive alt text for content images and alt=\"\" for decorative images.",
	});
}
