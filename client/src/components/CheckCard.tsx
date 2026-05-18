import { memo } from "react";
import type { CheckResult } from "../../../shared/types";
import { statusTagClasses } from "../utils/constants";
import CodeBlock from "./CodeBlock";
import PromptBlock from "./PromptBlock";
import ReportCard, { KeyValue, type ReportCardAction } from "./ReportCard";
import StatusBadge from "./StatusBadge";

function getCheckScore(status: CheckResult["status"]): number {
	const multipliers: Record<CheckResult["status"], number> = {
		pass: 1,
		warning: 0.5,
		fail: 0,
		info: 1,
	};
	return Math.round((multipliers[status] ?? 0) * 100);
}

export default memo(function CheckCard({
	check,
}: {
	check: CheckResult;
}) {
	const actions: ReportCardAction[] = [];

	if (check.status !== "pass" && (check.codeExample || check.aiPrompt)) {
		actions.push({
			label: "How to fix",
			content: (
				<div className="space-y-4">
					{check.codeExample && (
						<div>
							<CodeBlock code={check.codeExample} />
						</div>
					)}
					{check.aiPrompt && (
						<div>
							<PromptBlock prompt={check.aiPrompt} />
						</div>
					)}
				</div>
			),
		});
	}

	return (
		<ReportCard
			title={check.label}
			badge={
				check.status === "pass"
					? undefined
					: <StatusBadge
						status={check.status}
						classMap={statusTagClasses}
						className="gap-1.5 px-2.5 py-0.5"
					>
						{check.status} ({getCheckScore(check.status)})
					</StatusBadge>
			}
			summary={check.category}
			actions={actions}
		>
			<KeyValue label="Explanation" value={check.summary} />
			{check.recommendation && (
				<KeyValue label="Recommendation" value={check.recommendation} />
			)}
			<KeyValue label="Found" value={check.explanation} />
		</ReportCard>
	);
});
