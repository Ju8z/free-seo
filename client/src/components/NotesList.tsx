import { memo } from "react";

export default memo(function NotesList({
	notes,
}: {
	notes: string[];
}) {
	if (notes.length === 0) return null;
	
	return (
		<div className="rounded-lg border border-brand-warning/25 bg-brand-warning-soft p-4 text-sm text-brand-warning">
			{ notes.map((note, i) => (
				<p key={ i }>{ note }</p>
			)) }
		</div>
	);
});
