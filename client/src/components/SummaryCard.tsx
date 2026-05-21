import { memo } from "react";
import type { AuditReport, CheckStatus } from "../../../shared/types";
import StatusTags from "./StatusTags";

export default memo(function SummaryCard({
	audit,
	selectedStatus,
	onSelectStatus,
}: {
	audit: AuditReport;
	selectedStatus?: CheckStatus | null;
	onSelectStatus?: (status: CheckStatus) => void;
}) {
	return (
		<div className="h-full rounded-xl border border-brand-border bg-brand-surface p-6 shadow-panel">
			<h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">
				Final Resolved URL
			</h3>
			<a
				href={ audit.finalUrl }
				target="_blank"
				rel="noopener noreferrer"
				className="text-brand-accent-dark font-medium break-all text-sm hover:underline"
			>
				{ audit.finalUrl }
			</a>
			<div className="mt-3">
				<StatusTags
					statusSummary={ audit.statusSummary }
					selectedStatus={ selectedStatus }
					onSelectStatus={ onSelectStatus }
				/>
			</div>
		</div>
	);
});
