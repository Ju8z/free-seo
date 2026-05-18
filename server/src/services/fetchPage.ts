import { pageFetchClient } from "./httpClients.js";
import { normalizeInput } from "./normalizeInput.js";
import { fetchTextWithRedirects } from "./fetchText.js";
import { createPublicError } from "./errors.js";
import type { FetchPageResult } from "../types.js";

export async function fetchPage(input: unknown): Promise<FetchPageResult> {
	const normalizedInput = normalizeInput(input);
	
	try {
		const pageResponse = await fetchTextWithRedirects(
			normalizedInput.href,
			pageFetchClient,
			{
				label: "Input URL",
				maxRedirects: 6,
			},
		);
		
		if (pageResponse.statusCode >= 400) {
			throw createPublicError(
				502,
				`The page returned HTTP ${ pageResponse.statusCode }, so it could not be audited.`,
			);
		}
		
		return {
			input: normalizedInput.input,
			normalizedInput: normalizedInput.displayUrl,
			testedUrl: normalizedInput.href,
			finalUrl: pageResponse.url,
			statusCode: pageResponse.statusCode,
			headers: pageResponse.headers,
			html: pageResponse.text,
			redirectChain: pageResponse.redirectChain,
		};
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"statusCode" in error
		) {
			throw error;
		}
		
		throw createPublicError(
			502,
			"The page could not be reached or did not return auditable HTML.",
			error instanceof Error ? error : undefined,
		);
	}
}
