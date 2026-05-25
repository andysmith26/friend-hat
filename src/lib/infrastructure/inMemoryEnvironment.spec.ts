import { describe, expect, it } from 'vitest';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { createInMemoryEnvironment } from './inMemoryEnvironment';

describe('createInMemoryEnvironment', () => {
  it('wires peerRequestRepo centrally and seeds it when provided', async () => {
    const seededEntry = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Alex Rivera'
    });

    const env = createInMemoryEnvironment({
      peerRequests: [seededEntry]
    });

    expect(env.peerRequestRepo).toBeDefined();
    expect(await env.peerRequestRepo.getById('request-1')).toEqual(seededEntry);
  });
});
