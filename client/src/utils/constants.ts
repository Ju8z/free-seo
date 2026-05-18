import type { CheckStatus, BaseCheckStatus, SeoCategoryStatus, } from "../../../shared/types";

export const statusTagClasses: Record<CheckStatus, string> = {
	pass: "bg-brand-success-soft text-brand-success",
	warning: "bg-brand-warning-soft text-brand-warning",
	fail: "bg-brand-danger-soft text-brand-danger",
	info: "bg-brand-accent-soft text-brand-accent-dark",
};

export const categoryStatusClasses: Record<SeoCategoryStatus, string> = {
	excellent: "bg-brand-success-soft text-brand-success",
	good: "bg-brand-accent-soft text-brand-accent-dark",
	needs_improvement: "bg-brand-warning-soft text-brand-warning",
	poor: "bg-brand-danger-soft text-brand-danger",
};

export const categoryCheckStatusClasses: Record<BaseCheckStatus | "not_applicable" | "unavailable", string> = {
	pass: "bg-brand-success-soft text-brand-success",
	warning: "bg-brand-warning-soft text-brand-warning",
	fail: "bg-brand-danger-soft text-brand-danger",
	not_applicable: "bg-brand-neutral-soft text-brand-muted",
	unavailable: "bg-brand-neutral-soft text-brand-muted",
};
