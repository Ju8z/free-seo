import { createPublicError } from "./errors.js";
import type { NormalizedInput } from "../types.js";

export function normalizeInput(input: unknown): NormalizedInput {
	if (typeof input !== "string" || input.trim().length === 0) {
		throw createPublicError(400, "Enter a domain or URL to audit.");
	}
	
	const trimmedInput = input.trim();
	const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedInput)
		? trimmedInput
		: `https://${ trimmedInput }`;
	
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(withScheme);
	} catch {
		throw createPublicError(400, "Enter a valid domain or URL.");
	}
	
	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		throw createPublicError(400, "Only http and https URLs can be audited.");
	}
	
	if (parsedUrl.username || parsedUrl.password) {
		throw createPublicError(
			400,
			"URLs with usernames or passwords are not supported.",
		);
	}
	
	if (!parsedUrl.hostname) {
		throw createPublicError(400, "Enter a URL with a valid host.");
	}
	
	parsedUrl.hash = "";
	parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
	
	return {
		input: trimmedInput,
		url: parsedUrl,
		href: parsedUrl.href,
		displayUrl: formatDisplayUrl(parsedUrl),
	};
}

export function formatDisplayUrl(url: URL): string {
	const copy = new URL(url.href);
	copy.hash = "";
	
	if (copy.pathname === "/" && copy.search === "") {
		return copy.href.replace(/\/$/, "");
	}
	
	return copy.href;
}
