import { memo } from "react";
import Spinner from "./Spinner";

export default memo(function LoadingBanner() {
	return (
		<div className="flex items-center gap-2 rounded-lg border border-brand-accent/20 bg-brand-accent-soft px-4 py-3 text-sm text-brand-accent-dark">
			<Spinner className="h-4 w-4 text-brand-accent"/>
			Running audit...
		</div>
	);
});
