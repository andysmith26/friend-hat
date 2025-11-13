<script lang="ts">
	/**
	 * UnassignedList: Droppable roster for students not yet placed in groups.
	 *
	 * Structurally similar to GroupColumn but styled differently:
	 * - No capacity limit (unassigned can hold any number)
	 * - Different visual treatment (roster/list feel vs. group container)
	 * - Header says "Unassigned" not a group name
	 */

	import { droppable, type DropState } from '$lib/utils/pragmatic-dnd';
	import { getAppDataContext } from '$lib/contexts/appData';
	import StudentCard from './StudentCard.svelte';

	console.log('🔴 UnassignedList mounting');

	try {
		const contextCheck = getAppDataContext();
		console.log('✅ UnassignedList got context:', {
			hasStudentsById: !!contextCheck.studentsById,
			studentCount: Object.keys(contextCheck.studentsById || {}).length
		});
	} catch (e) {
		console.error('❌ UnassignedList context error:', e);
	}

	const { studentsById } = getAppDataContext();
	console.log('🟢 UnassignedList studentsById keys:', Object.keys(studentsById).slice(0, 5));
	interface Props {
		studentIds: string[];
		selectedStudentId: string | null;
		currentlyDragging: string | null;
		onDrop: (state: DropState) => void;
		onDragStart?: (studentId: string) => void;
		onClick?: (studentId: string) => void;
	}

	let { studentIds, selectedStudentId, currentlyDragging, onDrop, onDragStart, onClick }: Props =
		$props();
</script>

<div class="unassigned-list">
	<div class="unassigned-header">
		<h3 class="unassigned-title">Unassigned</h3>
		<span class="count">{studentIds.length}</span>
	</div>

	<div
		class="unassigned-members"
		use:droppable={{ container: 'unassigned', callbacks: { onDrop } }}
	>
		{#each studentIds as studentId (studentId)}
			{@const student = studentsById[studentId]}
			{#if student}
				<StudentCard
					{student}
					isSelected={selectedStudentId === studentId}
					isDragging={currentlyDragging === studentId}
					container="unassigned"
					onDragStart={() => onDragStart?.(studentId)}
					onClick={() => onClick?.(studentId)}
				/>
			{:else}
				<div class="error-card">
					Unknown student: {studentId}
				</div>
			{/if}
		{/each}

		{#if studentIds.length === 0}
			<div class="empty-state">All students assigned ✓</div>
		{/if}
	</div>
</div>

<style>
	.unassigned-list {
		background: white;
		border: 2px dashed #d1d5db;
		border-radius: 8px;
		padding: 12px;
		min-height: 200px;
	}

	.unassigned-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 2px dashed #e5e7eb;
		min-height: 40px;
		gap: 8px;
	}

	.unassigned-title {
		font-size: 16px;
		font-weight: 600;
		color: #6b7280;
		margin: 0;
		padding: 4px 6px;
		line-height: 1.5;
	}

	.count {
		font-size: 13px;
		color: #9ca3af;
		font-weight: 500;
	}

	.unassigned-members {
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
		color: #10b981;
		font-size: 14px;
		font-weight: 500;
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
