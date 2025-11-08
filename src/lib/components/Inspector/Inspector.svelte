<script lang="ts">
	import { tick } from 'svelte';
	import InspectorOverview from './InspectorOverview.svelte';

	interface Props {
		selectedStudentId: string | null;
	}

	let { selectedStudentId }: Props = $props();

	const contentId = 'inspector-panel-content';

	let isOpen = $state(selectedStudentId !== null);
	let previousSelectedId: string | null = null;

	let hideButton: HTMLButtonElement | null = null;
	let reopenButton: HTMLButtonElement | null = null;
	let titleEl: HTMLHeadingElement | null = null;

	const hasSelection = $derived(Boolean(selectedStudentId));

	async function hideInspector() {
		if (!isOpen) return;
		isOpen = false;
		await tick();
		reopenButton?.focus();
	}

	async function showInspector() {
		if (isOpen) return;
		isOpen = true;
		await tick();
		(titleEl ?? hideButton)?.focus();
	}

	$effect(() => {
		if (selectedStudentId && selectedStudentId !== previousSelectedId) {
			isOpen = true;
		}

		previousSelectedId = selectedStudentId;
	});
</script>

<aside
	class="inspector"
	data-open={isOpen}
	aria-label="Student inspector panel"
	aria-hidden={!isOpen}
>
	{#if isOpen}
		<div class="inspector-header">
			<h2 class="inspector-title" id="inspector-title" tabindex="-1" bind:this={titleEl}>
				Student Info
			</h2>

			<div class="inspector-actions">
				<button
					type="button"
					class="inspector-toggle"
					aria-controls={contentId}
					aria-expanded={isOpen}
					on:click={hideInspector}
					title="Hide inspector"
					bind:this={hideButton}
				>
					<span aria-hidden="true">✕</span>
					<span class="sr-only">Hide inspector</span>
				</button>
			</div>
		</div>

		<div class="inspector-content" id={contentId} role="region" aria-labelledby="inspector-title">
			{#if hasSelection && selectedStudentId}
				<InspectorOverview studentId={selectedStudentId} />
			{:else}
				<div class="empty-state" role="status">
					<p class="empty-primary">No student selected</p>
					<p class="empty-secondary">Select a student from the roster to see their details.</p>
				</div>
			{/if}
		</div>
	{/if}
</aside>

{#if !isOpen}
	<button
		type="button"
		class="inspector-handle"
		on:click={showInspector}
		aria-label="Show inspector"
		bind:this={reopenButton}
	>
		<svg
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="15 18 9 12 15 6"></polyline>
			<line x1="9" y1="12" x2="21" y2="12"></line>
		</svg>
		<span class="handle-text">Show inspector</span>
	</button>
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
		transition:
			transform 0.25s ease,
			box-shadow 0.25s ease;
	}

	.inspector[data-open='false'] {
		transform: translateX(100%);
		box-shadow: none;
		pointer-events: none;
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

	.inspector-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: transparent;
		border: 1px solid transparent;
		color: #6b7280;
		border-radius: 6px;
		padding: 6px;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.inspector-toggle:hover,
	.inspector-toggle:focus-visible {
		background: #e5e7eb;
		color: #111827;
		border-color: #d1d5db;
		outline: none;
	}

	.inspector-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 4px;
		height: 100%;
		color: #374151;
	}

	.empty-primary {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.empty-secondary {
		margin: 0;
		font-size: 14px;
		color: #6b7280;
	}

	.inspector-handle {
		position: fixed;
		top: 50%;
		right: 0;
		transform: translateY(-50%);
		background: #111827;
		color: white;
		border: none;
		border-top-left-radius: 999px;
		border-bottom-left-radius: 999px;
		padding: 12px 16px;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.2);
		z-index: 45;
		font-size: 14px;
		font-weight: 600;
	}

	.inspector-handle:hover,
	.inspector-handle:focus-visible {
		background: #1f2937;
		outline: none;
	}

	.handle-text {
		white-space: nowrap;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
