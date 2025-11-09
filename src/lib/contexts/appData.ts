/**
 * Context provider for read-only application data.
 *
 * This context makes studentsById and groups available to deeply nested components
 * without prop drilling. We use context for this data because:
 *
 * 1. It's loaded once per session and doesn't change
 * 2. Many components need access (cards, inspector, columns)
 * 3. It's read-only reference data (not reactive UI state)
 *
 * Why not just pass as props?
 * - Would require threading through every intermediate component
 * - Makes component interfaces noisy (components that don't use the data still pass it down)
 * - Changes to data structure would require updating every component in the chain
 *
 * Why not use a store?
 * - Stores are for mutable state; this data is immutable after load
 * - Context is lighter-weight and signals "read-only"
 * - Avoids confusion with commandStore which handles groups mutations
 */

import { getContext, setContext } from 'svelte';
import type { Student } from '$lib/types';

export interface AppDataContext {
	studentsById: Record<string, Student>;
}

const APP_DATA_KEY = Symbol('appData');

/**
 * Set up the context in a parent component (typically +page.svelte).
 * This should be called once, at the root of your component tree.
 */
export function setAppDataContext(data: AppDataContext): void {
	setContext(APP_DATA_KEY, data);
}

/**
 * Access the context in any child component.
 * Throws if called outside the context provider tree.
 */
export function getAppDataContext(): AppDataContext {
	const context = getContext<AppDataContext>(APP_DATA_KEY);

	if (!context) {
		throw new Error(
			'getAppDataContext() called outside of context provider. ' +
				'Make sure setAppDataContext() is called in a parent component.'
		);
	}

	return context;
}
