import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import type { ColumnMapping, RawSheetData } from '$lib/domain/import';
import { getPeerRequestRank, isPeerRequestField } from '$lib/domain/import';
import {
  createPeerRequestEntry,
  isIgnoredPeerRequestText,
  normalizePeerRequestText,
  type PeerRequestEntry
} from '$lib/domain/peerRequest';

export interface ImportPeerRequestsFromMappingInput {
  programId: string;
  rawData: RawSheetData;
  columnMappings: ColumnMapping[];
  rowStudentLinks: Array<{ rowIndex: number; studentId: string }>;
}

export interface ImportPeerRequestsFromMappingOutput {
  entries: PeerRequestEntry[];
  warnings: string[];
}

export type ImportPeerRequestsFromMappingError =
  | { type: 'INVALID_INPUT'; message: string }
  | { type: 'MISSING_ROW_LINK'; rowIndex: number; message: string };

const MULTI_NAME_PATTERN = /\b(and|or)\b|&|\/|;|\+/i;

export function importPeerRequestsFromMapping(
  deps: {
    idGenerator: IdGenerator;
  },
  input: ImportPeerRequestsFromMappingInput
): ImportPeerRequestsFromMappingOutput | ImportPeerRequestsFromMappingError {
  if (!input.programId.trim()) {
    return {
      type: 'INVALID_INPUT',
      message: 'programId is required'
    };
  }

  const peerRequestMappings = input.columnMappings
    .filter(
      (mapping): mapping is ColumnMapping & { mappedTo: `peerRequest${1 | 2 | 3 | 4 | 5}` } =>
        mapping.mappedTo !== null && isPeerRequestField(mapping.mappedTo)
    )
    .sort((left, right) => left.columnIndex - right.columnIndex);

  if (peerRequestMappings.length === 0) {
    return { entries: [], warnings: [] };
  }

  const rowLinkByIndex = new Map(
    input.rowStudentLinks.map((link) => [link.rowIndex, link.studentId])
  );
  const warnings: string[] = [];
  const entries: PeerRequestEntry[] = [];

  for (const row of input.rawData.rows) {
    const seenNormalizedValues = new Set<string>();

    for (const mapping of peerRequestMappings) {
      const rawText = row.cells[mapping.columnIndex] ?? '';
      if (!rawText.trim() || isIgnoredPeerRequestText(rawText)) {
        continue;
      }

      const requesterStudentId = rowLinkByIndex.get(row.rowIndex);
      if (!requesterStudentId) {
        return {
          type: 'MISSING_ROW_LINK',
          rowIndex: row.rowIndex,
          message: `Missing row-to-student link for row ${row.rowIndex}`
        };
      }

      const normalizedText = normalizePeerRequestText(rawText);
      const rank = getPeerRequestRank(mapping.mappedTo);

      if (rank === null) {
        return {
          type: 'INVALID_INPUT',
          message: `Invalid peer request mapping for column ${mapping.headerName}`
        };
      }

      if (seenNormalizedValues.has(normalizedText)) {
        warnings.push(
          `Row ${row.rowIndex}: duplicate peer request text "${rawText}" for requester ${requesterStudentId}`
        );
      } else {
        seenNormalizedValues.add(normalizedText);
      }

      if (MULTI_NAME_PATTERN.test(rawText)) {
        warnings.push(
          `Row ${row.rowIndex}: peer request "${rawText}" may include multiple names and should be reviewed`
        );
      }

      entries.push(
        createPeerRequestEntry({
          id: deps.idGenerator.generateId(),
          programId: input.programId,
          requesterStudentId,
          rank,
          rawText,
          normalizedText,
          status: 'UNRESOLVED',
          resolutionSource: 'NONE',
          candidates: []
        })
      );
    }
  }

  return { entries, warnings };
}
