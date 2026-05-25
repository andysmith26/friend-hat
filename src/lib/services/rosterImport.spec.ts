import { describe, expect, it } from 'vitest';

import { parseRosterFromPaste } from './rosterImport';

describe('parseRosterFromPaste', () => {
  it('parses tab-separated First, Last, ID rows without a header', () => {
    const result = parseRosterFromPaste(['Alice\tAnderson\tA-100', 'Bob\tBrown\tB-200'].join('\n'));

    expect(result.studentOrder).toEqual(['a-100', 'b-200']);
    expect(result.studentsById['a-100']).toMatchObject({
      id: 'a-100',
      firstName: 'Alice',
      lastName: 'Anderson',
      meta: { sourceStudentId: 'A-100' }
    });
    expect(result.studentsById['b-200']).toMatchObject({
      id: 'b-200',
      firstName: 'Bob',
      lastName: 'Brown',
      meta: { sourceStudentId: 'B-200' }
    });
  });
});
