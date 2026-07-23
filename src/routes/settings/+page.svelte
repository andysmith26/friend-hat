<script lang="ts">
  import DataBackupSettings from '$lib/components/settings/DataBackupSettings.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

  <section class="mb-8">
    <DataBackupSettings />
  </section>

  <section class="mb-8 rounded-lg border border-gray-200 bg-white p-4">
    <h2 class="text-lg font-semibold text-gray-800">Experimental Features</h2>
    <label class="mt-3 flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={uiSettings.useExperimentalFeatures}
        onchange={(event) =>
          uiSettings.setUseExperimentalFeatures((event.currentTarget as HTMLInputElement).checked)}
        class="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span>
        <span class="block text-sm font-medium text-gray-900">Use experimental features</span>
        <span class="mt-0.5 block text-sm text-gray-500">
          Show in-progress student details and grouping preference controls.
        </span>
      </span>
    </label>
  </section>
</div>
