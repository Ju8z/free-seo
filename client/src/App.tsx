import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAudit } from "./hooks/useAudit";
import useTheme from "./hooks/useTheme";
import AuditForm from "./components/AuditForm";
import LoadingBanner from "./components/LoadingBanner";
import EmptyState from "./components/EmptyState";
import ThemeToggle from "./components/ThemeToggle";
import { fetchAuditConfig, subscribeToAuditCount } from "./api/audit";

const ResultsView = lazy( () => import( "./components/ResultsView" ) );
const ErrorBanner = lazy( () => import( "./components/ErrorBanner" ) );

function GitHubIcon() {
	return (
		<svg
			viewBox="0 0 640 640"
			aria-hidden="true"
			className="size-4 fill-current"
		>
			<path d="M319.988 7.973C143.293 7.973 0 151.242 0 327.96c0 141.392 91.678 261.298 218.826 303.63 16.004 2.964 21.886-6.957 21.886-15.414 0-7.63-.319-32.835-.449-59.552-89.032 19.359-107.8-37.772-107.8-37.772-14.552-36.993-35.529-46.831-35.529-46.831-29.032-19.879 2.209-19.442 2.209-19.442 32.126 2.245 49.04 32.954 49.04 32.954 28.56 48.922 74.883 34.76 93.131 26.598 2.882-20.681 11.15-34.807 20.315-42.803-71.08-8.067-145.797-35.516-145.797-158.14 0-34.926 12.52-63.485 32.965-85.88-3.33-8.078-14.291-40.606 3.083-84.674 0 0 26.87-8.61 88.029 32.8 25.512-7.075 52.878-10.642 80.056-10.76 27.2.118 54.614 3.673 80.162 10.76 61.076-41.386 87.922-32.8 87.922-32.8 17.398 44.08 6.485 76.631 3.154 84.675 20.516 22.394 32.93 50.953 32.93 85.879 0 122.907-74.883 149.93-146.117 157.856 11.481 9.921 21.733 29.398 21.733 59.233 0 42.792-.366 77.28-.366 87.804 0 8.516 5.764 18.473 21.992 15.354 127.076-42.354 218.637-162.274 218.637-303.582 0-176.695-143.269-319.988-320-319.988l-.023.107z" />
		</svg>
	);
}

export default function App() {
	const { audit, error, isLoading, runAudit, clearError } =
		useAudit();
	const { theme, setTheme } = useTheme();
	const inputRef = useRef<HTMLInputElement | null>( null );
	const [ auditCount, setAuditCount ] = useState( 0 );
	const [ cooldownSeconds, setCooldownSeconds ] = useState( 0 );
	const [ cooldownRemaining, setCooldownRemaining ] = useState( 0 );
	const prevLoading = useRef( isLoading );

	useEffect( () => {
		fetchAuditConfig().then( ( config ) => {
			setAuditCount( config.count );
			setCooldownSeconds( config.cooldownSeconds );
		} );
		const unsubscribe = subscribeToAuditCount( setAuditCount );
		return unsubscribe;
	}, [] );

	const cooldownRef = useRef<number>( 0 );
	const cooldownStartTimeRef = useRef<number>( 0 );

	// Start cooldown countdown after audit completes
	useEffect( () => {
		if ( prevLoading.current && !isLoading && cooldownSeconds > 0 ) {
			cooldownStartTimeRef.current = Date.now();
			setCooldownRemaining( cooldownSeconds );
		}
		prevLoading.current = isLoading;
	}, [ isLoading, cooldownSeconds ] );

	// Optimized countdown using requestAnimationFrame to reduce re-renders
	useEffect( () => {
		if ( cooldownRemaining <= 0 ) return;
		
		const updateCooldown = () => {
			const elapsed = Math.floor((Date.now() - cooldownStartTimeRef.current) / 1000);
			const remaining = Math.max(0, cooldownSeconds - elapsed);
			setCooldownRemaining(remaining);
			
			if (remaining > 0) {
				cooldownRef.current = window.requestAnimationFrame(updateCooldown);
			}
		};
		
		cooldownRef.current = window.requestAnimationFrame(updateCooldown);
		return () => {
			window.cancelAnimationFrame(cooldownRef.current);
			cooldownRef.current = 0;
		};
	}, [ cooldownRemaining > 0, cooldownSeconds ] );

	const handleSubmit = useCallback( async ( input: string ) => {
		clearError();
		await runAudit( input );
	}, [ clearError, runAudit ] );

	const handleErrorClose = useCallback( () => {
		clearError();
		window.requestAnimationFrame( () => {
			inputRef.current?.focus();
		} );
	}, [ clearError ] );

	return (
		<main className="min-h-screen px-5 py-4 text-brand-body">
			<div className="mx-auto max-w-5xl space-y-3">
				<header className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-panel">
					<div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-start">
						<div>
							<h1 className="mb-1 text-4xl font-extrabold text-brand-headline">
								Free SEO Check
							</h1>
							<p className="max-w-md text-sm leading-relaxed text-brand-muted">
								Audit raw HTML, metadata, indexing signals,
								robots.txt, and XML sitemaps from one compact
								report.
								<br />
								No cookies and fully compliant with GDPR, CCPA and PECR.
							</p>
						</div>
						<div>
							<AuditForm
								onSubmit={handleSubmit}
								isLoading={isLoading}
								inputRef={inputRef}
								auditCount={auditCount}
								cooldownRemaining={cooldownRemaining}
							/>
							<div className="flex justify-end">
								<ThemeToggle theme={theme} setTheme={setTheme} />
							</div>
						</div>
					</div>
				</header>
				<section>
					{isLoading && <LoadingBanner />}
					{!isLoading && !audit && !error && <EmptyState />}
					{audit && !isLoading && (
						<Suspense fallback={<LoadingBanner />}>
							<ResultsView audit={audit} />
						</Suspense>
					)}
				</section>
				<div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-brand-muted">
					<a
						href="https://github.com/Ju8z/free-seo"
						target="_blank"
						className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card-header px-3 py-2 font-semibold text-brand-headline transition hover:border-brand-accent hover:text-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-surface"
					>
						<GitHubIcon />
						GitHub
					</a>
				</div>
			</div>
			{error && (
				<Suspense fallback={null}>
					<ErrorBanner message={error} onClose={handleErrorClose} />
				</Suspense>
			)}
		</main>
	);
}
