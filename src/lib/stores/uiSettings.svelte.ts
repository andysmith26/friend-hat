/**
 * UI Settings Store: Client-side display preferences
 *
 * This store manages ephemeral UI state that doesn't need undo/redo
 * or persistence. Examples: visual toggles, view modes, display filters.
 *
 * Architecture:
 * - Stores are for mutable, frequently-changing UI state
 * - Context (appData) is for immutable reference data
 * - commandStore is for business logic with undo/redo
 */

export type CardSize = 'sm' | 'md' | 'lg';
export type GroupLayout = 'scroll' | 'wrap';
export type UnassignedLayout = 'horizontal' | 'vertical';

/**
 * Store implementation that keeps each preference in a $state rune.
 *
 * Using a class keeps related state + methods co-located and makes
 * instantiating fresh stores inside tests straightforward.
 */
const SKIP_DELETE_CONFIRM_KEY = 'groupwheel:skipDeleteGroupConfirm';
const SKIP_DELETE_CONFIRM_TTL = 24 * 60 * 60 * 1000; // 24 hours
const USE_EXPERIMENTAL_FEATURES_KEY = 'groupwheel:useExperimentalFeatures';

function readSkipDeleteConfirm(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SKIP_DELETE_CONFIRM_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.ts === 'number') {
      return Date.now() - parsed.ts < SKIP_DELETE_CONFIRM_TTL;
    }
    // Legacy format (plain 'true' string) — treat as expired
    return false;
  } catch {
    return false;
  }
}

function readUseExperimentalFeatures(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(USE_EXPERIMENTAL_FEATURES_KEY) === 'true';
  } catch {
    return false;
  }
}

export class UiSettingsStore {
  showGender = $state(true);
  highlightUnhappy = $state(false);
  cardSize = $state<CardSize>('md');
  groupLayout = $state<GroupLayout>('scroll');
  unassignedLayout = $state<UnassignedLayout>('horizontal');
  skipDeleteGroupConfirm = $state(readSkipDeleteConfirm());
  useExperimentalFeatures = $state(readUseExperimentalFeatures());

  setShowGender(value: boolean) {
    this.showGender = value;
  }

  setHighlightUnhappy(value: boolean) {
    this.highlightUnhappy = value;
  }

  toggleShowGender() {
    this.showGender = !this.showGender;
  }

  toggleHighlightUnhappy() {
    this.highlightUnhappy = !this.highlightUnhappy;
  }

  setCardSize(value: CardSize) {
    this.cardSize = value;
  }

  cycleCardSize() {
    const sizes: CardSize[] = ['sm', 'md', 'lg'];
    const idx = sizes.indexOf(this.cardSize);
    this.cardSize = sizes[(idx + 1) % sizes.length];
  }

  setGroupLayout(value: GroupLayout) {
    this.groupLayout = value;
  }

  toggleGroupLayout() {
    this.groupLayout = this.groupLayout === 'scroll' ? 'wrap' : 'scroll';
  }

  setUnassignedLayout(value: UnassignedLayout) {
    this.unassignedLayout = value;
  }

  toggleUnassignedLayout() {
    this.unassignedLayout = this.unassignedLayout === 'horizontal' ? 'vertical' : 'horizontal';
  }

  setSkipDeleteGroupConfirm(value: boolean) {
    this.skipDeleteGroupConfirm = value;
    try {
      if (value) {
        localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, JSON.stringify({ ts: Date.now() }));
      } else {
        localStorage.removeItem(SKIP_DELETE_CONFIRM_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  setUseExperimentalFeatures(value: boolean) {
    this.useExperimentalFeatures = value;
    try {
      localStorage.setItem(USE_EXPERIMENTAL_FEATURES_KEY, String(value));
    } catch {
      /* ignore */
    }
  }

  reset() {
    this.showGender = true;
    this.highlightUnhappy = false;
    this.cardSize = 'md';
    this.groupLayout = 'scroll';
    this.unassignedLayout = 'horizontal';
    this.skipDeleteGroupConfirm = false;
    this.useExperimentalFeatures = false;
    try {
      localStorage.removeItem(SKIP_DELETE_CONFIRM_KEY);
      localStorage.removeItem(USE_EXPERIMENTAL_FEATURES_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const uiSettings = new UiSettingsStore();

// Dev console helper: window.gw.resetDeleteConfirm()
if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.gw = {
    ...((w.gw as object) ?? {}),
    resetDeleteConfirm: () => {
      uiSettings.setSkipDeleteGroupConfirm(false);
      console.log('Delete group confirmation dialog re-enabled.');
    }
  };
}
