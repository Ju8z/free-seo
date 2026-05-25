import { memo } from "react";
import { type AuditCategoryId, auditCategoryOptions } from "../../../shared/types";

function getEstimatedTimeLabel(selectedCategoryIds: Set<AuditCategoryId>): string {
	const selectedOptions = auditCategoryOptions.filter((option) => selectedCategoryIds.has(option.id));
	if (selectedOptions.length === 0) return "Select tests";
	return selectedOptions.reduce((slowest, option) => (
		option.maxSeconds > slowest.maxSeconds ? option : slowest
	), selectedOptions[0]).timeLabel;
}

export default memo(function EmptyState({
	selectedCategoryIds,
	onToggleCategory,
	onSelectAll,
	onClearSelection,
}: {
	selectedCategoryIds: Set<AuditCategoryId>;
	onToggleCategory: (id: AuditCategoryId) => void;
	onSelectAll: () => void;
	onClearSelection: () => void;
}) {
	const selectedCount = selectedCategoryIds.size;
	const estimatedTimeLabel = getEstimatedTimeLabel(selectedCategoryIds);
	const hasSelection = selectedCount > 0;
	
	return (
		<div className="rounded-xl border border-brand-border bg-brand-surface p-5 shadow-panel sm:p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-lg font-bold text-brand-headline">
						Choose tests to run
					</h2>
					<p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-muted">
						Preselect audit categories before entering a URL. Slower checks are marked so you can decide how much depth you want.
					</p>
				</div>
				<div className="rounded-lg border border-brand-border bg-brand-card-header px-3 py-2 text-sm">
					<span className="font-bold text-brand-headline">{ selectedCount }</span>
					<span className="text-brand-muted"> / { auditCategoryOptions.length } selected - </span>
					<span className="font-bold text-brand-accent">{ estimatedTimeLabel }</span>
				</div>
			</div>
			
			<div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{ auditCategoryOptions.map((option) => {
					const isSelected = selectedCategoryIds.has(option.id);
					return (
						<button
							key={ option.id }
							type="button"
							aria-pressed={ isSelected }
							onClick={ () => onToggleCategory(option.id) }
							className={ `rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/30 ${
								isSelected
									? "border-brand-accent/45 bg-brand-accent-soft"
									: "border-brand-border bg-brand-card-header hover:border-brand-accent/35"
							}` }
						>
							<span className="flex items-start justify-between gap-2">
								<span className="font-bold text-brand-headline">{ option.label }</span>
								<span className="rounded-full bg-brand-surface px-2 py-0.5 text-[11px] font-bold text-brand-accent">
									{ option.timeLabel }
								</span>
							</span>
							<span className="mt-2 block text-xs leading-relaxed text-brand-muted">
								{ option.description }
							</span>
							<span className={ `mt-3 inline-flex items-center gap-1.5 text-xs font-bold ${
								isSelected ? "text-brand-success" : "text-brand-muted"
							}` }>
								<span aria-hidden="true">{ isSelected ? "[x]" : "[ ]" }</span>
								{ isSelected ? "Selected" : "Skipped" }
							</span>
						</button>
					);
				}) }
			</div>
			
			<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className={ `text-sm ${ hasSelection ? "text-brand-muted" : "font-semibold text-brand-danger" }` }>
					{ hasSelection
						? "The audit button uses these selected categories. Unselected categories will be shown as skipped in the report."
						: "Select at least one test category before running an audit." }
				</p>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={ onSelectAll }
						className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-xs font-bold text-brand-headline transition-colors hover:border-brand-accent/40"
					>
						Select all
					</button>
					<button
						type="button"
						onClick={ onClearSelection }
						className="rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-xs font-bold text-brand-muted transition-colors hover:border-brand-accent/40 hover:text-brand-headline"
					>
						Clear
					</button>
				</div>
			</div>
		</div>
	);
});
