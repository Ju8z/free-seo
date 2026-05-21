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
	const interactive = Boolean(onClick);
	return (
		<span
			onClick={ onClick }
			onKeyDown={
				interactive
					? (e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onClick!();
						}
					}
					: undefined
			}
			tabIndex={ interactive ? 0 : undefined }
			role={ interactive ? "button" : undefined }
			className={ `inline-flex items-center gap-1.5 rounded-full text-xs font-bold ${ className } ${ classMap[status] }${ interactive ? " cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-accent/30" : "" }` }
		>
			<StatusIcon status={ status }/>
			{ children }
		</span>
	);
});

