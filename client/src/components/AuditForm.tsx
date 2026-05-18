import { memo, type FormEvent, type RefObject, useCallback, useState } from "react";
import Spinner from "./Spinner";

export default memo(function AuditForm({
	onSubmit,
	isLoading,
	inputRef,
	auditCount,
	cooldownRemaining = 0,
}: {
	onSubmit: (input: string) => Promise<void>;
	isLoading: boolean;
	inputRef?: RefObject<HTMLInputElement | null>;
	auditCount: number;
	cooldownRemaining?: number;
}) {
	const [value, setValue] = useState("");
	const [localError, setLocalError] = useState("");
	
	const disabled = isLoading || cooldownRemaining > 0;

	const handleSubmit = useCallback((event: FormEvent) => {
		event.preventDefault();
		const trimmed = value.trim();
		
		if (!trimmed) {
			setLocalError("Enter a domain or URL to audit.");
			return;
		}
		
		setLocalError("");
		onSubmit(trimmed);
	}, [value, onSubmit]);
	
	const handleChange = useCallback((next: string) => {
		setValue(next);
		if (localError) setLocalError("");
	}, [localError]);

	const buttonLabel = isLoading
		? "..."
		: cooldownRemaining > 0
			? `Wait ${cooldownRemaining}s`
			: "Audit";
	
	return (
		<form onSubmit={ handleSubmit } noValidate>
			<div className="flex flex-col gap-2 sm:flex-row">
					<input
						ref={ inputRef }
						type="text"
						className="flex-1 rounded-lg border border-brand-border-strong bg-brand-input px-3 py-2 text-sm text-brand-headline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 disabled:bg-brand-input-disabled disabled:text-brand-muted"
						placeholder="alfatraining.de"
						autoComplete="off"
						value={ value }
						onChange={ (e) => handleChange(e.target.value) }
					disabled={ disabled }
				/>
				<button
					type="submit"
					className="inline-flex min-w-20 items-center justify-center gap-2 rounded-lg bg-brand-accent px-5 py-2 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-accent-dark focus:outline-none focus:ring-2 focus:ring-brand-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={ disabled }
				>
					{ isLoading && <Spinner/> }
					{ buttonLabel }
				</button>
			</div>
			<p className="mt-0.5 text-xs ml-4 text-brand-accent">
				Successful audits completed: <strong>{auditCount}</strong>
			</p>
			{ localError && (
				<p className="mt-1 text-xs text-brand-danger">
					{ localError }
				</p>
			) }
		</form>
	);
});
