import { memo, useEffect, useState } from "react";
import CodeBlock from "./CodeBlock";
import PromptBlock from "./PromptBlock";
import StatusIcon from "./StatusIcon";
import type { BaseCheckStatus } from "../../../shared/types";

export interface FixCardProps {
	id?: string;
  title: string;
	status?: BaseCheckStatus;
  explanation?: string;
  recommendation?: string;
  codeExample?: string;
  promptToFix?: string;
}

const headerClasses: Record<BaseCheckStatus, string> = {
	pass: "bg-brand-success-soft border-brand-success/30 text-brand-success",
	warning: "bg-brand-warning-soft border-brand-warning/30 text-brand-warning",
	fail: "bg-brand-danger-soft border-brand-danger/30 text-brand-danger",
};

function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ `h-4 w-4 text-brand-muted transition-transform duration-200 shrink-0 ${
				isExpanded ? "rotate-180" : ""
			}` }
			aria-hidden="true"
		>
			<polyline points="6 9 12 15 18 9"/>
		</svg>
	);
}

export default memo( function FixCard( {
	id,
  title,
	status,
  explanation,
  recommendation,
  codeExample,
  promptToFix,
}: FixCardProps ) {
	const [isExpanded, setIsExpanded] = useState(false);
  const hasFixContent = Boolean( codeExample || promptToFix );
	const headerClass = status
		? headerClasses[status]
		: "bg-brand-card-header border-brand-border text-brand-headline";
	
	useEffect(() => {
		if (!id) return;
		const handleExpand = (e: Event) => {
			const customEvent = e as CustomEvent<{ checkId: string }>;
			if (customEvent.detail && customEvent.detail.checkId === id) {
				setIsExpanded(true);
			}
		};
		window.addEventListener("expand-fix-card", handleExpand);
		return () => {
			window.removeEventListener("expand-fix-card", handleExpand);
		};
	}, [id]);

  return (
	  <article data-fix-card-id={ id } className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
		  <button
			  type="button"
			  onClick={ () => setIsExpanded(!isExpanded) }
			  className={ `w-full appearance-none bg-transparent border-0 px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-opacity hover:opacity-90 ${ isExpanded ? "border-b" : "" } ${ headerClass }` }
			  aria-expanded={ isExpanded }
		  >
			  <h4 className="flex items-center gap-2 font-semibold text-sm leading-snug pr-4">
			    { status && <StatusIcon status={ status } className="h-4 w-4 shrink-0"/> }
			    <span>{ title }</span>
        </h4>
			  <ChevronIcon isExpanded={ isExpanded }/>
      </button>
		  { isExpanded && (
			  <div>
				  <section className={ hasFixContent ? "border-b border-brand-border px-4 py-3" : "px-4 py-3" }>
					  <p className="text-xs font-medium text-brand-muted mb-1.5">Explanation</p>
					  <p className="text-sm text-brand-headline leading-relaxed">
						  { explanation }
					  </p>
					  <br/>
					  <p className="text-xs font-medium text-brand-muted mb-1.5">Recommendation</p>
					  <p className="text-sm text-brand-headline leading-relaxed">
						  { recommendation }
					  </p>
				  </section>
				  { hasFixContent && (
					  <section className="space-y-3 px-4 py-3">
						  { codeExample && <CodeBlock code={ codeExample }/> }
						  { promptToFix && <PromptBlock prompt={ promptToFix }/> }
					  </section>
				  ) }
			  </div>
		  ) }
    </article>
  );
} );
