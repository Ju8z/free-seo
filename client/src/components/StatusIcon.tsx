import { memo } from "react";

type StatusName =
	| "excellent"
	| "good"
	| "needs_improvement"
	| "poor"
	| "pass"
	| "warning"
	| "fail"
	| "info"
	| "not_applicable"
	| "unavailable";

function iconClassName(className?: string): string {
	return className ?? "h-3.5 w-3.5 shrink-0";
}

export default memo(function StatusIcon({
	status,
	className,
}: {
	status: string;
	className?: string;
}) {
	switch (status as StatusName) {
		case "excellent":
		case "pass":
			return <CheckCircleIcon className={ iconClassName(className) }/>;
		case "good":
		case "info":
			return <InfoCircleIcon className={ iconClassName(className) }/>;
		case "needs_improvement":
		case "warning":
			return <WarningTriangleIcon className={ iconClassName(className) }/>;
		case "poor":
		case "fail":
			return <XCircleIcon className={ iconClassName(className) }/>;
		case "not_applicable":
		case "unavailable":
			return <MinusCircleIcon className={ iconClassName(className) }/>;
		default:
			return null;
	}
});

export function ChecksIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ iconClassName(className) }
			aria-hidden="true"
		>
			<rect x="3.5" y="3.5" width="13" height="13" rx="2.5"/>
			<path d="m6.5 7.5 1.5 1.5 2.5-3"/>
			<path d="M11 7h2.5"/>
			<path d="m6.5 12 1.5 1.5 2.5-3"/>
			<path d="M11 11.5h2.5"/>
		</svg>
	);
}

function CheckCircleIcon({ className }: { className: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ className }
			aria-hidden="true"
		>
			<circle cx="10" cy="10" r="7"/>
			<path d="m7.4 10.1 1.8 1.8 3.4-4"/>
		</svg>
	);
}

function InfoCircleIcon({ className }: { className: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ className }
			aria-hidden="true"
		>
			<circle cx="10" cy="10" r="7"/>
			<path d="M10 8.2v4.1"/>
			<path d="M10 6.4h.01"/>
		</svg>
	);
}

function WarningTriangleIcon({ className }: { className: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ className }
			aria-hidden="true"
		>
			<path d="M10 3.2 17 15.5a1 1 0 0 1-.87 1.5H3.87A1 1 0 0 1 3 15.5L10 3.2Z"/>
			<path d="M10 7.4v3.8"/>
			<path d="M10 14h.01"/>
		</svg>
	);
}

function XCircleIcon({ className }: { className: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ className }
			aria-hidden="true"
		>
			<circle cx="10" cy="10" r="7"/>
			<path d="m7.7 7.7 4.6 4.6"/>
			<path d="m12.3 7.7-4.6 4.6"/>
		</svg>
	);
}

function MinusCircleIcon({ className }: { className: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ className }
			aria-hidden="true"
		>
			<circle cx="10" cy="10" r="7"/>
			<path d="M7 10h6"/>
		</svg>
	);
}
