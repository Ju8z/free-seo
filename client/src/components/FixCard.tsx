import { memo } from "react";
import CodeBlock from "./CodeBlock";
import PromptBlock from "./PromptBlock";
import StatusIcon from "./StatusIcon";
import type { BaseCheckStatus } from "../../../shared/types";

export interface FixCardProps {
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

export default memo( function FixCard( {
  title,
	status,
  explanation,
  recommendation,
  codeExample,
  promptToFix,
}: FixCardProps ) {
  const hasFixContent = Boolean( codeExample || promptToFix );
	const headerClass = status
		? headerClasses[status]
		: "bg-brand-card-header border-brand-border text-brand-headline";

  return (
    <article className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
	    <header className={ `px-4 py-3 border-b ${ headerClass }` }>
		    <h4 className="flex items-center gap-2 font-semibold text-sm leading-snug">
			    { status && <StatusIcon status={ status } className="h-4 w-4 shrink-0"/> }
			    <span>{ title }</span>
        </h4>
      </header>
      <div>
        <section className={hasFixContent ? "border-b border-brand-border px-4 py-3" : "px-4 py-3"}>
          <p className="text-xs font-medium text-brand-muted mb-1.5">Explanation</p>
          <p className="text-sm text-brand-headline leading-relaxed">
            {explanation}
          </p>
          <br />
          <p className="text-xs font-medium text-brand-muted mb-1.5">Recommendation</p>
          <p className="text-sm text-brand-headline leading-relaxed">
            {recommendation}
          </p>
        </section>
        {hasFixContent && (
          <section className="space-y-3 px-4 py-3">
            {codeExample && <CodeBlock code={codeExample} />}
            {promptToFix && <PromptBlock prompt={promptToFix} />}
          </section>
        )}
      </div>
    </article>
  );
} );
