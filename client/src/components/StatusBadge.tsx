import { memo, type ReactNode } from "react";
import StatusIcon from "./StatusIcon";

export default memo(function StatusBadge<TStatus extends string>({
	status,
	classMap,
	children,
	className = "px-2.5 py-0.5",
	onClick,
}: {
	status: TStatus;
	classMap: Record<TStatus, string>;
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}) {
	const Element = onClick ? "button" : "span";
	const buttonProps = onClick ? { type: "button" as const, onClick } : {};

	return (
		<Element
			{ ...buttonProps }
			className={ `inline-flex items-center gap-1.5 rounded-full text-xs font-bold appearance-none bg-transparent border-0 p-0 ${ className } ${ classMap[status] } ${ onClick ? "cursor-pointer" : "" }` }
		>
			<StatusIcon status={ status }/>
			{ children }
		</Element>
	);
});
