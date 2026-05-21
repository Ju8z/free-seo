import type { SeoCategoryCheck, SeoCategoryResult } from "../../../shared/types";
import { categoryCheckStatusClasses } from "../utils/constants";
import { formatStatusLabel } from "../utils/format";
import type { ReportCardAction } from "./ReportCard";
import FixCard from "./FixCard";
import StatusBadge from "./StatusBadge";

export function buildCategoryActions(
	category: SeoCategoryResult,
	excludedCheckIds: Set<string>,
	onToggleCheckExclusion: (id: string) => void,
): ReportCardAction[] {
	const actions: ReportCardAction[] = [];

	if (category.issues.length > 0) {
		actions.push({
			label: "Problems found",
			content: <ProblemsFoundAction items={ category.issues }/>,
		});
	}

	const actionableChecks = category.checks.filter(isActionableCheck);

	if (actionableChecks.length > 0) {
		actions.push({
			label: "How to fix",
			content: <HowToFixAction checks={ actionableChecks }/>,
		});
	}

	actions.push({
		label: "Included checks",
		content: <IncludedChecksAction checks={ category.checks } excludedCheckIds={ excludedCheckIds } onToggleCheckExclusion={ onToggleCheckExclusion }/>,
	});

	return actions;
}

export function buildCheckActions(
	check: SeoCategoryCheck,
): ReportCardAction[] {
	const actions: ReportCardAction[] = [];

	if (check.issues.length > 0) {
		actions.push({
			label: "Problems found",
			content: <ProblemsFoundAction items={ check.issues }/>,
		});
	}

	if (isActionableCheck(check)) {
		actions.push({
			label: "How to fix",
			content: <HowToFixAction checks={ [check] }/>,
		});
	}

	return actions;
}

function isActionableCheck(check: SeoCategoryCheck): boolean {
	return (
		check.codeExamples.length > 0
		|| check.prompts.length > 0
		|| check.recommendations.length > 0
	);
}

function ProblemsFoundAction({
	items,
}: {
	items: string[];
}) {
	return (
		<ul className="list-disc pl-5 text-sm text-brand-muted space-y-1">
			{ items.map((item) => (
				<li key={ item }>{ item }</li>
			)) }
		</ul>
	);
}

function HowToFixAction({
	checks,
}: {
	checks: SeoCategoryCheck[];
}) {
	return (
		<div className="space-y-4">
			{ checks.flatMap((check) => buildFixCards(check)) }
		</div>
	);
}

function buildFixCards(check: SeoCategoryCheck) {
	const baseStatus = check.status === "warning" || check.status === "fail" || check.status === "pass"
		? check.status
		: undefined;

	if (check.issues.length > 0) {
		// An issue is, by definition, a problem to fix. If the parent check
		// passed overall (e.g. GEO rendering hit >=80% but still surfaced
		// missing H1s or links), an individual issue card should still
		// render with warning styling rather than inheriting the pass green.
		const issueStatus = baseStatus === "pass" ? "warning" : baseStatus;

		return check.issues.map((issue, index) => (
			<FixCard
				key={ `${ check.id }-${ index }` }
				id={ check.id }
				title={ issue }
				status={ issueStatus }
				explanation={ check.explanation || undefined }
				recommendation={ getExplanation(check.recommendations, index) }
				codeExample={ getOptionalIndexedValue(check.codeExamples, index) }
				promptToFix={ getOptionalIndexedValue(check.prompts, index) }
			/>
		));
	}

	return [
		<FixCard
			key={ check.id }
			id={ check.id }
			title={ check.name }
			status={ baseStatus }
			explanation={ check.explanation || undefined }
			recommendation={ check.recommendations[0] || "Follow the guidance below to fix this issue." }
			codeExample={ check.codeExamples[0] }
			promptToFix={ check.prompts[0] }
		/>,
	];
}

function getExplanation(values: string[], index: number): string {
	return values[index] || values[0] || "Follow the guidance below to fix this issue.";
}

function getOptionalIndexedValue(values: string[], index: number): string | undefined {
	return values[index] || values[0];
}

function IncludedChecksAction({
	checks,
	excludedCheckIds,
	onToggleCheckExclusion,
}: {
	checks: SeoCategoryCheck[];
	excludedCheckIds: Set<string>;
	onToggleCheckExclusion: (id: string) => void;
}) {
	return (
		<div className="space-y-2">
			{ checks.map((check) => (
				<CategoryCheckStatusRow
					key={ check.id }
					check={ check }
					isExcluded={ excludedCheckIds.has(check.id) }
					canToggle={ check.status === "warning" || check.status === "fail" }
					onToggle={ () => onToggleCheckExclusion(check.id) }
				/>
			)) }
		</div>
	);
}

export function CategoryCheckStatusRow({
	check,
	isExcluded = false,
	canToggle = false,
	onToggle,
}: {
	check: SeoCategoryCheck;
	isExcluded?: boolean;
	canToggle?: boolean;
	onToggle?: () => void;
}) {
	const showScore = check.score < 100 && check.status !== "not_applicable";

	return (
		<div className={`flex flex-wrap items-center justify-between gap-2 ${isExcluded ? "opacity-40" : ""}`}>
			<div className="flex items-center gap-1.5 min-w-0">
				{canToggle && onToggle && (
					<button
						type="button"
						onClick={onToggle}
						className="shrink-0 rounded p-0.5 text-brand-muted hover:text-brand-headline transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
						aria-label={isExcluded ? "Include in score" : "Exclude from score"}
					>
						{isExcluded ? <EyeOffIcon /> : <EyeIcon />}
					</button>
				)}
				<strong className={`text-brand-headline truncate ${isExcluded ? "line-through decoration-1" : ""}`}>
					{ check.name }
				</strong>
			</div>
			<StatusBadge
				status={ check.status }
				classMap={ categoryCheckStatusClasses }
			>
				{ formatStatusLabel(check.status) }{ showScore ? ` (${check.score})` : "" }
			</StatusBadge>
		</div>
	);
}

function EyeIcon() {
	return (
		<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
			<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" />
			<circle cx="10" cy="10" r="3" />
		</svg>
	);
}

function EyeOffIcon() {
	return (
		<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
			<path d="m3 3 14 14" />
			<path d="M10.5 13a3 3 0 0 0 2.5-2.5" />
			<path d="M13.2 13.2A6 6 0 0 1 10 16c-5 0-8-6-8-6s1.2-2.4 3.2-4.2" />
			<path d="M8.5 7.5A3 3 0 0 1 10 7c5 0 8 6 8 6s-.9 1.8-2.5 3.2" />
		</svg>
	);
}
