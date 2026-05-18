import { memo, type ReactNode } from "react";

export interface ReportCardAction {
	label: string;
	content: ReactNode;
	defaultOpen?: boolean;
}

export default memo(function ReportCard({
	title,
	badge,
	summary,
	children,
	actions = [],
}: {
	title: string;
	badge?: ReactNode;
	summary?: ReactNode;
	children: ReactNode;
	actions?: ReportCardAction[];
	}) {
	return (
		<article className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-panel">
			<div className="flex flex-col md:flex-row md:items-stretch">
					<header
						className="flex items-start justify-between gap-3 border-brand-border bg-brand-card-header px-3 py-3 text-sm md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
						<div className="min-w-0">
							<h3 className="font-semibold text-brand-headline leading-snug">
								{ title }
						</h3>
						{ summary && (
							<div className="mt-1 text-xs leading-relaxed text-brand-muted">
								{ summary }
							</div>
						) }
					</div>
					{ badge }
				</header>
				
				<div className="min-w-0 flex-1 p-3 text-sm leading-relaxed space-y-3">
					<div className="space-y-2">{ children }</div>
					
					<ReportCardActions actions={ actions }/>
				</div>
			</div>
		</article>
	);
});

export const ReportCardActions = memo(function ReportCardActions({
	actions,
}: {
	actions: ReportCardAction[];
}) {
	if (actions.length === 0) return null;

	return (
		<div className="space-y-2">
				{ actions.map((action) => (
					<details
						key={ action.label }
						open={ action.defaultOpen }
						className="rounded-lg border border-brand-border bg-brand-surface-soft"
					>
						<summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-brand-accent">
							{ action.label }
					</summary>
					<div className="border-t border-brand-border p-3">
						{ action.content }
					</div>
				</details>
			)) }
		</div>
	);
});

export function KeyValue({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<p className="wrap-break-word">
			<strong>{ label }:</strong> { value }
		</p>
	);
}
