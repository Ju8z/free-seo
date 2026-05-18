import { memo } from "react";
import type { SerpSnippetPreview as SerpSnippetPreviewData } from "../../../shared/types";
import ReportCard, { KeyValue } from "./ReportCard";

export default memo(function SerpSnippetPreview( { preview, }: {
	preview: SerpSnippetPreviewData;
} ) {
	return (
		<ReportCard
			title="SERP Snippet Preview"
			summary="Search result preview"
			actions={[
				{
					label: "Preview details",
					content: (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-brand-muted">
							<KeyValue
								label="Title"
								value={`${ preview.titleLength } characters`}
							/>
							<KeyValue
								label="Description"
								value={`${ preview.descriptionLength } characters`}
							/>
							<KeyValue
								label="Source URL"
								value={preview.sourceUrl}
							/>
						</div>
					),
				},
			]}
			>
				<div className="max-w-2xl rounded-lg border border-brand-border-strong bg-brand-surface-soft p-3">
					<div className="rounded-md border border-[#dadce0] bg-white p-4 shadow-sm">
						<div className="truncate text-sm text-[#202124]">
							{ preview.displayUrl || preview.sourceUrl }
						</div>
						<div className="truncate text-xl leading-snug text-[#1a0dab]">
							{ preview.title || "No page title found" }
						</div>
						<p className="mt-1 text-sm leading-relaxed text-[#4d5156] line-clamp-2">
							{ preview.description || "No meta description found." }
						</p>
					</div>
				</div>
			</ReportCard>
	);
});
