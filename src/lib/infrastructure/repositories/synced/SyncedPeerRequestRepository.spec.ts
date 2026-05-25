import { describe, expect, it, vi } from 'vitest';
import type { SyncService } from '$lib/application/ports';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { InMemoryPeerRequestRepository } from '$lib/infrastructure/repositories/inMemory';
import { SyncedPeerRequestRepository } from './SyncedPeerRequestRepository';

function createSyncService(enabled: boolean): SyncService {
  return {
    push: vi.fn(),
    pull: vi.fn(),
    sync: vi.fn(),
    getStatus: vi.fn(),
    onStatusChange: vi.fn(() => () => {}),
    setEnabled: vi.fn(),
    isEnabled: vi.fn(() => enabled),
    queueForSync: vi.fn(async () => {})
  } as unknown as SyncService;
}

describe('SyncedPeerRequestRepository', () => {
  it('queues saves and deletes for sync when enabled', async () => {
    const local = new InMemoryPeerRequestRepository();
    const sync = createSyncService(true);
    const repo = new SyncedPeerRequestRepository(local, sync);
    const entry = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Alex Rivera'
    });

    await repo.save(entry);
    await repo.delete('request-1');

    expect(sync.queueForSync).toHaveBeenCalledWith('peerRequests', 'save', 'request-1');
    expect(sync.queueForSync).toHaveBeenCalledWith('peerRequests', 'delete', 'request-1');
  });

  it('queues each deleted entry when deleting by program', async () => {
    const local = new InMemoryPeerRequestRepository([
      createPeerRequestEntry({
        id: 'request-1',
        programId: 'program-1',
        requesterStudentId: 'student-1',
        rank: 1,
        rawText: 'Alex Rivera'
      }),
      createPeerRequestEntry({
        id: 'request-2',
        programId: 'program-1',
        requesterStudentId: 'student-2',
        rank: 2,
        rawText: 'Jamie Lee'
      })
    ]);
    const sync = createSyncService(true);
    const repo = new SyncedPeerRequestRepository(local, sync);

    await repo.deleteByProgramId('program-1');

    expect(sync.queueForSync).toHaveBeenCalledWith('peerRequests', 'delete', 'request-1');
    expect(sync.queueForSync).toHaveBeenCalledWith('peerRequests', 'delete', 'request-2');
    expect(await local.listByProgramId('program-1')).toEqual([]);
  });
});
