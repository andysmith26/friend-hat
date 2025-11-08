<script lang="ts">
	/**
	 * StudentCard: Draggable card representing a single student.
	 *
	 * This component is "dumb"—it doesn't fetch data or manage state.
	 * It receives all data via props and emits events for parent to handle.
	 * This makes it easy to test, reuse, and reason about.
	 */

	import { draggable } from '@thisux/sveltednd';
	import type { Student } from '$lib/types';

	interface Props {
		student: Student;
		isSelected: boolean;
		isDragging: boolean;
	}

	let { student, isSelected = false, isDragging = false }: Props = $props();

	// Derive display values
	const displayName = $derived(`${student.firstName} ${student.lastName}`.trim());
	const friendCount = $derived(student.friendIds.length);
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
	use:draggable={{ id: student.id, data: { id: student.id } }}
	role="button"
	tabindex="0"
	aria-label={`${displayName}, ${friendCount} friends`}
>
	<!-- Line 1: Name and ID -->
	<div class="card-header">
		<span class="student-name">{displayName}</span>
		<span class="student-id">· {student.id}</span>
	</div>

	<!-- Line 2: Friend count chip -->
	<div class="card-chips">
		<span class="chip" title="{friendCount} friends">
			👥 {friendCount}
			{friendCount === 1 ? 'friend' : 'friends'}
		</span>
	</div>
</div>

<style>
	.student-card {
		background: white;
		border: 2px solid transparent;
		border-radius: 6px;
		padding: 8px 12px;
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

	.card-header {
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin-bottom: 4px;
	}

	.student-name {
		font-weight: 500;
		font-size: 14px;
		color: #111827;
	}

	.student-id {
		font-size: 12px;
		color: #9ca3af;
	}

	.card-chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
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
</style>
