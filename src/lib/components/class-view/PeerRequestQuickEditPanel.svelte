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
    onAddPeerRequest?: (payload: {
      requesterStudentId: string;
      requestedStudentId: string;
    }) => Promise<void> | void;
    onQuickEditPeerRequest?: (payload: {
      requestId: string;
      studentId: string;
    }) => Promise<void> | void;
    onClearPeerRequest?: (requestId: string) => Promise<void> | void;
    onDeletePeerRequest?: (requestId: string) => Promise<void> | void;
    onClose: () => void;
  }

  let {
    student,
    studentsById,
    summary,
    onAddPeerRequest,
    onQuickEditPeerRequest,
    onClearPeerRequest,
    onDeletePeerRequest,
    onClose
  }: Props = $props();

  let panelEl = $state<HTMLDivElement | null>(null);
  let ready = $state(false);
  let savingRequestIds = $state<string[]>([]);
  let editingRequestId = $state<string | null>(null);
  let historyRequestId = $state<string | null>(null);
  let addRequestStudentId = $state('');
  let isAddingRequest = $state(false);

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

  function formatAuditDateTime(iso?: string): string {
    if (!iso) return 'Time unavailable';

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Time unavailable';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
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

  async function handleAddRequest() {
    if (!addRequestStudentId) return;

    isAddingRequest = true;
    try {
      await onAddPeerRequest?.({
        requesterStudentId: student.id,
        requestedStudentId: addRequestStudentId
      });
      addRequestStudentId = '';
    } finally {
      isAddingRequest = false;
    }
  }

  async function handleDeleteRequest(requestId: string) {
    savingRequestIds = [...savingRequestIds, requestId];
    try {
      await onDeletePeerRequest?.(requestId);
      editingRequestId = null;
      historyRequestId = historyRequestId === requestId ? null : historyRequestId;
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
    <section class="rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="min-w-0 flex-1">
          <span class="mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase">
            Add peer request
          </span>
          <select
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none"
            bind:value={addRequestStudentId}
            disabled={isAddingRequest}
          >
            <option value="">Choose a student...</option>
            {#each availableStudents as candidate (candidate.id)}
              <option value={candidate.id}>{getStudentDisplayName(candidate)}</option>
            {/each}
          </select>
        </label>

        <button
          type="button"
          class="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={handleAddRequest}
          disabled={isAddingRequest || !addRequestStudentId}
        >
          {isAddingRequest ? 'Adding...' : 'Add request'}
        </button>
      </div>
    </section>

    {#if summary.items.length === 0}
      <section class="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600">
        No peer requests yet. Add one above to start tracking them here.
      </section>
    {:else}
      <div class="px-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
        {summary.confirmedRequestCount} confirmed / {summary.satisfiedCount} satisfied
      </div>
    {/if}

    {#each summary.items as item (item.requestId)}
      {@const isSaving = savingRequestIds.includes(item.requestId)}
      {@const isEditing = editingRequestId === item.requestId}
      {@const isHistoryOpen = historyRequestId === item.requestId}
      <section
        class={`rounded-xl border p-3 ${item.satisfactionStatus === 'SATISFIED' ? 'border-green-400 bg-green-50/40' : 'border-gray-200 bg-gray-50/70'}`}
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{getAssignmentLabel(item)}</p>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-lg p-2 text-rose-400 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Delete peer request"
              onclick={() => handleDeleteRequest(item.requestId)}
              disabled={isSaving}
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M8.5 2a1 1 0 0 0-.8.4L7.1 3H4.75a.75.75 0 0 0 0 1.5h.46l.67 9.07A2.5 2.5 0 0 0 8.37 16h3.26a2.5 2.5 0 0 0 2.49-2.43l.67-9.07h.46a.75.75 0 0 0 0-1.5H12.9l-.6-.6a1 1 0 0 0-.8-.4h-3Zm1.25 4.25a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label="Toggle request history"
              onclick={() => toggleHistory(item.requestId)}
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 0 0 1.06-1.06l-2.28-2.22V6.5Z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            {#if isSaving}
              <span
                class="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600"
              >
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
          <div
            class="mt-3 rounded-lg border border-gray-200 bg-white/90 px-3 py-3 text-xs text-gray-600"
          >
            <p>Imported text: {item.rawText}</p>
            {#if item.auditItems.length > 0}
              <ul class="mt-2 space-y-1">
                {#each item.auditItems as auditItem, index (`${item.requestId}-${auditItem.label}-${index}`)}
                  <li class="flex flex-wrap gap-x-2 gap-y-1">
                    <span class="font-medium text-gray-900"
                      >{formatAuditDateTime(auditItem.occurredAt)}</span
                    >
                    <span>{auditItem.label}</span>
                    {#if auditItem.resolvedStudentDisplayName}
                      <span class="text-gray-900">{auditItem.resolvedStudentDisplayName}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-1">No audit history yet.</p>
            {/if}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>
