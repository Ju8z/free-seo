import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAudit } from "./hooks/useAudit";
import useTheme from "./hooks/useTheme";
import AuditForm from "./components/AuditForm";
import LoadingBanner from "./components/LoadingBanner";
import EmptyState from "./components/EmptyState";
import ThemeToggle from "./components/ThemeToggle";
import Footer from "./components/Footer";
import { fetchAuditConfig, subscribeToAuditCount } from "./api/audit";
import { type AuditCategoryId, auditCategoryIds } from "../../shared/types";

const ResultsView = lazy( () => import( "./components/ResultsView" ) );
const ErrorBanner = lazy( () => import( "./components/ErrorBanner" ) );

function CheckIcon() {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
			className="size-3"
		>
			<path
				fillRule="evenodd"
				d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

export default function App() {
	const { audit, error, isLoading, durationMs, runAudit, clearError } = useAudit();
	const { theme, setTheme } = useTheme();
	const inputRef = useRef<HTMLInputElement | null>( null );
	const [ auditCount, setAuditCount ] = useState( 0 );
	const [ cooldownSeconds, setCooldownSeconds ] = useState( 0 );
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<AuditCategoryId>>(
		() => new Set(auditCategoryIds),
	);

	useEffect( () => {
		fetchAuditConfig().then( ( config ) => {
			setAuditCount( config.count );
			setCooldownSeconds( config.cooldownSeconds );
		} );
		return subscribeToAuditCount(setAuditCount);
	}, [] );

	const handleSubmit = useCallback( async ( input: string ) => {
		clearError();
		await runAudit(input, [...selectedCategoryIds]);
	}, [clearError, runAudit, selectedCategoryIds]);
	
	const handleToggleCategory = useCallback((id: AuditCategoryId) => {
		setSelectedCategoryIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);
	
	const handleSelectAllCategories = useCallback(() => {
		setSelectedCategoryIds(new Set(auditCategoryIds));
	}, []);
	
	const handleClearCategories = useCallback(() => {
		setSelectedCategoryIds(new Set());
	}, []);

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
					<div className="space-y-4">
						{/* Logo (left) + badges & description (right) */ }
						<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-stretch">
							<h1 className="flex shrink-0 items-center leading-none">
								<img
									src="/logo.webp"
									alt="Free SEO"
									width={ 970 }
									height={ 350 }
									fetchPriority="high"
									decoding="async"
									className="h-auto w-52 max-w-full sm:h-full sm:max-h-24 sm:w-auto"
								/>
							</h1>
							<div className="flex flex-1 flex-col justify-center gap-2 min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<span
										className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2.5 py-1 text-sm font-medium text-brand-success">
										<CheckIcon/>
										No cookies
									</span>
									<span
										className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2.5 py-1 text-sm font-medium text-brand-success">
										<CheckIcon/>
										No tracking
									</span>
									<span
										className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2.5 py-1 text-sm font-medium text-brand-success">
										<CheckIcon/>
										GDPR
									</span>
									<span
										className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2.5 py-1 text-sm font-medium text-brand-success">
										<CheckIcon/>
										CCPA
									</span>
									<span
										className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2.5 py-1 text-sm font-medium text-brand-success">
										<CheckIcon/>
										PECR
									</span>
									<span
										className="inline-flex items-center gap-1 rounded-md bg-brand-success/10 px-2.5 py-1 text-sm font-medium text-brand-success">
										<CheckIcon/>
										Open-Source
									</span>
								</div>
								<p className="text-sm leading-relaxed text-brand-muted">
									Run a <strong className="text-brand-headline">free, privacy-first SEO audit</strong> on any URL.
									Instant on-page SEO insights - meta tags, headings, canonical, hreflang,
									robots, structured data, image alt, and Core Web Vitals signals.
									No signup. No cookies. No tracking.
								</p>
							</div>
						</div>

						{/* Audit Form and Theme Toggle Row */ }
						<div className="flex flex-col items-start gap-3 sm:flex-row">
							<div className="w-full sm:flex-1">
								<AuditForm
									onSubmit={ handleSubmit }
									isLoading={ isLoading }
									inputRef={ inputRef }
									auditCount={ auditCount }
									cooldownSeconds={ cooldownSeconds }
									durationMs={ durationMs }
									canSubmit={ selectedCategoryIds.size > 0 }
								/>
							</div>
							<ThemeToggle theme={ theme } setTheme={ setTheme }/>
						</div>
					</div>
				</header>
				<section aria-label="Audit results">
					{isLoading && <LoadingBanner />}
					{ !isLoading && !audit && !error && (
						<EmptyState
							selectedCategoryIds={ selectedCategoryIds }
							onToggleCategory={ handleToggleCategory }
							onSelectAll={ handleSelectAllCategories }
							onClearSelection={ handleClearCategories }
						/>
					) }
					{audit && !isLoading && (
						<Suspense fallback={<LoadingBanner />}>
							<ResultsView audit={audit} />
						</Suspense>
					)}
				</section>
				<Footer/>
			</div>
			{error && (
				<Suspense fallback={null}>
					<ErrorBanner message={error} onClose={handleErrorClose} />
				</Suspense>
			)}
		</main>
	);
}
