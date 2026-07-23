import { describe, expect, it } from 'vitest';
import { UiSettingsStore } from './uiSettings.svelte';

describe('UiSettingsStore', () => {
  it('toggles individual flags', () => {
    const store = new UiSettingsStore();

    expect(store.showGender).toBe(true);
    expect(store.highlightUnhappy).toBe(false);

    store.toggleShowGender();
    store.toggleHighlightUnhappy();

    expect(store.showGender).toBe(false);
    expect(store.highlightUnhappy).toBe(true);
  });

  it('resets back to default values', () => {
    const store = new UiSettingsStore();

    store.setShowGender(false);
    store.setHighlightUnhappy(true);
    store.setCardSize('lg');
    store.setPeerRequestIndicatorMode('count');

    store.reset();

    expect(store.showGender).toBe(true);
    expect(store.highlightUnhappy).toBe(false);
    expect(store.cardSize).toBe('md');
    expect(store.peerRequestIndicatorMode).toBe('dot');
  });

  it('defaults cardSize to md', () => {
    const store = new UiSettingsStore();
    expect(store.cardSize).toBe('md');
  });

  it('sets card size', () => {
    const store = new UiSettingsStore();
    store.setCardSize('lg');
    expect(store.cardSize).toBe('lg');
  });

  it('cycles card size md -> lg -> sm -> md', () => {
    const store = new UiSettingsStore();
    expect(store.cardSize).toBe('md');
    store.cycleCardSize();
    expect(store.cardSize).toBe('lg');
    store.cycleCardSize();
    expect(store.cardSize).toBe('sm');
    store.cycleCardSize();
    expect(store.cardSize).toBe('md');
  });

  it('defaults peer request indicator mode to dot', () => {
    const store = new UiSettingsStore();
    expect(store.peerRequestIndicatorMode).toBe('dot');
  });

  it('sets peer request indicator mode', () => {
    const store = new UiSettingsStore();
    store.setPeerRequestIndicatorMode('count');
    expect(store.peerRequestIndicatorMode).toBe('count');
  });

  it('defaults experimental features to off and can enable them', () => {
    const store = new UiSettingsStore();

    expect(store.useExperimentalFeatures).toBe(false);
    store.setUseExperimentalFeatures(true);
    expect(store.useExperimentalFeatures).toBe(true);
  });
});
