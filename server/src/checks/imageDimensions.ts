import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export function checkImageDimensions(context: AuditContext) {
	const $ = context.$;
	const images = $("img");
	
	if (images.length === 0) {
		return createCheckResult({
			id: "image-dimensions",
			label: "Image Dimensions",
			category: "Content",
			status: "pass",
			summary: "No images were found on the page.",
			explanation: "No images are present to cause layout shifts.",
			recommendation: "Keep using responsive images with predefined dimensions when adding visual assets.",
		});
	}
	
	let missingDimensionsCount = 0;
	
	images.each((_i, el) => {
		const width = $(el).attr("width");
		const height = $(el).attr("height");
		
		if (!width || !height) {
			missingDimensionsCount++;
		}
	});
	
	if (missingDimensionsCount > 0) {
		return createCheckResult({
			id: "image-dimensions",
			label: "Image Dimensions",
			category: "Content",
			status: "warning",
			summary: `${ missingDimensionsCount } image(s) are missing width or height attributes.`,
			explanation: "Images without explicit width and height attributes cause Cumulative Layout Shift (CLS) as they load, harming Core Web Vitals.",
			recommendation: "Set explicit width and height attributes on all image elements to reserve layout space.",
			codeExample: '<img src="image.jpg" width="600" height="400" alt="Description">',
			aiPrompt: `${ missingDimensionsCount } image(s) on this page are missing explicit HTML width and height attributes. Add appropriate width and height attributes in pixels to these <img> tags to reserve visual layout space and reduce Cumulative Layout Shift (CLS).`,
		});
	}
	
	return createCheckResult({
		id: "image-dimensions",
		label: "Image Dimensions",
		category: "Content",
		status: "pass",
		summary: "All images have explicit width and height attributes.",
		explanation: `Found explicit dimensions on all ${ images.length } image(s) on the page.`,
		recommendation: "Continue defining width and height on all page images to prevent layout shifts.",
	});
}
