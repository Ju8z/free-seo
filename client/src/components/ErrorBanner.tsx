import React, { memo, useCallback, useEffect, useRef } from "react";

function getErrorCopy(message: string) {
	const trimmed = message.trim();

	if (/timed out/i.test(trimmed)) {
		return {
			title: "Audit timed out",
			description: "The page did not finish loading within the audit time limit. Try a simpler URL path, wait a moment, or run the audit again.",
			detail: trimmed,
		};
	}

	if (/too many redirects/i.test(trimmed)) {
		return {
			title: "Too many redirects",
			description: "The target site kept redirecting before the audit could reach a stable page. Check the URL or the site's redirect rules.",
			detail: trimmed,
		};
	}

	if (/blocking automated requests|can't analyze right now/i.test(trimmed)) {
		return {
			title: "Audit could not be completed",
			description: "The site may be blocking automated requests, returning an unexpected response, or redirecting in a way the audit cannot follow right now.",
			detail: trimmed,
		};
	}

	if (/couldn't reach the target site|failed to fetch|network/i.test(trimmed)) {
		return {
			title: "The site could not be reached",
			description: "Check that the URL is correct, the site is online, and the machine running the audit can access it.",
			detail: trimmed,
		};
	}

	return {
		title: "Audit could not be completed",
		description: "Something went wrong while loading or analyzing the page. Try again in a moment or test a different URL if the issue continues.",
		detail: trimmed,
	};
}

export default memo(function ErrorBanner({
	message,
	onClose,
}: {
	message: string;
	onClose: () => void;
}) {
	const copy = getErrorCopy(message);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	const handleKeyDown = useCallback(() => {
		onCloseRef.current();
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => onCloseRef.current(), 10_000);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	const handleBackdropClick = (event: React.MouseEvent) => {
		if (event.target === event.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 py-10 backdrop-blur-sm"
			onMouseDown={handleBackdropClick}
			role="presentation"
		>
			<div
				role="alertdialog"
				aria-live="assertive"
				aria-labelledby="audit-error-title"
				aria-describedby="audit-error-description"
				className="w-full max-w-md rounded-xl border border-brand-danger/25 bg-brand-surface p-4 shadow-panel"
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2
							id="audit-error-title"
							className="text-sm font-semibold text-brand-headline"
						>
							{ copy.title }
						</h2>
						<p
							id="audit-error-description"
							className="mt-1 text-sm leading-relaxed text-brand-muted"
						>
							{ copy.description }
						</p>
						{ copy.detail && (
							<p className="mt-3 rounded-lg border border-brand-danger/20 bg-brand-danger-soft px-3 py-2 text-xs leading-relaxed text-brand-danger">
								{ copy.detail }
							</p>
						) }
					</div>
				</div>
			</div>
		</div>
	);
});
