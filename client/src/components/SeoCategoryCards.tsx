import { memo, useMemo } from "react";
import type { SeoCategoriesReport, SeoCategoryCheck, SeoCategoryResult, } from "../../../shared/types";
import { categoryCheckStatusClasses, categoryStatusClasses, } from "../utils/constants";
import { formatStatusLabel } from "../utils/format";
import ReportCard from "./ReportCard";
import { buildCategoryActions } from "./categoryCardActions";
import { recalculateCategoryScore } from "./SeoScoreOverview";
import ChecksSummary from "./ChecksSummary";
import StatusBadge from "./StatusBadge";

const categoryOrder = [
	"metadata",
	"structure",
	"content",
	"indexing",
	"technical",
	"pagespeed",
	"geo", //TODO: rethink both views to be more informative
	// "social" is intentionally rendered by SocialResultsSection (the
	// richer dedicated card with chips, detected URLs, metrics, and
	// per-check action panels) and is therefore omitted here so the
	// generic SeoCategoryCard does not produce a duplicate "Social" card
	// in the same view.
] as const;

export default memo(function SeoCategoryCards({
	seoCategories,
	excludedCheckIds,
	onToggleCheckExclusion,
}: {
	seoCategories: SeoCategoriesReport;
	excludedCheckIds: Set<string>;
	onToggleCheckExclusion: (id: string) => void;
}) {
	return (
		<section className="space-y-3">
			{ categoryOrder.map((categoryId) => (
				<div key={ categoryId } id={ `category-${ categoryId }` } className="scroll-mt-4">
					<SeoCategoryCard
						category={ seoCategories.categories[categoryId] }
						excludedCheckIds={ excludedCheckIds }
						onToggleCheckExclusion={ onToggleCheckExclusion }
					/>
				</div>
			)) }
		</section>
	);
});

const SeoCategoryCard = memo(function SeoCategoryCard({
	category,
	excludedCheckIds,
	onToggleCheckExclusion,
}: {
	category: SeoCategoryResult;
	excludedCheckIds: Set<string>;
	onToggleCheckExclusion: (id: string) => void;
}) {
	const actions = useMemo(
		() => buildCategoryActions(category, excludedCheckIds, onToggleCheckExclusion),
		[category, excludedCheckIds, onToggleCheckExclusion],
	);

	const displayScore = useMemo(
		() => recalculateCategoryScore(category, excludedCheckIds),
		[category, excludedCheckIds],
	);

	const summaryItems = useMemo(() => [
		{
			status: "pass",
			label: "pass",
			count: category.statusSummary.pass,
			className: categoryCheckStatusClasses.pass,
		},
		{
			status: "warning",
			label: "warning",
			count: category.statusSummary.warning,
			className: categoryCheckStatusClasses.warning,
		},
		{
			status: "fail",
			label: "fail",
			count: category.statusSummary.fail,
			className: categoryCheckStatusClasses.fail,
		},
		{
			status: "not_applicable",
			label: "not applicable",
			count: category.statusSummary.not_applicable,
			className: categoryCheckStatusClasses.not_applicable,
		},
	] as const, [category.statusSummary]);

	const checkChips = useMemo(
		() => category.checks
			.filter((check) => !(check.status === "pass" && check.score === 100))
			.map((check) => (
				<CheckChip
					key={ check.id }
					check={ check }
					isExcluded={ excludedCheckIds.has(check.id) }
					canToggle={ check.status === "warning" || check.status === "fail" }
					onToggle={ () => onToggleCheckExclusion(check.id) }
				/>
			)),
		[category.checks, excludedCheckIds, onToggleCheckExclusion],
	);

	return (
		<ReportCard
			title={ category.label }
			badge={
				<StatusBadge
					status={ category.status }
					classMap={ categoryStatusClasses }
				>
					{ formatStatusLabel(category.status) } - { displayScore }
				</StatusBadge>
			}
			summary={ category.description }
			actions={ actions }
			>
				<ChecksSummary
					items={summaryItems}
				/>
				<p className="text-brand-muted">{ category.summary }</p>
				<div className="flex flex-wrap gap-1.5">
					{ checkChips }
				</div>
		</ReportCard>
	);
});

const CheckChip = memo(function CheckChip({
	check,
	isExcluded,
	canToggle,
	onToggle,
}: {
	check: SeoCategoryCheck;
	isExcluded: boolean;
	canToggle: boolean;
	onToggle?: () => void;
}) {
	const showScore = check.score < 100 && check.status !== "not_applicable";
	const scoreSuffix = showScore ? ` (${check.score})` : "";

	return (
		<span className="relative inline-flex">
			<StatusBadge
				status={ check.status }
				classMap={ categoryCheckStatusClasses }
				className={`pl-2.5 ${canToggle ? "pr-7" : "pr-2.5"} py-1 ${isExcluded ? "opacity-40" : ""}`}
			>
				{ check.name }: { formatStatusLabel(check.status) }{ scoreSuffix }
			</StatusBadge>
			{canToggle && onToggle && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onToggle(); }}
					className="absolute top-1 right-1 rounded p-0.5 text-brand-muted hover:text-brand-headline transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
					aria-label={isExcluded ? "Include in score" : "Exclude from score"}
				>
					{isExcluded ? <EyeOffIcon /> : <EyeIcon />}
				</button>
			)}
		</span>
	);
});

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
