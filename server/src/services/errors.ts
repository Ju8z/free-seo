import type { PublicError } from "../types.js";

export function createPublicError(
	statusCode: number,
	publicMessage: string,
	cause?: unknown,
): PublicError {
	const error = new Error(publicMessage) as PublicError;
	error.statusCode = statusCode;
	error.publicMessage = publicMessage;
	if (cause !== undefined) {
		error.cause = cause;
	}
	return error;
}
