import { memo } from "react";

export default memo(function CodeBlock({
	code,
	label = "Code Example",
}: {
	code: string;
	label?: string;
}) {
	const lines = (code.trimEnd() || " ").split(/\r?\n/);
	const lineCountLabel = `${ lines.length } ${ lines.length === 1 ? "line" : "lines" }`;

	return (
		<div className="overflow-hidden rounded-lg border border-brand-border-strong bg-[var(--theme-code-background)] shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-brand-border bg-brand-card-header px-3 py-2">
				<div className="flex min-w-0 items-center gap-2">
					<CodeEditorIcon/>
					<span className="truncate text-xs font-semibold text-brand-headline">
						{ label }
					</span>
				</div>
				<span className="shrink-0 text-[0.7rem] font-medium text-brand-muted">
					{ lineCountLabel }
				</span>
			</div>
			<pre className="max-h-96 overflow-auto py-3 font-mono text-xs leading-relaxed">
				<code className="block min-w-max">{ lines.map((line, index) => (
					<span key={ `${ index }-${ line }` } className="flex">
						<span className="w-11 shrink-0 select-none border-r border-brand-border px-3 text-right text-brand-muted/70">
							{ index + 1 }
						</span>
						<span className="px-3 text-brand-headline">
							{ line || " " }
						</span>
					</span>
				)) }</code>
			</pre>
		</div>
	);
});

function CodeEditorIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 256 256"
			className="h-4 w-4 shrink-0"
			aria-hidden="true"
		>
			<defs>
				<linearGradient
					id="code-editor-icon-gradient"
					gradientUnits="userSpaceOnUse"
					x1="127.8439"
					y1="257.34"
					x2="127.8439"
					y2="2.6598"
					gradientTransform="matrix(1 0 0 -1 0 258)"
				>
					<stop offset="0" stopColor="#FFFFFF"/>
					<stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
				</linearGradient>
				<mask
					maskUnits="userSpaceOnUse"
					x="-0.16"
					y="0.66"
					width="256.16"
					height="254.68"
					id="code-editor-icon-mask"
				>
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						fill="#FFFFFF"
						d="M181.53,254.25c4.03,1.57,8.63,1.47,12.7-0.49l52.71-25.36c5.54-2.66,9.06-8.27,9.06-14.42V42.02 c0-6.15-3.52-11.75-9.06-14.42L194.23,2.24c-5.34-2.57-11.59-1.94-16.28,1.47c-0.67,0.49-1.31,1.03-1.91,1.63L75.15,97.39 L31.2,64.02c-4.09-3.11-9.81-2.85-13.61,0.61L3.49,77.45c-4.65,4.23-4.65,11.54-0.01,15.77L41.59,128L3.48,162.77 c-4.64,4.24-4.64,11.55,0.01,15.78l14.1,12.82c3.8,3.46,9.52,3.71,13.61,0.61l43.95-33.36l100.9,92.05 C177.65,252.26,179.52,253.47,181.53,254.25z M192.04,69.89L115.48,128l76.56,58.12V69.89z"
					/>
				</mask>
			</defs>
			<g mask="url(#code-editor-icon-mask)">
				<path
					fill="#0065A9"
					d="M246.94,27.64l-52.75-25.4c-6.1-2.94-13.4-1.7-18.19,3.09L3.32,162.77c-4.64,4.24-4.64,11.55,0.01,15.78 l14.1,12.82c3.8,3.46,9.53,3.71,13.62,0.61L239,34.23c6.98-5.29,17-0.32,17,8.44v-0.61C256,35.91,252.48,30.3,246.94,27.64z"
				/>
				<path
					fill="#007ACC"
					d="M246.94,228.36l-52.75,25.4c-6.1,2.94-13.4,1.7-18.19-3.09L3.32,93.23c-4.64-4.23-4.64-11.55,0.01-15.77 l14.1-12.82c3.8-3.46,9.53-3.71,13.62-0.61L239,221.77c6.98,5.29,17,0.32,17-8.44v0.61C256,220.09,252.48,225.7,246.94,228.36z"
				/>
				<path
					fill="#1F9CF0"
					d="M194.2,253.76c-6.11,2.94-13.4,1.7-18.2-3.1c5.9,5.9,16,1.72,16-6.63V11.96c0-8.35-10.1-12.53-16-6.63 c4.79-4.79,12.09-6.03,18.2-3.1l52.74,25.36c5.54,2.67,9.07,8.27,9.07,14.42v171.97c0,6.15-3.52,11.75-9.07,14.42L194.2,253.76z"
				/>
				<path
					opacity="0.25"
					fillRule="evenodd"
					clipRule="evenodd"
					fill="url(#code-editor-icon-gradient)"
					d="M181.38,254.25c4.03,1.57,8.63,1.47,12.7-0.49l52.71-25.36c5.54-2.66,9.06-8.27,9.06-14.42V42.02 c0-6.15-3.52-11.75-9.06-14.42L194.08,2.24c-5.34-2.57-11.59-1.94-16.28,1.47c-0.67,0.49-1.31,1.03-1.91,1.63L74.99,97.39 L31.04,64.02c-4.09-3.11-9.81-2.85-13.61,0.61L3.33,77.45c-4.65,4.23-4.65,11.54-0.01,15.78L41.44,128L3.32,162.77 c-4.64,4.24-4.64,11.55,0.01,15.78l14.1,12.82c3.8,3.46,9.52,3.71,13.61,0.61l43.95-33.36l100.9,92.05 C177.49,252.26,179.36,253.47,181.38,254.25z M191.88,69.89L115.32,128l76.56,58.12V69.89z"
				/>
			</g>
		</svg>
	);
}
