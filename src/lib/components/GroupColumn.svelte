<script lang="ts">
	/**
	 * GroupColumn: Droppable container for a single group.
	 *
	 * Responsibilities:
	 * - Display group name and capacity
	 * - Render StudentCards for members
	 * - Handle drop events via callback
	 *
	 * Data access pattern:
	 * - Uses context to get studentsById (avoiding prop drilling)
	 * - Receives group and UI state via props (explicit flow for reactive data)
	 */

	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import type { Group } from '$lib/types';
	import { getAppDataContext } from '$lib/contexts/appData';
	import StudentCard from './StudentCard.svelte';

	interface Props {
		group: Group;
		selectedStudentId: string | null;
		currentlyDragging: string | null;
		onDrop: (state: DragDropState) => void;
	}

	let { group, selectedStudentId, currentlyDragging, onDrop }: Props = $props();

	console.log('🔴 GroupColumn mounting');

	try {
		const contextCheck = getAppDataContext();
		console.log('✅ GroupColumn got context:', {
			hasStudentsById: !!contextCheck.studentsById,
			studentCount: Object.keys(contextCheck.studentsById || {}).length
		});
	} catch (e) {
		console.error('❌ GroupColumn context error:', e);
	}

	const { studentsById } = getAppDataContext();
	console.log('🟢 GroupColumn studentsById keys:', Object.keys(studentsById).slice(0, 5));

	// Compute capacity display
	const currentCount = $derived(group.memberIds.length);
	const capacityText = $derived(
		group.capacity === null ? `${currentCount} students` : `${currentCount} / ${group.capacity}`
	);
	const isFull = $derived(group.capacity !== null && currentCount >= group.capacity);
</script>

<div class="group-column">
	<div class="group-header">
		<h3 class="group-name">{group.name}</h3>
		<span class="capacity" class:full={isFull}>
			{capacityText}
		</span>
	</div>

	<div class="group-members" use:droppable={{ id: group.id, onDrop }}>
		{#each group.memberIds as studentId (studentId)}
			{@const student = studentsById[studentId]}
			{#if student}
				<StudentCard
					{student}
					isSelected={selectedStudentId === studentId}
					isDragging={currentlyDragging === studentId}
				/>
			{:else}
				<!-- Defensive: If student ID in group doesn't exist, show error card -->
				<div class="error-card">
					Unknown student: {studentId}
				</div>
			{/if}
		{/each}

		{#if group.memberIds.length === 0}
			<div class="empty-state">Drop students here</div>
		{/if}
	</div>
</div>

<style>
	.group-column {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 12px;
		min-height: 200px;
		display: flex;
		flex-direction: column;
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid #e5e7eb;
	}

	.group-name {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.capacity {
		font-size: 13px;
		color: #6b7280;
		font-weight: 500;
	}

	.capacity.full {
		color: #dc2626;
		font-weight: 600;
	}

	.group-members {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: 100px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100px;
		color: #9ca3af;
		font-size: 14px;
		font-style: italic;
	}

	.error-card {
		background: #fee2e2;
		border: 1px solid #fca5a5;
		border-radius: 4px;
		padding: 8px 12px;
		color: #991b1b;
		font-size: 13px;
	}
</style>
