import { memo } from "react";
import CodeBlock from "./CodeBlock";
import PromptBlock from "./PromptBlock";

export interface FixCardProps {
  title: string;
  explanation?: string;
  recommendation?: string;
  codeExample?: string;
  promptToFix?: string;
}

export default memo( function FixCard( {
  title,
  explanation,
  recommendation,
  codeExample,
  promptToFix,
}: FixCardProps ) {
  const hasFixContent = Boolean( codeExample || promptToFix );

  return (
    <article className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
      <header className="px-4 py-3 bg-brand-card-header border-b border-brand-border">
        <h4 className="font-semibold text-brand-headline text-sm leading-snug">
          {title}
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
