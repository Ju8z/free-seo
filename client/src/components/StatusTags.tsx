import { memo, useMemo } from "react";
import type { CheckStatus, StatusSummary } from "../../../shared/types";
import { statusTagClasses } from "../utils/constants";
import StatusBadge from "./StatusBadge";

function statusLabel(status: CheckStatus, count: number): string {
	return `${ count } ${ status }`;
}

export default memo(function StatusTags({
	statusSummary,
}: {
	statusSummary: StatusSummary;
}) {
	const visible = useMemo(() => {
		const entries = Object.entries(statusSummary) as [CheckStatus, number][];
		return entries.filter(([, count]) => count > 0);
	}, [statusSummary]);
	
	return (
		<div className="flex flex-wrap gap-1.5">
			{ visible.map(([status, count]) => (
				<StatusBadge
					key={ status }
					status={ status }
					classMap={ statusTagClasses }
					className="gap-1.5 px-2.5 py-1"
				>
					{ statusLabel(status, count) }
				</StatusBadge>
			)) }
		</div>
	);
});
