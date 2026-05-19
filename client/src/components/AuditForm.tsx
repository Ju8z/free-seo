import { type FormEvent, memo, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";

export default memo(function AuditForm({
	onSubmit,
	isLoading,
	inputRef,
	auditCount,
	cooldownSeconds = 0,
	durationMs = null,
}: {
	onSubmit: (input: string) => Promise<void>;
	isLoading: boolean;
	inputRef?: RefObject<HTMLInputElement | null>;
	auditCount: number;
	cooldownSeconds?: number;
	durationMs?: number | null;
}) {
	const [value, setValue] = useState("");
	const [localError, setLocalError] = useState("");
	const [cooldownRemaining, setCooldownRemaining] = useState(0);
	const prevLoading = useRef(isLoading);
	const cooldownStartRef = useRef(0);
	
	// Start cooldown when an audit just finished
	useEffect(() => {
		if (prevLoading.current && !isLoading && cooldownSeconds > 0) {
			cooldownStartRef.current = Date.now();
			setCooldownRemaining(cooldownSeconds);
		}
		prevLoading.current = isLoading;
	}, [isLoading, cooldownSeconds]);
	
	// Tick the cooldown via rAF; only this component re-renders
	useEffect(() => {
		if (cooldownRemaining <= 0) return;
		let frame = 0;
		const tick = () => {
			const elapsed = Math.floor((Date.now() - cooldownStartRef.current) / 1000);
			const remaining = Math.max(0, cooldownSeconds - elapsed);
			setCooldownRemaining(remaining);
			if (remaining > 0) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [cooldownRemaining > 0, cooldownSeconds]);

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
		? ""
		: cooldownRemaining > 0
			? `Wait ${cooldownRemaining}s`
			: "Audit";
	
	return (
		<form onSubmit={ handleSubmit } noValidate>
			<div className="flex flex-col gap-2 sm:flex-row">
				<button
					type="submit"
					className="inline-flex min-w-20 items-center justify-center gap-2 rounded-lg bg-brand-accent px-5 py-2 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-accent-dark focus:outline-none focus:ring-2 focus:ring-brand-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={ disabled }
				>
					{ isLoading && <Spinner/> }
					{ buttonLabel }
				</button>
				<input
					ref={ inputRef }
					type="text"
					className="flex-1 rounded-lg border border-brand-border-strong bg-brand-input px-3 py-2 text-sm text-brand-headline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 disabled:bg-brand-input-disabled disabled:text-brand-muted"
					placeholder="w3schools.com"
					autoComplete="off"
					value={ value }
					onChange={ (e) => handleChange(e.target.value) }
					disabled={ disabled }
				/>
			</div>
			<p className="mt-0.5 text-xs ml-[94px] text-brand-accent">
				Successful audits completed: <strong>{auditCount}</strong>
				{ durationMs !== null && !isLoading && (
					<span className="ml-2 text-brand-success">
						Audit completed in: <strong>{ (durationMs / 1000).toFixed(1) } seconds</strong>
					</span>
				) }
			</p>
			{ localError && (
				<p className="mt-1 text-xs text-brand-danger">
					{ localError }
				</p>
			) }
		</form>
	);
});
