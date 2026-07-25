import { describe, expect, it } from 'vitest';
import { parseBackupFile } from './backupRestore';

describe('parseBackupFile', () => {
  it('includes peer requests in the restore summary', () => {
    const result = parseBackupFile(
      JSON.stringify({
        version: 1,
        dbVersion: 8,
        exportedAt: '2026-07-24T12:00:00.000Z',
        stores: {
          peerRequests: [{ id: 'request-1' }, { id: 'request-2' }]
        }
      })
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.summary.peerRequests).toBe(2);
  });
});
