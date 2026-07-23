import type { CardSize } from '$lib/stores/uiSettings.svelte';

interface SizeTokens {
  '--card-width': string;
  '--card-height': string;
  '--card-font-size': string;
  '--card-padding': string;
  '--card-gap': string;
  '--grip-size': string;
  '--group-col-width': string;
  '--sidebar-width': string;
}

const TOKEN_MAP: Record<CardSize, SizeTokens> = {
  sm: {
    '--card-width': '136px',
    '--card-height': '60px',
    '--card-font-size': '15px',
    '--card-padding': '2px',
    '--card-gap': '4px',
    '--grip-size': '10px',
    '--group-col-width': '160px',
    '--sidebar-width': '172px'
  },
  md: {
    '--card-width': '160px',
    '--card-height': '64px',
    '--card-font-size': '17px',
    '--card-padding': '4px',
    '--card-gap': '4px',
    '--grip-size': '12px',
    '--group-col-width': '188px',
    '--sidebar-width': '200px'
  },
  lg: {
    '--card-width': '192px',
    '--card-height': '68px',
    '--card-font-size': '19px',
    '--card-padding': '6px',
    '--card-gap': '6px',
    '--grip-size': '14px',
    '--group-col-width': '224px',
    '--sidebar-width': '236px'
  }
};

/** Convert tokens to a CSS style string for use on a wrapper element */
export function cardSizeStyle(size: CardSize): string {
  const tokens = TOKEN_MAP[size];
  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/** Get the numeric group column width for ROW_CONFIG */
export function getGroupColWidthPx(size: CardSize): number {
  return parseInt(TOKEN_MAP[size]['--group-col-width']);
}
