import { memo } from "react";

export default memo(function EmptyState() {
	return (
		<div className="rounded-xl border border-brand-border bg-brand-surface p-8 text-center shadow-panel">
			<p className="text-brand-muted text-sm">
				Enter a domain or URL to generate a report.
			</p>
		</div>
	);
});
