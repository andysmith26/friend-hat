<script lang="ts">
	/**
	 * Inspector: Right-side panel for displaying selected student details.
	 *
	 * Phase 1 scope:
	 * - Show/hide based on selectedStudentId prop
	 * - Collapse/expand toggle (state managed internally)
	 * - Only renders Overview tab (tabs deferred to phase 2)
	 *
	 * Future expansion:
	 * - Multiple tabs (Preferences, History, Notes, Flags)
	 * - Pin toggle (prevents auto-switch during multi-select)
	 * - Keyboard shortcut (I key) for collapse toggle
	 */

	import InspectorOverview from './InspectorOverview.svelte';

	console.log('🟣 Inspector component mounted');

	$effect(() => {
		console.log('🟣 Inspector selectedStudentId changed to:', selectedStudentId);
		console.log('🟣 Inspector isVisible:', isVisible);
	});

	interface Props {
		selectedStudentId: string | null;
	}

	let { selectedStudentId }: Props = $props();

	// Collapse state is internal—parent doesn't need to know about it
	let isCollapsed = $state(false);

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	// Derive whether to show the panel at all
	const isVisible = $derived(selectedStudentId !== null);
</script>

{#if isVisible}
	<aside class="inspector" class:collapsed={isCollapsed} aria-label="Student inspector panel">
		<div class="inspector-header">
			<h2 class="inspector-title">Student Info</h2>
			<div class="inspector-actions">
				<button
					type="button"
					class="btn-icon"
					onclick={toggleCollapse}
					aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
					title={isCollapsed ? 'Expand' : 'Collapse'}
				>
					{#if isCollapsed}
						<!-- Icon: chevron-left (expand) -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="15 18 9 12 15 6"></polyline>
						</svg>
					{:else}
						<!-- Icon: chevron-right (collapse) -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="9 18 15 12 9 6"></polyline>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		{#if !isCollapsed}
			<div class="inspector-content">
				{#if selectedStudentId}
					<InspectorOverview studentId={selectedStudentId} />
				{:else}
					<!-- Shouldn't reach here (isVisible guards it) but defensive -->
					<div class="empty-state">No student selected</div>
				{/if}
			</div>
		{/if}
	</aside>
{/if}

<style>
	.inspector {
		position: fixed;
		top: 0;
		right: 0;
		height: 100vh;
		width: 360px;
		background: white;
		border-left: 1px solid #e5e7eb;
		box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		z-index: 40;
		transition: transform 0.2s ease;
	}

	.inspector.collapsed {
		transform: translateX(calc(100% - 48px));
	}

	.inspector.collapsed .inspector-header {
		border-bottom: none;
	}

	.inspector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.inspector-title {
		font-size: 18px;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.inspector-actions {
		display: flex;
		gap: 8px;
	}

	.btn-icon {
		background: transparent;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: #6b7280;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.btn-icon:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.inspector-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #9ca3af;
		font-size: 14px;
		font-style: italic;
	}
</style>
