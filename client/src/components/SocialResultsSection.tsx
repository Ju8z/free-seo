import React, { memo, useMemo } from "react";
import type { SeoCategoryCheck, SeoCategoryResult, SocialCheckItem, SocialResultsReport } from "../../../shared/types";
import { getAuditStatus } from "../../../shared/types";
import ReportCard, { ReportCardActions } from "./ReportCard";
import { categoryStatusClasses } from "../utils/constants";
import { formatCompactNumber, formatStatusLabel } from "../utils/format";
import { buildCheckActions } from "./categoryCardActions";
import ChecksSummary from "./ChecksSummary";
import StatusBadge from "./StatusBadge";

const socialStatusClasses: Record<
	SocialCheckItem["status"],
	string
> = {
	pass: "bg-brand-success-soft text-brand-success",
	warning: "bg-brand-warning-soft text-brand-warning",
	fail: "bg-brand-danger-soft text-brand-danger",
	unavailable: "bg-brand-neutral-soft text-brand-muted",
};

export default memo(function SocialResultsSection({
	socialResults,
	socialCategory,
}: {
	socialResults: SocialResultsReport;
	socialCategory: SeoCategoryResult;
}) {
	const score = socialResults.score;
	const status = getAuditStatus(score);
	const checksByItemKey = useMemo(
		() => new Map(socialCategory.checks.map((check) => [check.id, check])),
		[socialCategory.checks],
	);

	const summaryItems = useMemo(() => [
		{
			status: "pass",
			label: "pass",
			count: socialResults.statusSummary.pass,
			className: socialStatusClasses.pass,
		},
		{
			status: "warning",
			label: "warning",
			count: socialResults.statusSummary.warning,
			className: socialStatusClasses.warning,
		},
		{
			status: "fail",
			label: "fail",
			count: socialResults.statusSummary.fail,
			className: socialStatusClasses.fail,
		},
		{
			status: "unavailable",
			label: "unavailable",
			count: socialResults.statusSummary.unavailable,
			className: socialStatusClasses.unavailable,
		},
	] as const, [socialResults.statusSummary]);

	// Single pass over items to derive both chips and rows
	const { chips, rows } = useMemo(() => {
		const chipElements: React.JSX.Element[] = [];
		const rowElements: React.JSX.Element[] = [];
		for (const item of socialResults.items) {
			if (item.status !== "pass" || item.score !== 100) {
				chipElements.push(<SocialCheckChip key={item.key} item={item} />);
			}
			rowElements.push(
				<SocialCheckRow
					key={item.key}
					item={item}
					check={checksByItemKey.get(item.key)}
				/>
			);
		}
		return { chips: chipElements, rows: rowElements };
	}, [socialResults.items, checksByItemKey]);

	return (
			<section className="space-y-3" id="category-social">
				<ReportCard
				title="Social Results"
				badge={
					<StatusBadge
						status={ status }
						classMap={ categoryStatusClasses }
					>
						{ formatStatusLabel(status) } - { score }
					</StatusBadge>
				}
				summary="Social media presence, Open Graph / X Card tags, and platform integration."
				>
					<ChecksSummary items={summaryItems} />
				<div className="flex flex-wrap gap-1.5">
					{ chips }
				</div>

				<div className="space-y-2">
					{ rows }
				</div>
			</ReportCard>
		</section>
	);
});

const SocialCheckRow = memo(function SocialCheckRow({
	item,
	check,
}: {
	item: SocialCheckItem;
	check?: SeoCategoryCheck;
	}) {
	return (
		<div className="rounded-lg border border-brand-border bg-brand-surface-soft p-3">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<SocialCheckHeader item={ item }/>

					<p className="mt-1 text-sm text-brand-muted leading-relaxed">
						{ item.helpText || item.message }
					</p>

					<SocialDetectedUrl url={ item.detectedUrl }/>
					<SocialMetrics metrics={ item.metrics }/>
				</div>
			</div>

			<SocialDetails details={ item.details }/>
			<SocialCheckActions check={ check }/>
		</div>
	);
});

const SocialCheckHeader = memo(function SocialCheckHeader({ item }: { item: SocialCheckItem }) {
	const showScore = item.score > 0 && item.score < 100 && item.status !== "unavailable";

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<strong className="text-sm text-brand-headline">
				{ item.label }
			</strong>
			<StatusBadge
				status={ item.status }
				classMap={ socialStatusClasses }
				className="px-2 py-0.5"
			>
				{ item.status }
			</StatusBadge>
			{ showScore && (
				<span className="text-xs text-brand-muted">
					({ item.score })
				</span>
			) }
		</div>
	);
});

const SocialDetectedUrl = memo(function SocialDetectedUrl({ url }: { url?: string }) {
	if (!url) return null;

	return (
		<div className="mt-1">
			<a
				href={ url }
				target="_blank"
				rel="noopener noreferrer"
				className="text-xs text-brand-accent hover:underline break-all"
			>
				{ url }
			</a>
		</div>
	);
});

const SocialMetrics = memo(function SocialMetrics({
	metrics,
}: {
	metrics?: SocialCheckItem["metrics"];
}) {
	if (!metrics || (metrics.subscribers == null && metrics.views == null)) {
		return null;
	}

	return (
		<div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-brand-muted">
			{ metrics.subscribers != null && (
				<span>
					<strong>Subscribers:</strong>{" "}
					{ formatCompactNumber(metrics.subscribers) }
				</span>
			) }
			{ metrics.views != null && (
				<span>
					<strong>Views:</strong>{" "}
					{ formatCompactNumber(metrics.views) }
				</span>
			) }
		</div>
	);
});

const SocialDetails = memo(function SocialDetails({ details }: { details?: string[] }) {
	if (!details || details.length === 0) return null;

	return (
		<div className="mt-2 text-xs text-brand-muted">
			{ details.map((detail) => (
				<div key={ detail }>{ detail }</div>
			)) }
		</div>
	);
});

const SocialCheckChip = memo(function SocialCheckChip({
	item,
}: {
	item: SocialCheckItem;
}) {
	const showScore = item.score < 100 && item.status !== "unavailable";
	const scoreSuffix = showScore ? ` (${item.score})` : "";

	return (
		<StatusBadge
			status={ item.status }
			classMap={ socialStatusClasses }
			className="px-2.5 py-1"
		>
			{ item.label }: { formatStatusLabel(item.status) }{ scoreSuffix }
		</StatusBadge>
	);
});

const SocialCheckActions = memo(function SocialCheckActions({
	check,
}: {
	check?: SeoCategoryCheck;
}) {
	if (!check) return null;

	const actions = buildCheckActions(check);
	if (actions.length === 0) return null;

	return (
		<div className="mt-3">
			<ReportCardActions actions={ actions }/>
		</div>
	);
});
