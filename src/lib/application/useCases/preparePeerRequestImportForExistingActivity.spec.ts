import { describe, expect, it } from 'vitest';
import type { ColumnMapping, RawSheetData, UnmatchedStudentIdRow } from '$lib/domain/import';
import {
  extractPeerRequestTextsFromCells,
  prepareUnmatchedPeerRequestRows,
  validatePeerRequestImportMappings
} from './preparePeerRequestImportForExistingActivity';

describe('validatePeerRequestImportMappings', () => {
  it('requires a student ID mapping', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBe(
      'Map the source Student ID column before continuing.'
    );
  });

  it('requires at least one peer request mapping', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBe(
      'Map at least one Peer Request column before continuing.'
    );
  });

  it('rejects mixed choice and peer request mappings', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Choice 1', mappedTo: 'choice1' },
      { columnIndex: 2, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBe(
      'This importer only supports peer requests. Remove any Choice mappings and try again.'
    );
  });

  it('accepts peer request only mappings', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' },
      { columnIndex: 2, headerName: 'Peer Request 2', mappedTo: 'peerRequest2' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBeNull();
  });
});

describe('extractPeerRequestTextsFromCells', () => {
  it('extracts peer request values in mapped column order and skips blanks', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Peer Request 2', mappedTo: 'peerRequest2' },
      { columnIndex: 2, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];

    expect(extractPeerRequestTextsFromCells(['stu-1', '', 'Alex'], mappings)).toEqual(['Alex']);
    expect(extractPeerRequestTextsFromCells(['stu-1', 'Jordan', 'Alex'], mappings)).toEqual([
      'Jordan',
      'Alex'
    ]);
  });
});

describe('prepareUnmatchedPeerRequestRows', () => {
  it('adds parsed peer request texts to unmatched rows', () => {
    const data: RawSheetData = {
      headers: ['Student ID', 'Peer Request 1'],
      rows: [{ rowIndex: 2, cells: ['missing', 'Alex'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];
    const unmatchedRows: UnmatchedStudentIdRow[] = [
      { rowIndex: 2, sourceStudentId: 'missing', cells: ['missing', 'Alex'] }
    ];

    expect(prepareUnmatchedPeerRequestRows(data, mappings, unmatchedRows)).toEqual([
      {
        rowIndex: 2,
        sourceStudentId: 'missing',
        cells: ['missing', 'Alex'],
        peerRequestTexts: ['Alex']
      }
    ]);
  });
});
