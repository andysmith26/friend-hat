<script lang="ts">
  import { getStudentLongName, getStudentShortName, type Student } from '$lib/domain';
  import type { StudentPeerRequestWorkspaceSummary } from '$lib/application/useCases/getPeerRequestWorkspaceSummary';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { sortableItem, type Edge, type SortableDropState } from '$lib/utils/pragmatic-dnd';

  export type KeyboardMoveDirection = 'up' | 'down' | 'left' | 'right';

  const {
    student,
    container,
    index = 0,
    isDragging = false,
    onDragStart,
    onDragEnd,
    flash = false,
    preferenceRank = null,
    hasPreferences = false,
    textTone = 'text-gray-800',
    onHoverStart,
    onHoverEnd,
    onEdgeChange,
    onItemDrop,
    isPickedUp = false,
    isSelected = false,
    onKeyboardPickUp,
    onKeyboardDrop,
    onKeyboardCancel,
    onKeyboardMove,
    onStudentClick,
    readonly = false,
    allowedEdges,
    peerRequestSummary = null,
    isPeerRequested = false,
    onOpenStudentDetail
  } = $props<{
    student: Student;
    container: string;
    index?: number;
    isDragging?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    flash?: boolean;
    preferenceRank?: number | null;
    hasPreferences?: boolean;
    textTone?: string;
    onHoverStart?: (studentId: string, x: number, y: number) => void;
    onHoverEnd?: () => void;
    onEdgeChange?: (edge: Edge | null) => void;
    onItemDrop?: (state: SortableDropState) => void;
    isPickedUp?: boolean;
    /** When true, shows a blue selection border (click-selected in groups). */
    isSelected?: boolean;
    onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
    onKeyboardDrop?: () => void;
    onKeyboardCancel?: () => void;
    onKeyboardMove?: (direction: KeyboardMoveDirection) => void;
    onStudentClick?: (studentId: string) => void;
    /** When true, suppresses drag, keyboard pick-up, and click interactions. */
    readonly?: boolean;
    /** Which edges to use for closest-edge detection. */
    allowedEdges?: Edge[];
    peerRequestSummary?: StudentPeerRequestWorkspaceSummary | null;
    isPeerRequested?: boolean;
    /** Opens the student profile without changing the canvas selection action. */
    onOpenStudentDetail?: (studentId: string) => void;
  }>();

  const fullName = $derived(getStudentLongName(student) || student.id);
  const compactLabel = $derived(
    getStudentShortName(student) || student.id.slice(0, 2).toUpperCase()
  );
  const visibleTagLimit = $derived(uiSettings.cardSize === 'sm' ? 1 : 2);
  const visibleTags = $derived((student.tags ?? []).slice(0, visibleTagLimit));
  const hiddenTagCount = $derived(Math.max(0, (student.tags?.length ?? 0) - visibleTags.length));
  const tagSummary = $derived(student.tags?.length ? `. Tags: ${student.tags.join(', ')}.` : '');

  const badgeText = $derived.by(() => {
    if (!hasPreferences) return '';
    if (container === 'unassigned') return '—';
    if (preferenceRank === null) return '—';
    if (preferenceRank === 1) return '1st';
    if (preferenceRank === 2) return '2nd';
    if (preferenceRank === 3) return '3rd';
    return `${preferenceRank}th`;
  });

  const badgeClass = $derived.by(() => {
    if (!hasPreferences || container === 'unassigned') return 'bg-gray-200 text-gray-500';
    if (preferenceRank === 1) return 'bg-green-100 text-green-700';
    if (preferenceRank === 2) return 'bg-yellow-100 text-yellow-700';
    if (preferenceRank === 3) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  });

  const badgeAriaLabel = $derived(
    preferenceRank !== null
      ? `${preferenceRank === 1 ? '1st' : preferenceRank === 2 ? '2nd' : preferenceRank === 3 ? '3rd' : preferenceRank + 'th'} choice`
      : hasPreferences
        ? 'Not a preferred group'
        : 'No preferences'
  );
  const peerRequestCount = $derived(peerRequestSummary?.requestCount ?? 0);
  const confirmedPeerRequestCount = $derived(peerRequestSummary?.confirmedRequestCount ?? 0);
  const satisfiedPeerRequestCount = $derived(
    confirmedPeerRequestCount > 0
      ? Math.min(peerRequestSummary?.satisfiedCount ?? 0, confirmedPeerRequestCount)
      : 0
  );
  const peerRequestBadgeText = $derived(
    confirmedPeerRequestCount > 0
      ? `${satisfiedPeerRequestCount}/${confirmedPeerRequestCount}`
      : 'na'
  );
  const peerRequestBadgeAriaLabel = $derived.by(() => {
    if (!peerRequestSummary || peerRequestSummary.requestCount === 0) {
      return 'No peer requests';
    }
    if (confirmedPeerRequestCount === 0) {
      return `${peerRequestCount} peer requests, no confirmed requests`;
    }
    return `${satisfiedPeerRequestCount} of ${confirmedPeerRequestCount} confirmed peer requests satisfied`;
  });
  const peerRequestToneClass = $derived.by(() => {
    if (!peerRequestSummary || peerRequestSummary.requestCount === 0)
      return 'bg-gray-200 text-gray-500';
    if (confirmedPeerRequestCount === 0) return 'bg-gray-200 text-gray-500';
    if (satisfiedPeerRequestCount === confirmedPeerRequestCount) return 'bg-emerald-700 text-white';
    if (satisfiedPeerRequestCount > 0) return 'bg-emerald-100 text-emerald-800';
    return 'bg-rose-100 text-rose-700';
  });
  const peerRequestDotToneClass = $derived.by(() => {
    if (!peerRequestSummary || peerRequestSummary.requestCount === 0) return 'bg-slate-300';
    if (confirmedPeerRequestCount === 0) return 'bg-slate-300';
    if (satisfiedPeerRequestCount === confirmedPeerRequestCount) return 'bg-emerald-600';
    if (satisfiedPeerRequestCount > 0) return 'bg-amber-400';
    return 'bg-rose-500';
  });
  const peerRequestIndicatorMode = $derived(uiSettings.peerRequestIndicatorMode);
  const hasPeerRequestDetails = $derived(Boolean(onOpenStudentDetail));
  const peerRequestInteractiveClass = $derived.by(() => {
    return hasPeerRequestDetails
      ? 'cursor-pointer transition-[filter,box-shadow,transform] duration-150 ease-out hover:brightness-95 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1 focus-visible:outline-none'
      : 'pointer-events-none';
  });
  const peerRequestBadgeClass = $derived.by(() => {
    const interactionClass = hasPeerRequestDetails
      ? peerRequestInteractiveClass
      : 'pointer-events-none';

    return `z-10 inline-flex min-h-5 min-w-[2.6rem] shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none shadow-sm ring-1 ring-black/5 tabular-nums ${peerRequestToneClass} ${interactionClass}`;
  });
  const peerRequestDotButtonClass = $derived.by(() => {
    const interactionClass = hasPeerRequestDetails
      ? peerRequestInteractiveClass
      : 'pointer-events-none';

    return `relative z-10 h-6 w-6 shrink-0 rounded-full ${interactionClass}`;
  });
  const peerRequestDotClass = $derived.by(() => {
    const sizeClass = hasPeerRequestDetails ? 'h-3 w-3' : 'h-2 w-2';
    const ringClass = hasPeerRequestDetails
      ? 'ring-2 ring-white shadow-[0_1px_2px_rgba(15,23,42,0.18)]'
      : 'ring-1 ring-white shadow-[0_0.5px_1px_rgba(15,23,42,0.12)]';

    return `absolute top-1/2 left-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,box-shadow] duration-150 ease-out ${sizeClass} ${ringClass}`;
  });
  const selectedCardClass = $derived.by(() => {
    if (readonly || !isSelected) return '';
    if (isPickedUp) return 'border-blue-500 shadow-md ring-2 ring-blue-500 ring-offset-1';
    return 'border-sky-300 bg-sky-50 ring-2 ring-sky-200/90 ring-offset-1 shadow-[0_0_0_1px_rgba(125,211,252,0.35),0_10px_24px_-14px_rgba(56,189,248,0.35)]';
  });
  const peerRequestHighlightClass = $derived(
    isPeerRequested && !isSelected && !isPickedUp
      ? 'border-blue-700 bg-blue-50/90 ring-2 ring-blue-600/90 ring-offset-2 shadow-[0_0_0_1px_rgba(29,78,216,0.32),0_0_0_7px_rgba(96,165,250,0.20),0_0_28px_10px_rgba(37,99,235,0.34)] scale-[1.03]'
      : ''
  );

  // Hover delay handling (100ms)
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleMouseEnter(event: MouseEvent) {
    if (isDragging) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.right;
    const y = rect.top;

    hoverTimeout = setTimeout(() => {
      onHoverStart?.(student.id, x, y);
    }, 100);
  }

  function handleMouseLeave() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    onHoverEnd?.();
  }

  // Track whether a drag occurred to distinguish click from drag
  let didDrag = $state(false);

  function handleDragStartInternal() {
    didDrag = true;
    // Cancel any pending hover when drag starts
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    onHoverEnd?.();
    onDragStart?.();
  }

  function handleClick() {
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (isPickedUp) return;
    onStudentClick?.(student.id);
  }

  function handleOpenPeerRequests(event: MouseEvent) {
    event.stopPropagation();
    onOpenStudentDetail?.(student.id);
  }

  function handleOpenStudentDetail(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
    onOpenStudentDetail?.(student.id);
  }

  function handleEdgeChange(edge: Edge | null) {
    onEdgeChange?.(edge);
  }

  function handleKeydown(event: KeyboardEvent) {
    // Handle pick up / drop with Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isPickedUp) {
        onKeyboardDrop?.();
      } else {
        onKeyboardPickUp?.(student.id, container, index);
      }
      return;
    }

    // Handle cancel with Escape
    if (event.key === 'Escape' && isPickedUp) {
      event.preventDefault();
      onKeyboardCancel?.();
      return;
    }

    // Handle movement with arrow keys (only when picked up)
    if (isPickedUp) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onKeyboardMove?.('up');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        onKeyboardMove?.('down');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onKeyboardMove?.('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onKeyboardMove?.('right');
      }
    }
  }
</script>

<div
  use:sortableItem={{
    container,
    index,
    dragData: { id: student.id },
    disabled: readonly,
    allowedEdges,
    callbacks: {
      onDragStart: handleDragStartInternal,
      onDragEnd,
      onEdgeChange: handleEdgeChange,
      onDrop: onItemDrop
    }
  }}
  tabindex={readonly ? (onStudentClick ? 0 : -1) : 0}
  role={readonly ? (onStudentClick ? 'button' : undefined) : 'button'}
  aria-label="{fullName}{tagSummary}{readonly
    ? onStudentClick
      ? '. Click to view profile.'
      : ''
    : isPickedUp
      ? '. Press arrow keys to move, Enter to drop, Escape to cancel.'
      : '. Press Enter to pick up.'}"
  aria-pressed={readonly ? undefined : isPickedUp}
  data-student-id={student.id}
  style="width: var(--card-width, 136px); height: var(--card-height, 60px); padding: var(--card-padding, 2px);"
  class={`group relative mx-auto flex flex-col overflow-visible rounded-md border bg-white text-sm shadow-sm transition duration-150 ease-out ${
    readonly
      ? onStudentClick
        ? 'cursor-pointer border-gray-200 hover:border-gray-300 hover:shadow'
        : 'cursor-default border-gray-200'
      : 'cursor-grab'
  } ${selectedCardClass || 'border-gray-200'} ${peerRequestHighlightClass} ${!readonly && isDragging ? 'cursor-grabbing opacity-60' : ''} ${flash ? 'flash-move' : ''} ${!readonly || onStudentClick ? 'focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1 focus-visible:outline-none' : ''}`}
  onmouseenter={readonly ? undefined : handleMouseEnter}
  onmouseleave={readonly ? undefined : handleMouseLeave}
  onkeydown={readonly ? undefined : handleKeydown}
  onclick={readonly
    ? onStudentClick
      ? () => onStudentClick?.(student.id)
      : undefined
    : handleClick}
>
  <div class="flex min-w-0 flex-1 items-center gap-1">
    {#if peerRequestCount === 0 || peerRequestIndicatorMode !== 'count'}
      <button
        type="button"
        class={peerRequestDotButtonClass}
        aria-label={hasPeerRequestDetails
          ? `Open peer requests. ${peerRequestBadgeAriaLabel}`
          : peerRequestBadgeAriaLabel}
        disabled={!hasPeerRequestDetails}
        onclick={hasPeerRequestDetails ? handleOpenPeerRequests : undefined}
        onkeydown={(event) => {
          if (!hasPeerRequestDetails) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpenPeerRequests(event as unknown as MouseEvent);
          }
        }}
      >
        <span class={peerRequestDotClass}>
          <span class={`block h-full w-full rounded-full ${peerRequestDotToneClass}`}></span>
        </span>
      </button>
    {:else}
      <button
        type="button"
        class={peerRequestBadgeClass}
        aria-label={hasPeerRequestDetails
          ? `Open peer requests. ${peerRequestBadgeAriaLabel}`
          : peerRequestBadgeAriaLabel}
        disabled={!hasPeerRequestDetails}
        onclick={hasPeerRequestDetails ? handleOpenPeerRequests : undefined}
        onkeydown={(event) => {
          if (!hasPeerRequestDetails) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpenPeerRequests(event as unknown as MouseEvent);
          }
        }}
      >
        <span class="inline-flex items-center justify-center gap-1 whitespace-nowrap">
          <span>{peerRequestBadgeText}</span>
          <span
            aria-hidden="true"
            class={`inline-flex h-3 w-3 items-center justify-center transition-opacity duration-150 ease-out ${hasPeerRequestDetails ? 'opacity-100' : 'opacity-0'}`}
          >
            <svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
              <path
                d="M4 2.5 7.5 6 4 9.5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
              />
            </svg>
          </span>
        </span>
      </button>
    {/if}
    <div
      style="font-size: var(--card-font-size, 15px);"
      class={`relative min-w-0 flex-1 overflow-visible rounded-md bg-transparent px-1 py-0 font-semibold ${textTone}`}
    >
      <span class="block truncate text-left leading-none" title={fullName}>{compactLabel}</span>
      {#if hasPreferences && badgeText}
        <span
          class={`absolute -top-2 -left-0.5 z-10 rounded px-0.5 text-[9px] leading-tight font-bold ${badgeClass}`}
          aria-label={badgeAriaLabel}
        >
          {badgeText}
        </span>
      {/if}
    </div>
    {#if onOpenStudentDetail}
      <span
        role="button"
        tabindex="0"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1 focus-visible:outline-none"
        aria-label={`View ${fullName}'s details`}
        title="View details"
        onpointerdown={(event) => event.stopPropagation()}
        onclick={handleOpenStudentDetail}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpenStudentDetail(event);
          }
        }}
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 9.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.933 17.933 0 0 1 12 21.75a17.933 17.933 0 0 1-7.5-1.632Z"
          />
        </svg>
      </span>
    {/if}
  </div>

  <div class="flex h-5 min-w-0 items-center gap-1 px-1" aria-label={tagSummary || undefined}>
    {#each visibleTags as tag (tag)}
      <span
        class="max-w-[45%] min-w-0 truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none font-medium text-slate-600"
        title={tag}
      >
        {tag}
      </span>
    {/each}
    {#if hiddenTagCount > 0}
      <span
        class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none font-medium text-slate-500"
        title={student.tags?.slice(visibleTagLimit).join(', ')}
      >
        +{hiddenTagCount}
      </span>
    {/if}
  </div>
</div>
