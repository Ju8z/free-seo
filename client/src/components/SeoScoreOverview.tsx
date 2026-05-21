import { memo, useCallback, useMemo, useState } from "react";
import type { CheckStatus, SeoCategoriesReport, SeoCategoryId, SeoCategoryResult, SeoCategoryStatus } from "../../../shared/types";
import { checkWeights, getAuditStatus } from "../../../shared/types";
import { categoryCheckStatusClasses, categoryStatusClasses } from "../utils/constants";
import { formatStatusLabel } from "../utils/format";
import StatusBadge from "./StatusBadge";

const categoryOrder = [
	"metadata",
	"structure",
	"content",
	"indexing",
	"technical",
	"pagespeed",
	"geo",
	"social",
] as const;

const dotClassMap: Record<SeoCategoryResult["status"], string> = {
	excellent: "bg-brand-success",
	good: "bg-brand-accent",
	needs_improvement: "bg-brand-warning",
	poor: "bg-brand-danger",
};

function recalculateOverallScore(
	categories: Record<SeoCategoryId, SeoCategoryResult>,
	hiddenIds: Set<string>,
	excludedCheckIds: Set<string>,
): number {
	let totalWeight = 0;
	let earnedWeight = 0;
	for (const cat of Object.values(categories)) {
		if (cat.excludedFromOverall || hiddenIds.has(cat.id)) continue;
		const categoryScore = excludedCheckIds.size > 0
			? recalculateCategoryScore(cat, excludedCheckIds)
			: cat.score;
		totalWeight += cat.weight;
		earnedWeight += categoryScore * cat.weight;
	}
	if (totalWeight <= 0) return 100;
	return Math.round(earnedWeight / totalWeight);
}

export function recalculateCategoryScore(
	category: SeoCategoryResult,
	excludedCheckIds: Set<string>,
): number {
	let possibleScore = 0;
	let earnedScore = 0;
	for (const check of category.checks) {
		if (excludedCheckIds.has(check.id)) continue;
		if (check.status === "not_applicable" || check.status === "unavailable") continue;
		const weight = (checkWeights as Record<string, number>)[check.id] ?? 4;
		const multiplier = check.status === "pass" ? 1 : check.status === "warning" ? 0.5 : 0;
		possibleScore += weight;
		earnedScore += weight * multiplier;
	}
	if (possibleScore === 0) return 100;
	return Math.max(0, Math.min(100, Math.round((earnedScore / possibleScore) * 100)));
}

export default memo(function SeoScoreOverview({
	seoCategories,
	excludedCheckIds,
	selectedStatus,
}: {
	seoCategories: SeoCategoriesReport;
	excludedCheckIds: Set<string>;
	selectedStatus: CheckStatus | null;
}) {
	const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

	const toggleCategory = useCallback((id: string) => {
		setHiddenIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const displayScore = useMemo(
		() => recalculateOverallScore(seoCategories.categories, hiddenIds, excludedCheckIds),
		[seoCategories.categories, hiddenIds, excludedCheckIds],
	);

	const displayStatus = useMemo(
		() => getAuditStatus(displayScore),
		[displayScore],
	);
	
	const groupedFilteredChecks = useMemo(() => {
		if (!selectedStatus) return [];
		const groups: Array<{
			categoryLabel: string;
			checks: Array<{
				id: string;
				name: string;
				status: string;
			}>;
		}> = [];
		
		for (const catId of categoryOrder) {
			const cat = seoCategories.categories[catId];
			if (!cat) continue;
			
			const matchingChecks = cat.checks.filter((check) => {
				const status = check.status as string;
				if (selectedStatus === "info") {
					return status === "not_applicable" || status === "unavailable" || status === "info";
				}
				return status === selectedStatus;
			});
			
			if (matchingChecks.length > 0) {
				groups.push({
					categoryLabel: cat.label === "Generative Engine Optimization" ? "GEO" : cat.label,
					checks: matchingChecks,
				});
			}
		}
		return groups;
	}, [seoCategories, selectedStatus]);

	return (
		<section
			className={ `rounded-xl border border-brand-border bg-brand-surface shadow-panel transition-all ${ selectedStatus ? "p-6 lg:pr-0 lg:py-0 lg:pl-6" : "p-6" }` }>
			<div className={ `flex flex-col lg:flex-row lg:justify-between gap-5 ${ selectedStatus ? "lg:items-stretch" : "lg:items-start" }` }>
				<div className={ `flex-1 ${ selectedStatus ? "lg:py-6 lg:pr-5" : "" }` }>
					<h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">
						Overall SEO Score
					</h2>
					<div className="flex items-end gap-3">
						<div className="text-5xl font-extrabold text-brand-accent leading-none">
							{displayScore}
						</div>
						<div className="pb-1 text-sm text-brand-muted">
							/ 100
						</div>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<StatusBadge
							status={ displayStatus }
							classMap={ categoryStatusClasses }
							className="gap-1.5 px-2.5 py-1"
						>
							{ formatStatus(displayStatus) }
						</StatusBadge>
					</div>
					<p className="mt-3 text-sm text-brand-muted leading-relaxed max-w-2xl">
						{seoCategories.summary}
					</p>
				</div>
				
				{ selectedStatus ? (
					<div
						className="flex flex-col w-full lg:w-[24rem] h-[196px] lg:h-[260px] bg-brand-card-header/35 border border-brand-border/40 lg:border-y-0 lg:border-r-0 lg:border-l rounded-xl lg:rounded-l-none lg:rounded-r-xl pt-0 pl-3 pr-0 pb-0 lg:pt-0 lg:pl-6 lg:pr-0 lg:pb-0 min-h-0">
						{ groupedFilteredChecks.length === 0 ? (
							<div className="flex flex-col items-center justify-center flex-1 text-center pt-3 lg:pt-6 pr-3 lg:pr-6 pb-3 lg:pb-6">
								<span className="text-xs text-brand-muted font-medium">No checks match this status</span>
							</div>
						) : (
							<div className="flex-1 overflow-y-auto pt-3 lg:pt-6 pr-3 lg:pr-6 pb-3 lg:pb-6 custom-scrollbar min-h-0">
								{ groupedFilteredChecks.map((group) => (
									<div key={ group.categoryLabel } className="mb-4 last:mb-0">
										<div className="flex items-center gap-2 mb-1.5 px-1 shrink-0">
											<span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
												{ group.categoryLabel }
											</span>
											<div className="h-px bg-brand-border/20 flex-1"/>
										</div>
										<div className="space-y-1.5">
											{ group.checks.map((check) => {
												const isExcluded = excludedCheckIds.has(check.id);
												return (
													<div
														key={ check.id }
														className={ `flex items-center justify-between p-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 text-xs transition-opacity ${ isExcluded ? "opacity-45" : "" }` }
													>
														<div className="min-w-0 pr-2">
															<div className="font-semibold text-brand-headline truncate">
																{ check.name }
															</div>
														</div>
														<span
															className={ `inline-flex items-center gap-1.5 rounded-full text-[10px] font-bold px-2 py-0.5 shrink-0 ${ categoryCheckStatusClasses[check.status as keyof typeof categoryCheckStatusClasses] || "" }` }>
															{ formatStatusLabel(check.status) }
														</span>
													</div>
												);
											}) }
										</div>
									</div>
								)) }
							</div>
						) }
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:min-w-[24rem]">
						{ categoryOrder.map((categoryId) => (
							<CategoryScoreChip
								key={ categoryId }
								category={ seoCategories.categories[categoryId] }
								isHidden={ hiddenIds.has(categoryId) }
								canToggle={ !seoCategories.categories[categoryId].excludedFromOverall }
								onToggle={ () => toggleCategory(categoryId) }
								excludedCheckIds={ excludedCheckIds }
							/>
						)) }
					</div>
				) }
			</div>
		</section>
	);
});

const CategoryScoreChip = memo(function CategoryScoreChip({
	category,
	isHidden,
	canToggle,
	onToggle,
	excludedCheckIds,
}: {
	category: SeoCategoryResult;
	isHidden: boolean;
	canToggle: boolean;
	onToggle: () => void;
	excludedCheckIds: Set<string>;
}) {
	const displayScore = useMemo(
		() => recalculateCategoryScore(category, excludedCheckIds),
		[category, excludedCheckIds],
	);

	return (
		<div
			className={`rounded-lg border border-brand-border bg-brand-card-header px-3 py-2 relative transition-opacity cursor-pointer ${isHidden ? "opacity-40" : "hover:border-brand-accent/50"}`}
			onClick={() => {
				document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
			}}
		>
			{canToggle && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onToggle(); } }
					className="absolute top-1 right-1 rounded p-0.5 text-brand-muted hover:text-brand-headline transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
					aria-label={isHidden ? "Show score" : "Hide score"}
				>
					{isHidden ? <EyeOffIcon /> : <EyeIcon />}
				</button>
			)}
			<div className={`text-xs font-semibold text-brand-muted truncate ${canToggle ? "pr-6" : ""}`}>
				{category.label === "Generative Engine Optimization"
					? "GEO"
					: category.label}
			</div>
			<div className="mt-1 flex items-center justify-between gap-2">
				<span className={`text-lg font-extrabold text-brand-headline ${isHidden ? "line-through decoration-2" : ""}`}>
					{displayScore}
				</span>
				<span className={`h-2.5 w-2.5 rounded-full ${dotClassMap[category.status]}`} />
			</div>
		</div>
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

function formatStatus(status: SeoCategoryStatus): string {
	return status.replace("_", " ");
}
