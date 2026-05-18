import { memo } from "react";
import type { Theme } from "../hooks/useTheme";

const options: Theme[] = ["light", "dark"];

export default memo(function ThemeToggle({
	theme,
	setTheme,
}: {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}) {
	return (
		<div
			className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-surface-soft p-1 shadow-panel"
			role="group"
			aria-label="Theme"
		>
			{ options.map((option) => {
				const isActive = option === theme;

				return (
					<button
						key={ option }
						type="button"
						onClick={ () => setTheme(option) }
						aria-pressed={ isActive }
						className={ `rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
							isActive
								? "bg-brand-surface text-brand-headline shadow-sm"
								: "text-brand-muted hover:text-brand-headline"
						}` }
					>
						{ option }
					</button>
				);
			}) }
		</div>
	);
});
