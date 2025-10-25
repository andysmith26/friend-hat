<script lang="ts">
	// Svelte 5 runes
	type Student = {
		id: string; // unique email address
		name: string; // display name
		friendIds: string[]; // raw friend ids (emails)
	};

	type Group = {
		id: string; // internal uid
		name: string; // editable label
		capacity: number | null; // null = no hard cap
		memberIds: string[]; // student ids
	};

	// ---------- STATE ----------
	let rawPaste = $state('');
	let parseError = $state<string | null>(null);

	// core datasets
	let studentsById = $state<Record<string, Student>>({});
	let studentOrder = $state<string[]>([]); // deterministic original order (ids)

	// unknown friend ids encountered in paste
	let unknownFriendIds = $state<Set<string>>(new Set());

	// UI mode: groups by count or by target size
	type Mode = 'COUNT' | 'SIZE';
	let mode = $state<Mode>('COUNT');

	// controls
	let numberOfGroups = $state(4);
	let targetGroupSize = $state(10);

	// groups
	let groups = $state<Group[]>([]);
	let unassigned = $state<string[]>([]); // student ids not in any group

	// selection/highlight
	let selectedStudentId = $state<string | null>(null);

	// ---------- HELPERS ----------
	const uid = () => Math.random().toString(36).slice(2, 9);

	function resetAll() {
		groups = [];
		unassigned = [];
		selectedStudentId = null;
		parseError = null;
		unknownFriendIds = new Set();
	}

	function clearAssignments() {
		groups = groups.map((g) => ({ ...g, memberIds: [] }));
		unassigned = [...studentOrder];
		selectedStudentId = null;
	}

	function initGroups() {
		const total = studentOrder.length;
		if (mode === 'COUNT') {
			const n = Math.max(1, numberOfGroups | 0);
			groups = Array.from({ length: n }, (_, i) => ({
				id: uid(),
				name: `Group ${i + 1}`,
				capacity: Math.ceil(total / n),
				memberIds: []
			}));
		} else {
			const size = Math.max(1, targetGroupSize | 0);
			const n = Math.max(1, Math.ceil(total / size));
			groups = Array.from({ length: n }, (_, i) => ({
				id: uid(),
				name: `Group ${i + 1}`,
				capacity: size,
				memberIds: []
			}));
		}
		unassigned = [...studentOrder];
	}

	// ---------- PARSING ----------
	/**
	 * Expected headers (order-insensitive, minimal):
	 * - "display name" (or "name")
	 * - "id" (unique email)
	 * - "friend 1 id", "friend 2 id", ..., any number of friend columns
	 *
	 * Notes:
	 * - Some students have no friends listed (friend columns may be empty or absent).
	 * - Some friend ids may not exist in the dataset → ignored.
	 */
	function parsePasted(text: string) {
		resetAll();

		const lines = text
			.trim()
			.split(/\r?\n/)
			.filter((l) => l.trim().length > 0);
		if (lines.length < 2) {
			parseError = 'Please paste at least a header row and one data row.';
			return;
		}

		// detect TSV vs CSV (Sheets paste is typically TSV)
		const delimiter = lines[0].includes('\t') ? '\t' : ',';

		const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
		const colName = (wanted: string) => header.findIndex((h) => h === wanted);

		// alias for display name
		let nameIdx = header.findIndex((h) => h === 'display name' || h === 'name');
		const idIdx = colName('id');
		if (nameIdx === -1 || idIdx === -1) {
			parseError = 'Headers must include "display name" (or "name") and "id".';
			return;
		}

		// collect friend columns (any header that matches /^friend\s*\d+\s*id$/i)
		const friendIdxs = header
			.map((h, i) => ({ h, i }))
			.filter(({ h }) => /^friend\s*\d+\s*id$/i.test(h))
			.map(({ i }) => i)
			.sort((a, b) => a - b);

		const map: Record<string, Student> = {};
		const order: string[] = [];
		const unknownSet = new Set<string>();

		for (let r = 1; r < lines.length; r++) {
			const raw = lines[r];
			const cells = splitCsvTsvRow(raw, delimiter, header.length);
			if (!cells) continue;

			const name = (cells[nameIdx] ?? '').trim();
			const id = (cells[idIdx] ?? '').trim().toLowerCase();

			if (!id) {
				// skip rows without id
				continue;
			}
			if (map[id]) {
				parseError = `Duplicate id found on row ${r + 1}: ${id}`;
				return;
			}

			const friendIds = friendIdxs
				.map((idx) => (cells[idx] ?? '').trim().toLowerCase())
				.filter((fid) => fid.length > 0);

			map[id] = { id, name, friendIds };
			order.push(id);
			// unknown-ness checked after full map is known
		}

		// now that all ids are known, check unknown friend ids
		for (const s of Object.values(map)) {
			for (const fid of s.friendIds) {
				if (!map[fid]) unknownSet.add(fid);
			}
		}

		studentsById = map;
		studentOrder = order;
		unknownFriendIds = unknownSet;

		// initialize groups and unassigned based on mode/controls
		initGroups();
	}

	// naive-but-good-enough splitter (MVP): TSV or simple CSV (no quoted commas)
	function splitCsvTsvRow(row: string, delim: string, minCols: number) {
		// For MVP we avoid full CSV quotes handling; Google Sheets paste (TSV) is fine.
		const parts = row.split(delim);
		if (parts.length < minCols) {
			// pad to min columns
			while (parts.length < minCols) parts.push('');
		}
		return parts;
	}

	// ---------- DnD ----------
	let dragId: string | null = null;

	function onDragStart(ev: DragEvent, studentId: string) {
		dragId = studentId;
		ev.dataTransfer?.setData('text/plain', studentId);
		ev.dataTransfer?.setDragImage?.(new Image(), 0, 0); // invisible ghost
	}

	function onDragOver(ev: DragEvent) {
		ev.preventDefault();
	}

	function moveToGroup(studentId: string, groupId: string | null) {
		// remove from any group
		for (const g of groups) {
			const idx = g.memberIds.indexOf(studentId);
			if (idx >= 0) g.memberIds.splice(idx, 1);
		}
		// remove from unassigned
		{
			const idx = unassigned.indexOf(studentId);
			if (idx >= 0) unassigned.splice(idx, 1);
		}
		if (groupId === null) {
			unassigned.push(studentId);
			return;
		}
		const g = groups.find((x) => x.id === groupId);
		if (!g) return;
		// enforce capacity if set
		if (g.capacity != null && g.memberIds.length >= g.capacity) {
			// if full, push back to unassigned
			unassigned.push(studentId);
			return;
		}
		g.memberIds.push(studentId);
	}

	function onDropToUnassigned(ev: DragEvent) {
		ev.preventDefault();
		const id = dragId ?? ev.dataTransfer?.getData('text/plain') ?? '';
		if (!id) return;
		moveToGroup(id, null);
		dragId = null;
	}

	function onDropToGroup(ev: DragEvent, groupId: string) {
		ev.preventDefault();
		const id = dragId ?? ev.dataTransfer?.getData('text/plain') ?? '';
		if (!id) return;
		moveToGroup(id, groupId);
		dragId = null;
	}

	// ---------- METRICS ----------
	function groupOf(studentId: string): Group | null {
		for (const g of groups) if (g.memberIds.includes(studentId)) return g;
		return null;
	}

	function studentHappiness(studentId: string): number {
		const s = studentsById[studentId];
		if (!s) return 0;
		const g = groupOf(studentId);
		if (!g) return 0;
		if (!s.friendIds?.length) return 0;
		const set = new Set(g.memberIds);
		let count = 0;
		for (const fid of s.friendIds) {
			if (studentsById[fid] && set.has(fid)) count++;
		}
		return count;
	}

	const totalHappiness = $derived(() => {
		let sum = 0;
		for (const id of studentOrder) sum += studentHappiness(id);
		return sum;
	});

	// highlight: selected student's friends
	function isHighlighted(studentId: string): boolean {
		if (!selectedStudentId) return false;
		if (studentId === selectedStudentId) return true;
		const sel = studentsById[selectedStudentId];
		return sel?.friendIds?.includes(studentId) ?? false;
	}

	// ---------- ASSIGNMENT ----------
	function clearAndRandomAssign() {
		clearAssignments();
		const shuffled = [...studentOrder].sort(() => Math.random() - 0.5);
		let gi = 0;
		for (const id of shuffled) {
			// place into next group with space, wrap until found
			let placed = false;
			for (let k = 0; k < groups.length * 2; k++) {
				const g = groups[gi % groups.length];
				gi++;
				if (g.capacity != null && g.memberIds.length >= g.capacity) continue;
				g.memberIds.push(id);
				placed = true;
				break;
			}
			if (!placed) unassigned.push(id);
		}
	}

	// Build (undirected) adjacency from friendIds that exist
	function buildAdjacency(): Map<string, Set<string>> {
		const adj = new Map<string, Set<string>>();
		for (const id of studentOrder) adj.set(id, new Set());
		for (const s of Object.values(studentsById)) {
			for (const fid of s.friendIds) {
				if (studentsById[fid]) {
					adj.get(s.id)!.add(fid);
					adj.get(fid)!.add(s.id); // undirected for grouping
				}
			}
		}
		return adj;
	}

	function autoAssignBalanced() {
		clearAssignments();
		const adj = buildAdjacency();
		const degree = (id: string) => adj.get(id)?.size ?? 0;

		// order by degree desc
		const order = [...studentOrder].sort((a, b) => degree(b) - degree(a));

		// helper: remaining capacity
		const remaining = (g: Group) =>
			g.capacity == null ? Infinity : g.capacity - g.memberIds.length;

		// place greedily maximizing already-placed friends in the target group
		for (const id of order) {
			let bestG: Group | null = null;
			let bestScore = -1;

			for (const g of groups) {
				if (remaining(g) <= 0) continue;
				// score = number of id's friends already in g
				let sc = 0;
				const set = new Set(g.memberIds);
				for (const fid of adj.get(id) ?? []) if (set.has(fid)) sc++;
				if (sc > bestScore) {
					bestScore = sc;
					bestG = g;
				}
			}
			if (bestG) bestG.memberIds.push(id);
			else unassigned.push(id);
			unassigned = studentOrder.filter((id) => !groups.some((g) => g.memberIds.includes(id)));
		}

		// local improvement: try a bounded number of beneficial swaps
		const budget = 300;
		for (let t = 0; t < budget; t++) {
			// pick two random distinct students in different groups
			const a = pickRandomPlaced();
			const b = pickRandomPlaced();
			if (!a || !b || a.id === b.id || a.group.id === b.group.id) continue;

			const delta = swapDeltaHappiness(a.id, b.id, a.group, b.group);
			// capacity is unchanged by swap, so no need to recheck
			if (delta > 0) {
				// perform swap
				const ai = a.group.memberIds.indexOf(a.id);
				const bi = b.group.memberIds.indexOf(b.id);
				a.group.memberIds[ai] = b.id;
				b.group.memberIds[bi] = a.id;
			}
		}

		function pickRandomPlaced() {
			const placedPairs: { id: string; group: Group }[] = [];
			for (const g of groups) for (const id of g.memberIds) placedPairs.push({ id, group: g });
			if (!placedPairs.length) return null;
			return placedPairs[(Math.random() * placedPairs.length) | 0];
		}

		function swapDeltaHappiness(aId: string, bId: string, gA: Group, gB: Group) {
			const before =
				studentHappiness(aId) +
				studentHappiness(bId) +
				// neighbors in same groups affected by swap:
				neighborsDeltaContext(gA, aId) +
				neighborsDeltaContext(gB, bId);

			// simulate swap
			const ai = gA.memberIds.indexOf(aId);
			const bi = gB.memberIds.indexOf(bId);
			gA.memberIds[ai] = bId;
			gB.memberIds[bi] = aId;

			const after =
				studentHappiness(aId) +
				studentHappiness(bId) +
				neighborsDeltaContext(gA, bId) +
				neighborsDeltaContext(gB, aId);

			// revert simulation
			gA.memberIds[ai] = aId;
			gB.memberIds[bi] = bId;

			return after - before;
		}

		function neighborsDeltaContext(g: Group, movedId: string) {
			// Only students who listed movedId as friend may change happiness.
			// Quick approximation: recompute happiness for friends of movedId that are in g.
			let sum = 0;
			for (const otherId of g.memberIds) {
				const other = studentsById[otherId];
				if (other.friendIds?.includes(movedId)) {
					sum += studentHappiness(otherId);
				}
			}
			return sum;
		}
	}

	// ---------- EXPORT ----------
	function copyTSV() {
		const rows: string[] = [];
		rows.push(['group', 'display name', 'id'].join('\t'));

		for (const g of groups) {
			for (const id of g.memberIds) {
				const s = studentsById[id];
				rows.push([g.name, s?.name ?? '', s?.id ?? ''].join('\t'));
			}
		}
		for (const id of unassigned) {
			const s = studentsById[id];
			rows.push(['Unassigned', s?.name ?? '', s?.id ?? ''].join('\t'));
		}

		const tsv = rows.join('\n');
		navigator.clipboard.writeText(tsv).catch(() => {});
	}

	// ---------- DERIVED ----------
	const totalStudents = $derived(() => studentOrder.length);
	const placedCount = $derived(() => groups.reduce((acc, g) => acc + g.memberIds.length, 0));
	const unassignedCount = $derived(() => unassigned.length);

	// recompute unassigned if user edits group capacities and prunes members by mistake (not needed in MVP)
</script>

<!-- LAYOUT -->
<div class="mx-auto max-w-7xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Group Hat v3 — MVP</h1>
		<div class="text-sm text-gray-500">Privacy-first • Client-side • No data stored</div>
	</header>

	<!-- PASTE & PARSE -->
	<section class="grid gap-4 md:grid-cols-3">
		<div class="space-y-2 md:col-span-2">
			<label class="block text-sm font-medium">Paste from Google Sheets (TSV/CSV)</label>
			<textarea
				class="h-40 w-full rounded-md border p-2 font-mono text-sm"
				bind:value={rawPaste}
				placeholder="Headers required: display name | name, id, friend 1 id, friend 2 id, ..."
			>
			</textarea>
			<div class="flex items-center gap-2">
				<button
					class="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
					on:click={() => parsePasted(rawPaste)}
				>
					Parse data
				</button>
				{#if parseError}
					<span class="text-sm text-red-600">{parseError}</span>
				{:else if totalStudents > 0}
					<span class="text-sm text-gray-600">
						Parsed <strong>{totalStudents}</strong> students.
						{#if unknownFriendIds.size > 0}
							Ignored <strong>{unknownFriendIds.size}</strong> friend id{unknownFriendIds.size === 1
								? ''
								: 's'} not in list.
						{/if}
					</span>
				{/if}
			</div>
			<p class="text-xs text-gray-500">
				Required columns: <code>display name</code> (or <code>name</code>), <code>id</code> (unique
				email). Any number of <code>friend N id</code> columns are supported. Missing/unknown friend
				ids are ignored.
			</p>
		</div>

		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium">Mode</label>
				<select class="rounded-md border p-1 text-sm" bind:value={mode}>
					<option value="COUNT">Number of groups</option>
					<option value="SIZE">Target group size</option>
				</select>
			</div>

			{#if mode === 'COUNT'}
				<div class="space-y-1">
					<label class="block text-sm">Number of groups</label>
					<input
						type="number"
						min="1"
						class="w-32 rounded-md border p-1"
						bind:value={numberOfGroups}
					/>
				</div>
			{:else}
				<div class="space-y-1">
					<label class="block text-sm">Target group size</label>
					<input
						type="number"
						min="1"
						class="w-32 rounded-md border p-1"
						bind:value={targetGroupSize}
					/>
				</div>
			{/if}

			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={initGroups}
					disabled={totalStudents === 0}
				>
					Create/Reset groups
				</button>
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={clearAssignments}
					disabled={groups.length === 0}
				>
					Clear assignments
				</button>
			</div>

			<div class="space-y-1 text-sm">
				<div>Total students: <strong>{totalStudents}</strong></div>
				<div>
					Placed: <strong>{placedCount}</strong> • Unassigned: <strong>{unassignedCount}</strong>
				</div>
				<div>Total happiness: <strong>{totalHappiness}</strong></div>
			</div>

			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
					disabled={groups.length === 0}
					on:click={autoAssignBalanced}
				>
					Auto-assign (honor friends)
				</button>
				<button
					class="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
					disabled={groups.length === 0}
					on:click={clearAndRandomAssign}
				>
					Random assign
				</button>
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={copyTSV}
					disabled={totalStudents === 0}
				>
					Copy TSV for Sheets
				</button>
			</div>
		</div>
	</section>

	<!-- GROUP EDITOR -->
	{#if groups.length > 0}
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium">Groups</h2>
				<button
					class="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
					on:click={() =>
						groups.push({
							id: uid(),
							name: `Group ${groups.length + 1}`,
							capacity: null,
							memberIds: []
						})}
				>
					+ Add group
				</button>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
				<!-- Unassigned -->
				<div
					class="flex flex-col rounded-lg border p-3"
					on:dragover={onDragOver}
					on:drop={onDropToUnassigned}
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="font-semibold">Unassigned</div>
						<div class="text-xs text-gray-500">{unassigned.length}</div>
					</div>

					<ul class="min-h-24 flex-1 space-y-1">
						{#each unassigned as sid (sid)}
							{#await Promise.resolve(studentsById[sid]) then s}
								<li
									class="flex cursor-move items-center justify-between gap-2 rounded border
                       bg-white px-2 py-1 hover:bg-gray-50
                       {isHighlighted(s.id) ? 'ring-2 ring-amber-400' : ''}"
									draggable="true"
									on:dragstart={(e) => onDragStart(e, s.id)}
									on:click={() => (selectedStudentId = selectedStudentId === s.id ? null : s.id)}
								>
									<span class="truncate">{s.name || s.id}</span>
									<span class="text-xs text-gray-500">{s.id}</span>
								</li>
							{/await}
						{/each}
					</ul>
				</div>

				<!-- Groups -->
				{#each groups as g (g.id)}
					<div
						class="flex flex-col rounded-lg border p-3"
						on:dragover={onDragOver}
						on:drop={(e) => onDropToGroup(e, g.id)}
					>
						<div class="mb-2 flex items-center justify-between gap-2">
							<input class="flex-1 bg-transparent font-semibold outline-none" bind:value={g.name} />
							<div class="flex items-center gap-1 text-xs text-gray-500">
								<span>{g.memberIds.length}</span>
								<span>/</span>
								<input
									class="w-12 rounded border px-1 py-0.5"
									type="number"
									min="0"
									placeholder="∞"
									bind:value={g.capacity}
									on:change={(e) => {
										const v = Number((e.target as HTMLInputElement).value);
										if (Number.isNaN(v) || v <= 0) g.capacity = null;
									}}
								/>
							</div>
						</div>

						<ul class="min-h-24 flex-1 space-y-1">
							{#each g.memberIds as sid (sid)}
								{#await Promise.resolve(studentsById[sid]) then s}
									<li
										class="flex cursor-move items-center justify-between gap-2 rounded border
                         bg-white px-2 py-1 hover:bg-gray-50
                         {isHighlighted(s.id) ? 'ring-2 ring-amber-400' : ''}"
										draggable="true"
										on:dragstart={(e) => onDragStart(e, s.id)}
										on:click={() => (selectedStudentId = selectedStudentId === s.id ? null : s.id)}
									>
										<span class="truncate">
											{s.name || s.id}
											{#if studentHappiness(s.id) > 0}
												<span class="ml-1 text-xs text-emerald-700"
													>(+{studentHappiness(s.id)})</span
												>
											{/if}
										</span>
										<span class="text-xs text-gray-500">{s.id}</span>
									</li>
								{/await}
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
