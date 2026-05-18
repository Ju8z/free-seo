import { memo } from "react";
import StatusBadge from "./StatusBadge";
import { ChecksIcon } from "./StatusIcon";

export interface ChecksSummaryItem {
	status: string;
	label: string;
	count: number;
	className: string;
}

export default memo(function ChecksSummary({
	items,
}: {
	items: readonly ChecksSummaryItem[];
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-headline">
				<ChecksIcon className="h-4 w-4 text-brand-muted"/>
				Checks:
			</span>
			{ items.map((item) => (
				<StatusBadge
					key={ `${ item.status }-${ item.label }` }
					status={ item.status }
					classMap={{ [item.status]: item.className }}
					className="gap-1.5 px-2.5 py-1"
				>
					<span>{ item.count }</span>
					<span>{ item.label }</span>
				</StatusBadge>
			)) }
		</div>
	);
});
