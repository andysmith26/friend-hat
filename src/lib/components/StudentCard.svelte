<script lang="ts">
	/**
	 * StudentCard: Draggable card representing a single student.
	 *
	 * This component is "dumb"—it doesn't fetch data or manage state.
	 * It receives all data via props and emits events for parent to handle.
	 * This makes it easy to test, reuse, and reason about.
	 */

	import { draggable } from '$lib/utils/pragmatic-dnd';
	import type { Student } from '$lib/types';

	interface Props {
		student: Student;
		isSelected: boolean;
		isDragging: boolean;
		container?: string;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		onClick?: () => void;
	}

	let {
		student,
		isSelected = false,
		isDragging = false,
		container,
		onDragStart,
		onDragEnd,
		onClick
	}: Props = $props();

	// Derive display values
	const displayName = $derived(`${student.firstName} ${student.lastName}`.trim());
	const friendCount = $derived(student.friendIds.length);

	// Gender badge configuration
	const genderBadge = $derived.by(() => {
		const g = student.gender.toUpperCase();
		if (g === 'F') return { label: 'F', class: 'gender-badge-f' };
		if (g === 'M') return { label: 'M', class: 'gender-badge-m' };
		if (g === 'N') return { label: 'N', class: 'gender-badge-x' };
		return null; // Empty/unknown = no badge
	});
</script>

<!--
	Note on interaction:
	We're NOT adding onclick here because @thisux/sveltednd captures mousedown
	for dragging. Adding onclick would conflict (we'd need to distinguish between
	click and drag-start, which the library doesn't expose).
	
	The parent component will set isSelected based on drag state
	(selectedStudentId = currentlyDragging), so selection happens automatically
	when you start dragging. No separate click handler needed for phase 1.
-->

<div
	class="student-card"
	class:selected={isSelected}
	class:dragging={isDragging}
	use:draggable={{
		dragData: { id: student.id },
		container,
		callbacks: {
			onDragStart,
			onDragEnd
		}
	}}
	on:click={() => onClick?.()}
	role="button"
	tabindex="0"
	aria-label={`${displayName}, ${friendCount} friends`}
>
	<!-- Single line: Name, ID, Gender, and Friend count -->
	<div class="card-content">
		<span class="student-name">{displayName}</span>
		<span class="student-id">· {student.id}</span>
		{#if genderBadge}
			<span class="chip {genderBadge.class}" title="Gender: {student.gender}">
				{genderBadge.label}
			</span>
		{/if}
		<span class="chip" title="{friendCount} friends">
			👥 {friendCount}
		</span>
	</div>
</div>

<style>
	.student-card {
		background: white;
		border: 2px solid transparent;
		border-radius: 6px;
		padding: 6px 10px;
		cursor: grab;
		user-select: none;
		transition: all 0.15s ease;
	}

	.student-card:hover {
		background: #f9fafb;
		border-color: #e5e7eb;
	}

	.student-card:active {
		cursor: grabbing;
	}

	/* Selected state: outline indicates this student's info is in Inspector */
	.student-card.selected {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	/* Dragging state: elevated shadow, slightly transparent */
	.student-card.dragging {
		opacity: 0.6;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		transform: rotate(2deg);
	}

	.card-content {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: nowrap;
		overflow: hidden;
	}

	.student-name {
		font-weight: 500;
		font-size: 14px;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
		min-width: 0;
	}

	.student-id {
		font-size: 11px;
		color: #9ca3af;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.chip {
		display: inline-block;
		background: #f3f4f6;
		color: #4b5563;
		font-size: 12px;
		padding: 2px 8px;
		border-radius: 4px;
		white-space: nowrap;
	}

	/* Gender badge variants */
	.gender-badge-f {
		background: #f3e8ff;
		color: #7c3aed;
		border: 1px solid #d8b4fe;
	}

	.gender-badge-m {
		background: #ccfbf1;
		color: #0f766e;
		border: 1px solid #5eead4;
	}

	.gender-badge-x {
		background: #fef3c7;
		color: #b45309;
		border: 1px solid #fcd34d;
	}
</style>
