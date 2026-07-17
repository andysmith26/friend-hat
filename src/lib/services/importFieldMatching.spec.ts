import { describe, expect, it } from 'vitest';

import { createImportColumnMappings, guessImportFieldMapping } from './importFieldMatching';

describe('guessImportFieldMapping', () => {
  it.each([
    ['Student ID', 'studentId'],
    ['Email', 'studentId'],
    ['Display Name', 'displayName'],
    ['First Name', 'firstName'],
    ['surname', 'lastName'],
    ['Group Choice 3', 'choice3'],
    ['Pick', 'choice1'],
    ['Partner Request 2', 'peerRequest2'],
    ['Want to Work With', 'peerRequest1']
  ])('recognizes %s', (header, expected) => {
    expect(guessImportFieldMapping(header)).toBe(expected);
  });

  it('does not map unrelated headers', () => {
    expect(guessImportFieldMapping('Teacher notes')).toBeNull();
  });
});

describe('createImportColumnMappings', () => {
  it('creates one suggested mapping per header', () => {
    expect(
      createImportColumnMappings({
        headers: ['First Name', 'Last Name', 'Student ID'],
        rows: []
      })
    ).toEqual([
      { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Last Name', mappedTo: 'lastName' },
      { columnIndex: 2, headerName: 'Student ID', mappedTo: 'studentId' }
    ]);
  });
});
