import { describe, expect, it } from 'vitest';
import { importPeerRequestsFromMapping } from './importPeerRequestsFromMapping';
import type { ColumnMapping, RawSheetData } from '$lib/domain/import';

describe('importPeerRequestsFromMapping', () => {
  const rawData: RawSheetData = {
    headers: ['First', 'Peer 1', 'Peer 2'],
    rows: [
      { rowIndex: 2, cells: ['Alice', 'Bob Jones', 'Bob Jones'] },
      { rowIndex: 3, cells: ['Bea', 'none', 'Sam and Taylor'] }
    ]
  };

  const columnMappings: ColumnMapping[] = [
    { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
    { columnIndex: 1, headerName: 'Peer 1', mappedTo: 'peerRequest1' },
    { columnIndex: 2, headerName: 'Peer 2', mappedTo: 'peerRequest2' }
  ];

  const idGenerator = {
    generateId: (() => {
      let count = 0;
      return () => `peer-${++count}`;
    })()
  };

  it('creates one unresolved entry per non-empty mapped peer request cell', () => {
    const result = importPeerRequestsFromMapping(
      { idGenerator },
      {
        programId: 'program-1',
        rawData,
        columnMappings,
        rowStudentLinks: [
          { rowIndex: 2, studentId: 'student-a' },
          { rowIndex: 3, studentId: 'student-b' }
        ]
      }
    );

    expect('entries' in result).toBe(true);
    if ('entries' in result) {
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0]).toMatchObject({
        requesterStudentId: 'student-a',
        rank: 1,
        rawText: 'Bob Jones',
        status: 'UNRESOLVED',
        resolutionSource: 'NONE',
        candidates: []
      });
      expect(result.entries[1]).toMatchObject({
        requesterStudentId: 'student-a',
        rank: 2,
        rawText: 'Bob Jones'
      });
      expect(result.entries[2]).toMatchObject({
        requesterStudentId: 'student-b',
        rank: 2,
        rawText: 'Sam and Taylor'
      });
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('duplicate peer request text'),
          expect.stringContaining('may include multiple names')
        ])
      );
    }
  });

  it('returns an error when a row with peer request text has no row-student link', () => {
    const result = importPeerRequestsFromMapping(
      { idGenerator },
      {
        programId: 'program-1',
        rawData,
        columnMappings,
        rowStudentLinks: [{ rowIndex: 2, studentId: 'student-a' }]
      }
    );

    expect(result).toEqual({
      type: 'MISSING_ROW_LINK',
      rowIndex: 3,
      message: 'Missing row-to-student link for row 3'
    });
  });
});
