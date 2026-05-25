<script lang="ts">
  import { getStudentDisplayName, type Student } from '$lib/domain';
  import type { StudentPeerRequestWorkspaceSummary } from '$lib/application/useCases/getPeerRequestWorkspaceSummary';

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

  function formatStatus(status: string): string {
    return status.toLowerCase().replace(/_/g, ' ');
  }

  function statusClass(status: string): string {
    if (status === 'SATISFIED') return 'bg-green-100 text-green-700';
    if (status === 'UNSATISFIED') return 'bg-amber-100 text-amber-800';
    if (status === 'STALE') return 'bg-rose-100 text-rose-700';
    if (status === 'PENDING') return 'bg-sky-100 text-sky-700';
    if (status === 'MANUALLY_SET') return 'bg-teal-100 text-teal-700';
    if (status === 'CONFIRMED') return 'bg-emerald-100 text-emerald-700';
    return 'bg-gray-100 text-gray-700';
  }

  async function handleSelectChange(requestId: string, event: Event) {
    const nextStudentId = (event.currentTarget as HTMLSelectElement).value;
    if (!nextStudentId) return;

    savingRequestIds = [...savingRequestIds, requestId];
    try {
      await onQuickEditPeerRequest?.({ requestId, studentId: nextStudentId });
    } finally {
      savingRequestIds = savingRequestIds.filter((id) => id !== requestId);
    }
  }

  async function handleClear(requestId: string) {
    savingRequestIds = [...savingRequestIds, requestId];
    try {
      await onClearPeerRequest?.(requestId);
    } finally {
      savingRequestIds = savingRequestIds.filter((id) => id !== requestId);
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={panelEl}
  class="absolute right-4 bottom-4 left-4 z-20 rounded-2xl border border-gray-200 bg-white shadow-xl md:left-auto md:w-[26rem]"
  role="dialog"
  aria-label="Peer request details"
  onclick={(event) => event.stopPropagation()}
>
  <div class="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
    <div>
      <h3 class="text-sm font-semibold text-gray-900">Peer requests</h3>
      <p class="text-sm text-gray-600">{getStudentDisplayName(student)}</p>
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
      <section class="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Rank {item.rank}
            </p>
            <p class="mt-1 text-sm font-medium text-gray-900">{item.rawText}</p>
          </div>
          {#if isSaving}
            <span class="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600">
              Saving...
            </span>
          {/if}
        </div>

        <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
          <span class="rounded-full px-2 py-1 {statusClass(item.resolutionStatus)}">
            {formatStatus(item.resolutionStatus)}
          </span>
          <span class="rounded-full px-2 py-1 {statusClass(item.satisfactionStatus)}">
            {formatStatus(item.satisfactionStatus)}
          </span>
        </div>

        <dl class="mt-3 space-y-2 text-sm text-gray-600">
          <div>
            <dt class="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Resolved target
            </dt>
            <dd class="mt-1 text-gray-900">
              {item.resolvedStudentDisplayName ?? 'Unresolved'}
            </dd>
          </div>
        </dl>

        <div class="mt-3 flex items-end gap-2">
          <label class="min-w-0 flex-1">
            <span class="mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase">
              Change target
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
            disabled={isSaving ||
              (!item.resolvedStudentId && item.resolutionStatus === 'UNRESOLVED')}
          >
            Clear
          </button>
        </div>
      </section>
    {/each}
  </div>
</div>
