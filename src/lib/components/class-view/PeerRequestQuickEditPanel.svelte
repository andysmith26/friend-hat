<script lang="ts">
  import { getStudentDisplayName, type Student } from '$lib/domain';
  import type {
    PeerRequestWorkspaceItem,
    StudentPeerRequestWorkspaceSummary
  } from '$lib/application/useCases/getPeerRequestWorkspaceSummary';

  interface Props {
    student: Student;
    studentsById: Record<string, Student>;
    summary: StudentPeerRequestWorkspaceSummary;
    onQuickEditPeerRequest?: (payload: {
      requestId: string;
      studentId: string;
    }) => Promise<void> | void;
    onClearPeerRequest?: (requestId: string) => Promise<void> | void;
    onClose: () => void;
  }

  let {
    student,
    studentsById,
    summary,
    onQuickEditPeerRequest,
    onClearPeerRequest,
    onClose
  }: Props = $props();

  let panelEl = $state<HTMLDivElement | null>(null);
  let ready = $state(false);
  let savingRequestIds = $state<string[]>([]);
  let editingRequestId = $state<string | null>(null);
  let historyRequestId = $state<string | null>(null);

  const availableStudents = $derived.by(() =>
    Object.values(studentsById)
      .filter((candidate) => candidate.id !== student.id)
      .sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)))
  );

  $effect(() => {
    const timer = setTimeout(() => {
      ready = true;
    }, 0);
    return () => {
      clearTimeout(timer);
      ready = false;
    };
  });

  function handleClickOutside(event: MouseEvent) {
    if (ready && panelEl && !panelEl.contains(event.target as Node)) {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  function getAssignmentLabel(item: PeerRequestWorkspaceItem): string {
    return item.resolvedStudentDisplayName ?? 'Needs assignment';
  }

  function getAttentionBadge(item: PeerRequestWorkspaceItem):
    | { label: string; className: string }
    | null {
    if (!item.resolvedStudentId || item.satisfactionStatus === 'UNRESOLVED') {
      return {
        label: 'Needs assignment',
        className: 'bg-amber-100 text-amber-800'
      };
    }

    if (item.satisfactionStatus === 'STALE') {
      return {
        label: 'Missing student',
        className: 'bg-rose-100 text-rose-700'
      };
    }

    if (item.satisfactionStatus === 'UNSATISFIED') {
      return {
        label: 'Different group',
        className: 'bg-orange-100 text-orange-800'
      };
    }

    if (item.satisfactionStatus === 'PENDING') {
      return {
        label: 'Waiting for placement',
        className: 'bg-sky-100 text-sky-700'
      };
    }

    return null;
  }

  function getAuditSnapshotText(item: PeerRequestWorkspaceItem): string {
    if (!item.initialResolvedStudentDisplayName) {
      return 'No initial match has been saved yet.';
    }

    return item.initialResolutionSource === 'AUTO'
      ? `Initially matched to ${item.initialResolvedStudentDisplayName}.`
      : `Initially assigned to ${item.initialResolvedStudentDisplayName}.`;
  }

  function getAuditChangeText(item: PeerRequestWorkspaceItem): string | null {
    if (!item.hasChangedSinceInitial) {
      return null;
    }

    if (item.resolvedStudentDisplayName) {
      return `Current assignment is ${item.resolvedStudentDisplayName}.`;
    }

    return 'The current assignment has been cleared.';
  }

  function toggleEditing(requestId: string) {
    editingRequestId = editingRequestId === requestId ? null : requestId;
  }

  function toggleHistory(requestId: string) {
    historyRequestId = historyRequestId === requestId ? null : requestId;
  }

  async function handleSelectChange(requestId: string, event: Event) {
    const nextStudentId = (event.currentTarget as HTMLSelectElement).value;
    if (!nextStudentId) return;

    savingRequestIds = [...savingRequestIds, requestId];
    try {
      await onQuickEditPeerRequest?.({ requestId, studentId: nextStudentId });
      editingRequestId = null;
    } finally {
      savingRequestIds = savingRequestIds.filter((id) => id !== requestId);
    }
  }

  async function handleClear(requestId: string) {
    savingRequestIds = [...savingRequestIds, requestId];
    try {
      await onClearPeerRequest?.(requestId);
      editingRequestId = null;
    } finally {
      savingRequestIds = savingRequestIds.filter((id) => id !== requestId);
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={panelEl}
  class="absolute right-4 bottom-4 left-4 z-20 rounded-2xl border border-gray-200 bg-white shadow-xl md:left-auto md:w-[30rem]"
  role="dialog"
  aria-label="Peer request details"
  onclick={(event) => event.stopPropagation()}
>
  <div class="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
    <div>
      <h3 class="text-sm font-semibold text-gray-900">Peer requests</h3>
      <p class="text-sm text-gray-600">{getStudentDisplayName(student)}</p>
      <p class="mt-1 text-xs text-gray-500">Review imported requests and adjust assignments.</p>
    </div>
    <button
      type="button"
      onclick={onClose}
      class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      aria-label="Close peer request details"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
  </div>

  <div class="max-h-[min(60vh,32rem)] space-y-3 overflow-y-auto px-4 py-4">
    {#each summary.items as item (item.requestId)}
      {@const isSaving = savingRequestIds.includes(item.requestId)}
      {@const attentionBadge = getAttentionBadge(item)}
      {@const isEditing = editingRequestId === item.requestId}
      {@const isHistoryOpen = historyRequestId === item.requestId}
      <section class="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-semibold tracking-wide text-gray-700 uppercase">
                Rank {item.rank}
              </span>
              {#if attentionBadge}
                <span class={`rounded-full px-2 py-1 text-[11px] font-medium ${attentionBadge.className}`}>
                  {attentionBadge.label}
                </span>
              {/if}
            </div>
            <div class="mt-2 flex min-w-0 items-center gap-2">
              <p class="truncate text-sm font-medium text-gray-900">{item.rawText}</p>
              <span class="text-xs text-gray-400">→</span>
              <p class="truncate text-sm text-gray-700">{getAssignmentLabel(item)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label="Toggle request history"
              onclick={() => toggleHistory(item.requestId)}
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 0 0 1.06-1.06l-2.28-2.22V6.5Z" clip-rule="evenodd"/>
              </svg>
            </button>
            {#if isSaving}
              <span class="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600">
                Saving...
              </span>
            {:else if isEditing}
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onclick={() => toggleEditing(item.requestId)}
              >
                Cancel
              </button>
            {:else}
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onclick={() => toggleEditing(item.requestId)}
              >
                Change
              </button>
            {/if}
          </div>
        </div>

        {#if isEditing}
          <div class="mt-3 flex items-end gap-2 border-t border-gray-200 pt-3">
            <label class="min-w-0 flex-1">
              <span class="mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                Assign to
              </span>
              <select
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none"
                value={item.resolvedStudentId ?? ''}
                disabled={isSaving}
                onchange={(event) => handleSelectChange(item.requestId, event)}
              >
                <option value="">Choose a student...</option>
                {#each availableStudents as candidate (candidate.id)}
                  <option value={candidate.id}>{getStudentDisplayName(candidate)}</option>
                {/each}
              </select>
            </label>

            <button
              type="button"
              onclick={() => handleClear(item.requestId)}
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving || !item.resolvedStudentId}
            >
              Clear
            </button>
          </div>
        {/if}

        {#if isHistoryOpen}
          <div class="mt-3 rounded-lg border border-gray-200 bg-white/90 px-3 py-3 text-xs text-gray-600">
            <p>Imported text: {item.rawText}</p>
            {#if item.auditItems.length > 0}
              <ul class="mt-2 space-y-1">
                {#each item.auditItems as auditItem, index (`${item.requestId}-${auditItem.label}-${index}`)}
                  <li>
                    {auditItem.label}
                    {#if auditItem.resolvedStudentDisplayName}
                      <span class="text-gray-900">{auditItem.resolvedStudentDisplayName}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-1">{getAuditSnapshotText(item)}</p>
            {/if}
            {#if getAuditChangeText(item)}
              <p class="mt-2">{getAuditChangeText(item)}</p>
            {/if}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>
