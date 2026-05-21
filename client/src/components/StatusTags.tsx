import { memo, useMemo } from "react";
import type { CheckStatus, StatusSummary } from "../../../shared/types";
import { statusTagClasses } from "../utils/constants";
import StatusBadge from "./StatusBadge";

function statusLabel(status: CheckStatus, count: number): string {
	return `${ count } ${ status }`;
}

export default memo(function StatusTags({
	statusSummary,
	selectedStatus,
	onSelectStatus,
}: {
	statusSummary: StatusSummary;
	selectedStatus?: CheckStatus | null;
	onSelectStatus?: (status: CheckStatus) => void;
}) {
	const visible = useMemo(() => {
		const entries = Object.entries(statusSummary) as [CheckStatus, number][];
		return entries.filter(([, count]) => count > 0);
	}, [statusSummary]);
	
	return (
		<div className="flex flex-wrap gap-1.5">
			{ visible.map(([status, count]) => {
				const isSelected = selectedStatus === status;
				return (
					<StatusBadge
						key={ status }
						status={ status }
						classMap={ statusTagClasses }
						className={ `gap-1.5 px-2.5 py-1 cursor-pointer transition-all ${ isSelected ? "ring-[0.5px] ring-brand-accent ring-offset-[0.5px] ring-offset-brand-surface scale-[1.04]" : "hover:opacity-90 hover:scale-[1.02]" }` }
						onClick={ () => onSelectStatus?.(status) }
					>
						{ statusLabel(status, count) }
					</StatusBadge>
				);
			}) }
		</div>
	);
});
