<script lang="ts">
  /**
   * GoogleSheetImport.svelte
   *
   * Complete wizard for importing roster from Google Sheets.
   * Steps:
   * 1. Paste Google Sheets URL
   * 2. Preview data and map columns
   * 3. Validate and import
   */

  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import type { RawSheetData, ColumnMapping, MappedField } from '$lib/domain/import';
  import { hasRequiredMappings, isPeerRequestField, validateMappedData } from '$lib/domain/import';
  import type { PoolType } from '$lib/domain';
  import { fetchGoogleSheet, isGoogleSheetsUrl, getPreviewRows } from '$lib/services/googleSheets';
  import { createImportColumnMappings } from '$lib/services/importFieldMatching';
  import {
    confirmPeerRequestMatches,
    importPeerRequestsFromMapping,
    importRosterWithMapping,
    matchPeerRequests,
    savePeerRequests,
    type ConfirmPeerRequestMatchesOutput,
    type ImportRosterWithMappingResult,
    type MatchPeerRequestsOutput
  } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { InlineError } from '$lib/components/ui';
  import SheetPreview from './SheetPreview.svelte';
  import PeerRequestMatchingReview from './PeerRequestMatchingReview.svelte';

  interface Props {
    /** Callback when import is complete */
    onImportComplete: (data: {
      importResult: ImportRosterWithMappingResult;
      peerRequestsImported: number;
      warnings: string[];
    }) => void | Promise<void>;
    /** Callback to cancel the import */
    onCancel: () => void;
    /** Suggested pool name (optional) */
    suggestedPoolName?: string;
    /** Staff owner used for roster import */
    ownerStaffId: string;
    /** Optional program to attach preferences and peer requests to */
    programId?: string;
    poolType?: PoolType;
    schoolId?: string;
    userId?: string;
    validGroupNames?: string[];
  }

  let {
    onImportComplete,
    onCancel,
    suggestedPoolName = '',
    ownerStaffId,
    programId,
    poolType = 'CLASS',
    schoolId,
    userId,
    validGroupNames
  }: Props = $props();

  const env = getAppEnvContext();

  // State
  type Step = 'url' | 'mapping' | 'review';
  let currentStep = $state<Step>('url');

  // URL step state
  let sheetUrl = $state('');
  let urlError = $state('');
  let isFetching = $state(false);

  // Data state
  let sheetData = $state<RawSheetData | null>(null);
  let columnMappings = $state<ColumnMapping[]>([]);

  // Import config state
  let poolName = $state(suggestedPoolName || 'Imported Roster');
  let importError = $state('');
  let isImporting = $state(false);
  let importWarnings = $state<string[]>([]);
  let pendingImportResult = $state<ImportRosterWithMappingResult | null>(null);
  let pendingPeerReview = $state<MatchPeerRequestsOutput | null>(null);

  // Derived state
  let canImport = $derived(hasRequiredMappings(columnMappings));
  let hasPeerRequestMappings = $derived(
    columnMappings.some(
      (mapping) => mapping.mappedTo !== null && isPeerRequestField(mapping.mappedTo)
    )
  );

  // Validation preview
  let validationPreview = $derived.by(() => {
    if (!sheetData || !hasRequiredMappings(columnMappings)) return null;
    return validateMappedData(sheetData, columnMappings);
  });

  // Initialize column mappings when sheet data is loaded
  function initializeMappings(data: RawSheetData) {
    columnMappings = createImportColumnMappings(data);
  }

  // Handle URL submission
  async function handleFetchSheet() {
    urlError = '';
    const trimmedUrl = sheetUrl.trim();

    if (!trimmedUrl) {
      urlError = 'Please enter a Google Sheets URL';
      return;
    }

    if (!isGoogleSheetsUrl(trimmedUrl)) {
      urlError =
        "This doesn't look like a Google Sheets URL. It should start with docs.google.com/spreadsheets/";
      return;
    }

    isFetching = true;

    try {
      const result = await fetchGoogleSheet(trimmedUrl);

      if (!result.success || !result.data) {
        urlError = result.error || 'Failed to fetch sheet';
        return;
      }

      sheetData = result.data;
      initializeMappings(result.data);
      currentStep = 'mapping';
    } catch (e) {
      urlError = e instanceof Error ? e.message : 'An unexpected error occurred';
    } finally {
      isFetching = false;
    }
  }

  // Handle column mapping change
  function handleMappingChange(columnIndex: number, field: MappedField | null) {
    columnMappings = columnMappings.map((m) =>
      m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
    );
  }

  // Handle import
  async function handleImport() {
    if (!sheetData || !canImport) return;

    importError = '';
    isImporting = true;

    const rosterResult = await importRosterWithMapping(env, {
      rawData: sheetData,
      columnMappings,
      poolName,
      poolType,
      ownerStaffId,
      schoolId,
      programId,
      userId,
      validGroupNames
    });

    if (isErr(rosterResult)) {
      importError =
        rosterResult.error.type === 'INTERNAL_ERROR'
          ? rosterResult.error.message
          : `Import failed: ${rosterResult.error.type}`;
      isImporting = false;
      return;
    }

    pendingImportResult = rosterResult.value;
    importWarnings = [...rosterResult.value.warnings];

    if (!programId || !hasPeerRequestMappings) {
      await finalizeImport(rosterResult.value, [], importWarnings);
      return;
    }

    const extractionResult = await importPeerRequestsFromMapping(env, {
      programId,
      rawData: sheetData,
      columnMappings,
      rowStudentLinks: rosterResult.value.rowStudentLinks
    });

    if (isErr(extractionResult)) {
      importError = extractionResult.error.message;
      isImporting = false;
      return;
    }

    importWarnings = [...rosterResult.value.warnings, ...extractionResult.value.warnings];

    if (extractionResult.value.entries.length === 0) {
      await finalizeImport(rosterResult.value, [], importWarnings);
      return;
    }

    const matchResult = await matchPeerRequests(env, {
      requests: extractionResult.value.entries,
      students: rosterResult.value.students
    });

    if (isErr(matchResult)) {
      importError = 'Unable to match peer requests.';
      isImporting = false;
      return;
    }

    pendingPeerReview = matchResult.value;
    currentStep = 'review';
    isImporting = false;
  }

  // Go back to URL step
  function handleBack() {
    if (currentStep === 'mapping') {
      currentStep = 'url';
    }
  }

  async function finalizeImport(
    importResult: ImportRosterWithMappingResult,
    reviewedRequests: ConfirmPeerRequestMatchesOutput['updatedRequests'],
    warnings: string[]
  ) {
    await onImportComplete({
      importResult,
      peerRequestsImported: reviewedRequests.length,
      warnings
    });
    isImporting = false;
  }

  async function handlePeerRequestConfirm(
    decisions: import('$lib/application/useCases/confirmPeerRequestMatches').PeerRequestReviewDecision[]
  ) {
    if (!pendingImportResult || !pendingPeerReview || !programId) {
      return;
    }

    importError = '';
    isImporting = true;

    const confirmationResult = await confirmPeerRequestMatches(env, {
      requests: pendingPeerReview.updatedRequests,
      decisions
    });

    if (isErr(confirmationResult)) {
      importError = confirmationResult.error.type;
      isImporting = false;
      return;
    }

    const saveResult = await savePeerRequests(env, {
      programId,
      entries: confirmationResult.value.updatedRequests
    });

    if (isErr(saveResult)) {
      importError = saveResult.error.message;
      isImporting = false;
      return;
    }

    await finalizeImport(
      pendingImportResult,
      confirmationResult.value.updatedRequests,
      importWarnings
    );
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h2 class="text-lg font-medium text-gray-900">Import from Google Sheets</h2>
    <p class="mt-1 text-sm text-gray-600">
      Paste a link to a publicly shared Google Sheet containing your student roster.
    </p>
  </div>

  <!-- Step 1: URL Input -->
  {#if currentStep === 'url'}
    <div class="space-y-4">
      <!-- URL input -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700" for="sheet-url">
          Google Sheets URL
        </label>
        <div class="flex gap-2">
          <input
            type="url"
            id="sheet-url"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            bind:value={sheetUrl}
            onkeydown={(e) => e.key === 'Enter' && handleFetchSheet()}
          />
          <button
            type="button"
            class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isFetching || !sheetUrl.trim()}
            onclick={handleFetchSheet}
          >
            {isFetching ? 'Loading...' : 'Fetch'}
          </button>
        </div>

        {#if urlError}
          <InlineError message={urlError} dismissible onDismiss={() => (urlError = '')} />
        {/if}
      </div>

      <!-- Help text -->
      <div class="rounded-lg border border-teal/20 bg-teal-light p-4">
        <h3 class="text-sm font-medium text-teal-dark">How to share your sheet</h3>
        <ol class="mt-2 list-inside list-decimal space-y-1 text-sm text-teal-dark">
          <li>Open your Google Sheet</li>
          <li>Click "Share" in the top right</li>
          <li>Change "General access" to "Anyone with the link"</li>
          <li>Set to "Viewer" access</li>
          <li>Copy the link and paste it above</li>
        </ol>
      </div>

      <!-- Cancel button -->
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          onclick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Step 2: Column Mapping -->
  {#if currentStep === 'mapping' && sheetData}
    <div class="space-y-4">
      <!-- Roster name input -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700" for="pool-name"> Roster Name </label>
        <input
          type="text"
          id="pool-name"
          class="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
          bind:value={poolName}
          placeholder="e.g., Period 1 - Biology"
        />
      </div>

      <!-- Instructions -->
      <div class="rounded-lg bg-gray-50 p-3">
        <p class="text-sm text-gray-700">
          <strong>Map your columns:</strong> Use the dropdowns above each column to indicate what data
          it contains. "First Name" is required. Choice columns and peer request columns are optional.
        </p>
      </div>

      {#if importError}
        <InlineError message={importError} dismissible onDismiss={() => (importError = '')} />
      {/if}

      <!-- Preview with mapping -->
      <SheetPreview
        data={getPreviewRows(sheetData, 10)}
        mappings={columnMappings}
        onMappingChange={handleMappingChange}
      />

      <!-- Validation summary -->
      {#if validationPreview}
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <h3 class="text-sm font-medium text-gray-900">Import Preview</h3>
          <div class="mt-2 flex gap-6 text-sm">
            <div>
              <span class="text-2xl font-semibold text-green-600">
                {validationPreview.summary.validCount}
              </span>
              <span class="text-gray-600"> students ready</span>
            </div>
            {#if validationPreview.summary.invalidCount > 0}
              <div>
                <span class="text-2xl font-semibold text-amber-600">
                  {validationPreview.summary.invalidCount}
                </span>
                <span class="text-gray-600"> rows with issues</span>
              </div>
            {/if}
          </div>

          {#if validationPreview.invalidRows.length > 0}
            <details class="mt-3 text-sm">
              <summary class="cursor-pointer text-amber-700">
                View {validationPreview.invalidRows.length} row{validationPreview.invalidRows
                  .length === 1
                  ? ''
                  : 's'} with issues
              </summary>
              <ul class="mt-2 max-h-32 overflow-y-auto text-xs text-gray-600">
                {#each validationPreview.invalidRows.slice(0, 10) as row}
                  <li>Row {row.rowIndex}: {row.errors.join(', ')}</li>
                {/each}
                {#if validationPreview.invalidRows.length > 10}
                  <li class="text-gray-400">
                    ...and {validationPreview.invalidRows.length - 10} more
                  </li>
                {/if}
              </ul>
            </details>
          {/if}
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex justify-between">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          onclick={handleBack}
        >
          Back
        </button>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            onclick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canImport || !poolName.trim() || isImporting}
            onclick={handleImport}
          >
            {isImporting
              ? 'Importing...'
              : `Import ${validationPreview?.summary.validCount ?? 0} Students`}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if currentStep === 'review' && pendingPeerReview && pendingImportResult}
    <div class="space-y-4">
      {#if importError}
        <InlineError message={importError} dismissible onDismiss={() => (importError = '')} />
      {/if}

      <PeerRequestMatchingReview
        readyToConfirm={pendingPeerReview.readyToConfirm}
        needsReview={pendingPeerReview.needsReview}
        noMatch={pendingPeerReview.noMatch}
        invalid={pendingPeerReview.invalid}
        students={pendingImportResult.students}
        warnings={importWarnings}
        busy={isImporting}
        confirmLabel="Save requests & finish import"
        onConfirm={handlePeerRequestConfirm}
      />
    </div>
  {/if}
</div>
