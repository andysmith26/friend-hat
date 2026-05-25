<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import type { MatchedPeerRequest } from '$lib/application/useCases/matchPeerRequests';
  import type { PeerRequestReviewDecision } from '$lib/application/useCases/confirmPeerRequestMatches';
  import type { Student } from '$lib/domain';

  interface Props {
    readyToConfirm?: MatchedPeerRequest[];
    needsReview?: MatchedPeerRequest[];
    noMatch?: MatchedPeerRequest[];
    invalid?: MatchedPeerRequest[];
    students: Student[];
    onConfirm: (decisions: PeerRequestReviewDecision[]) => void;
    confirmLabel?: string;
    busy?: boolean;
    warnings?: string[];
  }

  let {
    readyToConfirm = [],
    needsReview = [],
    noMatch = [],
    invalid = [],
    students,
    onConfirm,
    confirmLabel = 'Save Peer Requests',
    busy = false,
    warnings = []
  }: Props = $props();

  let selectedReady = $state<Map<string, boolean>>(new Map());
  let manualSelections = $state<Map<string, string>>(new Map());

  $effect(() => {
    const next = new Map<string, boolean>();
    for (const match of readyToConfirm) {
      next.set(match.request.id, true);
    }
    selectedReady = next;
  });

  function formatStudentName(student: Student): string {
    return [student.firstName, student.lastName].filter(Boolean).join(' ').trim() || student.id;
  }

  function formatRequester(requesterStudentId: string): string {
    return formatStudentName(students.find((student) => student.id === requesterStudentId) ?? { id: requesterStudentId, firstName: requesterStudentId });
  }

  function toggleReady(requestId: string) {
    selectedReady.set(requestId, !(selectedReady.get(requestId) ?? true));
    selectedReady = new Map(selectedReady);
  }

  function setManualSelection(requestId: string, studentId: string) {
    if (!studentId) {
      manualSelections.delete(requestId);
    } else {
      manualSelections.set(requestId, studentId);
    }
    manualSelections = new Map(manualSelections);
  }

  function getSelectableStudents(requesterStudentId: string): Student[] {
    return students.filter((student) => student.id !== requesterStudentId);
  }

  function buildDecisions(leaveAllUnresolved = false): PeerRequestReviewDecision[] {
    const decisions: PeerRequestReviewDecision[] = [];

    for (const match of readyToConfirm) {
      const isSelected = !leaveAllUnresolved && (selectedReady.get(match.request.id) ?? true);
      decisions.push(
        isSelected
          ? { requestId: match.request.id, action: 'CONFIRM_SUGGESTED' }
          : { requestId: match.request.id, action: 'LEAVE_UNRESOLVED' }
      );
    }

    for (const match of [...needsReview, ...noMatch, ...invalid]) {
      const selectedStudentId = leaveAllUnresolved ? undefined : manualSelections.get(match.request.id);
      decisions.push(
        selectedStudentId
          ? { requestId: match.request.id, action: 'SET_MANUAL', studentId: selectedStudentId }
          : { requestId: match.request.id, action: 'LEAVE_UNRESOLVED' }
      );
    }

    return decisions;
  }

  function handleConfirm() {
    onConfirm(buildDecisions(false));
  }

  function handleLeaveAllUnresolved() {
    onConfirm(buildDecisions(true));
  }

  const itemsNeedingManualChoice = $derived([...needsReview, ...noMatch, ...invalid]);
</script>

<div class="space-y-6">
  <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-gray-900">Review peer requests</h2>
    <p class="mt-1 text-sm text-gray-600">
      Roster import is complete. Review suggested matches before peer requests are saved.
      Unresolved requests are allowed and will not block completion.
    </p>
    {#if warnings.length > 0}
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <p class="font-medium">Import warnings</p>
        <ul class="mt-2 list-disc pl-5">
          {#each warnings as warning}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <div class="grid gap-6 lg:grid-cols-2">
    <section class="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-green-900">Ready to confirm</h3>
          <p class="mt-1 text-sm text-green-700">
            High-confidence matches are preselected but still require confirmation.
          </p>
        </div>
        <span class="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
          {readyToConfirm.length}
        </span>
      </div>

      <div class="mt-4 space-y-3">
        {#each readyToConfirm as match}
          <label class="flex cursor-pointer gap-3 rounded-lg border border-green-100 p-3 hover:bg-green-50">
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={selectedReady.get(match.request.id) ?? true}
              onchange={() => toggleReady(match.request.id)}
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">
                {formatRequester(match.request.requesterStudentId)} requested {match.request.rawText}
              </p>
              {#if match.bestCandidate}
                <p class="mt-1 text-sm text-gray-600">
                  Suggested: {formatStudentName(students.find((student) => student.id === match.bestCandidate?.studentId) ?? { id: match.bestCandidate.studentId, firstName: match.bestCandidate.studentId })}
                </p>
              {/if}
            </div>
          </label>
        {:else}
          <p class="text-sm text-gray-500">No requests are ready for bulk confirmation.</p>
        {/each}
      </div>
    </section>

    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900">Needs teacher review</h3>
          <p class="mt-1 text-sm text-gray-600">
            Choose a student manually or leave each request unresolved.
          </p>
        </div>
        <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
          {itemsNeedingManualChoice.length}
        </span>
      </div>

      <div class="mt-4 space-y-4">
        {#each itemsNeedingManualChoice as match}
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-gray-900">
                  {formatRequester(match.request.requesterStudentId)} requested {match.request.rawText}
                </p>
                <p class="mt-1 text-xs uppercase tracking-wide text-gray-500">{match.bucket}</p>
              </div>
              {#if match.warning}
                <span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  {match.warning}
                </span>
              {/if}
            </div>

            {#if match.candidates.length > 0}
              <div class="mt-3 space-y-2">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Suggestions</p>
                {#each match.candidates as candidate}
                  <button
                    type="button"
                    class="flex w-full items-start justify-between rounded-md border px-3 py-2 text-left text-sm hover:border-teal hover:bg-teal-50 {manualSelections.get(match.request.id) === candidate.studentId ? 'border-teal bg-teal-50' : 'border-gray-200'}"
                    onclick={() => setManualSelection(match.request.id, candidate.studentId)}
                  >
                    <span>
                      <span class="font-medium text-gray-900">
                        {formatStudentName(students.find((student) => student.id === candidate.studentId) ?? { id: candidate.studentId, firstName: candidate.studentId })}
                      </span>
                      {#if candidate.reasons.length > 0}
                        <span class="mt-1 block text-xs text-gray-500">{candidate.reasons.join(', ')}</span>
                      {/if}
                    </span>
                    <span class="text-xs font-medium text-gray-500">{candidate.score}</span>
                  </button>
                {/each}
              </div>
            {/if}

            <div class="mt-3 space-y-2">
              <label class="block text-xs font-medium uppercase tracking-wide text-gray-500" for={`request-${match.request.id}`}>
                Manual selection
              </label>
              <select
                id={`request-${match.request.id}`}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
                value={manualSelections.get(match.request.id) ?? ''}
                onchange={(event) =>
                  setManualSelection(match.request.id, (event.target as HTMLSelectElement).value)}
              >
                <option value="">Leave unresolved</option>
                {#each getSelectableStudents(match.request.requesterStudentId) as student}
                  <option value={student.id}>{formatStudentName(student)}</option>
                {/each}
              </select>
            </div>
          </div>
        {:else}
          <p class="text-sm text-gray-500">No additional peer requests need review.</p>
        {/each}
      </div>
    </section>
  </div>

  <div class="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
    <Button variant="ghost" onclick={handleLeaveAllUnresolved} disabled={busy}>Leave All Unresolved</Button>
    <Button variant="secondary" onclick={handleConfirm} loading={busy} disabled={busy}>{confirmLabel}</Button>
  </div>
</div>