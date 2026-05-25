import { describe, expect, it } from 'vitest';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { InMemoryPeerRequestRepository } from './InMemoryPeerRequestRepository';

describe('InMemoryPeerRequestRepository', () => {
  it('stores and retrieves cloned peer request entries', async () => {
    const repo = new InMemoryPeerRequestRepository();
    const entry = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Alex Rivera',
      candidates: [{ studentId: 'student-2', score: 0.95, reasons: ['exact full name'] }]
    });

    await repo.save(entry);

    const stored = await repo.getById('request-1');
    expect(stored).not.toBeNull();
    expect(stored).toEqual(entry);

    stored?.candidates[0].reasons.push('mutated');
    const reloaded = await repo.getById('request-1');
    expect(reloaded?.candidates[0].reasons).toEqual(['exact full name']);
  });

  it('supports program and requester queries plus bulk deletion', async () => {
    const first = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Alex Rivera'
    });
    const second = createPeerRequestEntry({
      id: 'request-2',
      programId: 'program-1',
      requesterStudentId: 'student-2',
      rank: 2,
      rawText: 'Jamie Lee'
    });
    const third = createPeerRequestEntry({
      id: 'request-3',
      programId: 'program-2',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Taylor Kim'
    });
    const repo = new InMemoryPeerRequestRepository([first, second, third]);

    expect(await repo.listByProgramId('program-1')).toHaveLength(2);
    expect(await repo.listByRequesterStudentId('student-1')).toHaveLength(2);

    await repo.deleteByProgramId('program-1');

    expect(await repo.listByProgramId('program-1')).toEqual([]);
    expect(await repo.getById('request-3')).toEqual(third);
  });
});
