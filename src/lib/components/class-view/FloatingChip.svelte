<script lang="ts">
  import type { SaveStatus } from '$lib/stores/scenarioEditingStore';

  interface Props {
    activityName: string;
    saveStatus: SaveStatus;
    onOpen: () => void;
    /** Passes the button element to the parent so it can restore focus after toolbar collapse. */
    onButtonMount?: (el: HTMLButtonElement) => void;
  }

  const CHIP_W = 188;
  const CHIP_H = 36;
  const EDGE = 12;

  let { activityName, saveStatus, onOpen, onButtonMount }: Props = $props();

  function defaultPos() {
    if (typeof window === 'undefined') return { x: 0, y: EDGE };
    return { x: window.innerWidth - CHIP_W - EDGE, y: EDGE };
  }

  function loadPos(): { x: number; y: number } {
    try {
      const stored = localStorage.getItem('groupwheel:toolbar-chip-pos');
      if (stored) return JSON.parse(stored) as { x: number; y: number };
    } catch {
      /* ignore */
    }
    return defaultPos();
  }

  let pos = $state<{ x: number; y: number }>(loadPos());
  let dragging = $state(false);
  let didDrag = $state(false);
  let dragStartPtr = { x: 0, y: 0 };
  let dragStartPos = { x: 0, y: 0 };
  let suppressClick = false;
  let chipEl = $state<HTMLButtonElement | undefined>();

  $effect(() => {
    if (chipEl) onButtonMount?.(chipEl);
  });

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(v, hi));
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging = true;
    didDrag = false;
    dragStartPtr = { x: e.clientX, y: e.clientY };
    dragStartPos = { x: pos.x, y: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartPtr.x;
    const dy = e.clientY - dragStartPtr.y;
    if (!didDrag && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      didDrag = true;
    }
    if (!didDrag) return;
    pos = {
      x: clamp(dragStartPos.x + dx, 0, window.innerWidth - CHIP_W),
      y: clamp(dragStartPos.y + dy, 0, window.innerHeight - CHIP_H)
    };
  }

  function handlePointerUp() {
    if (!dragging) return;
    dragging = false;
    if (didDrag) {
      suppressClick = true;
      try {
        localStorage.setItem('groupwheel:toolbar-chip-pos', JSON.stringify(pos));
      } catch {
        /* ignore */
      }
    }
  }

  function handleClick() {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    onOpen();
  }

  const truncatedName = $derived(
    activityName.length > 22 ? activityName.slice(0, 20) + '…' : activityName
  );

  const dotClass = $derived(
    saveStatus === 'saved'
      ? 'bg-teal-400'
      : saveStatus === 'saving'
        ? 'animate-pulse bg-amber-400'
        : saveStatus === 'error' || saveStatus === 'failed'
          ? 'bg-red-400'
          : 'bg-gray-300'
  );
</script>

<!--
  Floating draggable chip that acts as the toolbar's "open" trigger.
  Position is persisted in localStorage. Replaces the old invisible h-3 reveal strip.
-->
<button
  bind:this={chipEl}
  type="button"
  class="fixed z-50 flex h-9 items-center gap-2 rounded-full bg-white/95 px-3 text-sm font-medium text-gray-700 shadow-lg ring-1 ring-black/10 backdrop-blur-sm transition-shadow select-none hover:bg-white hover:text-gray-900 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none {dragging
    ? 'cursor-grabbing'
    : 'cursor-grab'}"
  style="left: {pos.x}px; top: {pos.y}px; touch-action: none;"
  aria-label="Show workspace toolbar"
  title="Show workspace toolbar (Option-Shift-T) · Drag to reposition"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onclick={handleClick}
>
  <span class="max-w-[130px] truncate">{truncatedName}</span>
  <span class="h-2 w-2 shrink-0 rounded-full {dotClass}"></span>
  <!-- Chevron-down icon -->
  <svg
    class="h-3.5 w-3.5 shrink-0 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="2.5"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7" />
  </svg>
</button>
