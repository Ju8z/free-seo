import { memo, type ReactNode } from "react";
import StatusIcon from "./StatusIcon";

export default memo(function StatusBadge<TStatus extends string>({
	status,
	classMap,
	children,
	className = "px-2.5 py-0.5",
}: {
	status: TStatus;
	classMap: Record<TStatus, string>;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span className={ `inline-flex items-center gap-1.5 rounded-full text-xs font-bold ${ className } ${ classMap[status] }` }>
			<StatusIcon status={ status }/>
			{ children }
		</span>
	);
});
