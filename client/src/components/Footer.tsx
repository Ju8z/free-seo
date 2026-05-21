import { memo } from "react";
import { releaseVersion } from "../version";

export default memo(function Footer() {
	return (
		<footer className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-panel">
			<div className="grid gap-8 md:grid-cols-2">
				{/* About Section */ }
				<div>
					<h3 className="mb-3 text-lg font-bold text-brand-headline">
						Free SEO Check
					</h3>
					<p className="text-sm leading-relaxed text-brand-muted">
						Comprehensive SEO audit covering on-page optimization, indexing, technical signals, GEO (AI crawler readiness), and social presence. Get
						a scored report with actionable recommendations instantly.
					</p>
					<p className="mt-3 text-xs text-brand-muted">
						Privacy-first: No cookies, no tracking, fully GDPR/CCPA/PECR compliant.
					</p>
				</div>
				
				{/* Links Section */ }
				<div className="grid gap-8 sm:grid-cols-2">
					<div>
						<h4 className="mb-3 text-sm font-semibold text-brand-headline">
							Resources
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<a
									href="https://github.com/Ju8z/free-seo"
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-muted transition hover:text-brand-accent"
								>
									GitHub Repository
								</a>
							</li>
							<li>
								<a
									href="https://github.com/Ju8z/free-seo#readme"
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-muted transition hover:text-brand-accent"
								>
									Documentation
								</a>
							</li>
							<li>
								<a
									href="https://github.com/Ju8z/free-seo/issues"
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-muted transition hover:text-brand-accent"
								>
									Report Issues
								</a>
							</li>
						</ul>
					</div>
					
					<div>
						<h4 className="mb-3 text-sm font-semibold text-brand-headline">
							SEO Categories
						</h4>
						<ul className="space-y-2 text-sm text-brand-muted">
							<li>Metadata & Structure</li>
							<li>Content & Keywords</li>
							<li>Indexing & Crawling</li>
							<li>Technical SEO</li>
							<li>GEO Optimization</li>
							<li>Social Presence</li>
						</ul>
					</div>
				</div>
			</div>
			
			{/* Bottom Bar */ }
			<div className="mt-8 border-t border-brand-border pt-6 text-center">
				<p className="text-xs text-brand-muted">
					© { new Date().getFullYear() } Free SEO. Developed by JuBz v{releaseVersion} Licensed under{ " " }
					<a
						href="https://polyformproject.org/licenses/noncommercial/1.0.0"
						target="_blank"
						rel="noopener noreferrer"
						className="text-brand-accent transition hover:underline"
					>
						Polyform Noncommercial 1.0.0
					</a>
				</p>
				<p className="mt-2 text-xs text-brand-muted">
					Recommendations based on{ " " }
					<a
						href="https://developers.google.com/search/docs"
						target="_blank"
						rel="noopener noreferrer"
						className="text-brand-accent transition hover:underline"
					>
						Google SEO Documentation
					</a>
				</p>
			</div>
		</footer>
	);
});
