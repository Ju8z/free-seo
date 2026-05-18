import { memo, useCallback, useState } from "react";
import type { AuditReport } from "../../../shared/types";
import SummaryCard from "./SummaryCard";
import NotesList from "./NotesList";
import SerpSnippetPreview from "./SerpSnippetPreview";
import SeoScoreOverview from "./SeoScoreOverview";
import SeoCategoryCards from "./SeoCategoryCards";
import SocialResultsSection from "./SocialResultsSection";

export default memo(function ResultsView({
	audit,
}: {
	audit: AuditReport;
}) {
	const [excludedCheckIds, setExcludedCheckIds] = useState<Set<string>>(new Set());

	const toggleCheckExclusion = useCallback((id: string) => {
		setExcludedCheckIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	return (
		<div className="animate-reveal space-y-3">
			<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
				<div className="md:col-span-3">
					<SeoScoreOverview seoCategories={ audit.seoCategories } excludedCheckIds={ excludedCheckIds }/>
				</div>
				<div className="md:col-span-1">
					<SummaryCard audit={ audit }/>
				</div>
			</div>
			
			<SerpSnippetPreview preview={ audit.serpPreview }/>
			
			<SeoCategoryCards seoCategories={ audit.seoCategories } excludedCheckIds={ excludedCheckIds } onToggleCheckExclusion={ toggleCheckExclusion }/>
			
			{audit.socialResults && (
				<SocialResultsSection
					socialResults={ audit.socialResults }
					socialCategory={ audit.seoCategories.categories.social }
				/>
			)}
			
			<NotesList notes={ audit.notes }/>
		</div>
	);
});
