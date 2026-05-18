export function formatStatusLabel(status: string): string {
	return status.replace("_", " ");
}

export function formatCompactNumber(value: number | null | undefined): string {
	if (value === null || value === undefined) return "—";
	if (value >= 1_000_000) {
		return `${ (value / 1_000_000).toFixed(1) }M`;
	}
	if (value >= 1_000) {
		return `${ (value / 1_000).toFixed(1) }K`;
	}
	return value.toLocaleString();
}
