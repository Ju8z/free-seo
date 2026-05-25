import { memo, useCallback, useState } from "react";
import type { AuditReport, CheckStatus, SeoCategoryResult } from "../../../shared/types";
import SummaryCard from "./SummaryCard";
import NotesList from "./NotesList";
import SerpSnippetPreview from "./SerpSnippetPreview";
import SeoScoreOverview from "./SeoScoreOverview";
import SeoCategoryCards from "./SeoCategoryCards";
import SocialResultsSection from "./SocialResultsSection";
import { categoryStatusClasses } from "../utils/constants";
import { formatStatusLabel } from "../utils/format";
import StatusBadge from "./StatusBadge";

export default memo(function ResultsView({
	audit,
}: {
	audit: AuditReport;
}) {
	const [excludedCheckIds, setExcludedCheckIds] = useState<Set<string>>(new Set());
	const [selectedStatus, setSelectedStatus] = useState<CheckStatus | null>(null);

	const toggleCheckExclusion = useCallback((id: string) => {
		setExcludedCheckIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);
	
	const handleStatusSelect = useCallback((status: CheckStatus) => {
		setSelectedStatus((prev) => (prev === status ? null : status));
	}, []);

	return (
		<div className="animate-reveal space-y-3">
			<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
				<div className="md:col-span-3">
					<SeoScoreOverview
						seoCategories={ audit.seoCategories }
						excludedCheckIds={ excludedCheckIds }
						selectedStatus={ selectedStatus }
					/>
				</div>
				<div className="md:col-span-1">
					<SummaryCard
						audit={ audit }
						selectedStatus={ selectedStatus }
						onSelectStatus={ handleStatusSelect }
					/>
				</div>
			</div>
			
			<SerpSnippetPreview preview={ audit.serpPreview }/>
			
			<SeoCategoryCards seoCategories={ audit.seoCategories } excludedCheckIds={ excludedCheckIds } onToggleCheckExclusion={ toggleCheckExclusion }/>
			
			{ audit.socialResults ? (
				<SocialResultsSection
					socialResults={ audit.socialResults }
					socialCategory={ audit.seoCategories.categories.social }
				/>
			) : audit.seoCategories.categories.social.status === "skipped" && (
				<SkippedSocialCategory category={ audit.seoCategories.categories.social }/>
			)}
			
			<NotesList notes={ audit.notes }/>
		</div>
	);
});

const SkippedSocialCategory = memo(function SkippedSocialCategory({
	category,
}: {
	category: SeoCategoryResult;
}) {
	return (
		<section id="category-social" className="scroll-mt-4 rounded-xl border border-brand-border bg-brand-surface p-6 shadow-panel">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h3 className="text-lg font-bold text-brand-headline">{ category.label }</h3>
					<p className="mt-1 text-sm text-brand-muted">{ category.description }</p>
				</div>
				<StatusBadge status={ category.status } classMap={ categoryStatusClasses }>
					{ formatStatusLabel(category.status) }
				</StatusBadge>
			</div>
			<p className="mt-4 text-sm text-brand-muted">{ category.summary }</p>
		</section>
	);
});
