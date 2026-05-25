import { describe, expect, it } from 'vitest';
import { createStudent } from '$lib/domain';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { matchPeerRequests } from './matchPeerRequests';

describe('matchPeerRequests', () => {
  const students = [
    createStudent({ id: 'alice', firstName: 'Alice', lastName: 'Smith' }),
    createStudent({ id: 'bob-1', firstName: 'Bob', lastName: 'Jones' }),
    createStudent({ id: 'bob-2', firstName: 'Bob', lastName: 'Ray' }),
    createStudent({ id: 'cara', firstName: 'Cara', lastName: 'Lopez' }),
    createStudent({ id: 'bob-3', firstName: 'Bob', lastName: 'Stone' })
  ];

  it('puts unique exact full-name matches into ready-to-confirm without auto-confirming them', () => {
    const request = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Bob Jones'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.readyToConfirm).toHaveLength(1);
    expect(result.readyToConfirm[0].bestCandidate).toMatchObject({ studentId: 'bob-1' });
    expect(result.updatedRequests[0]).toMatchObject({
      status: 'AUTO_MATCHED_PENDING_CONFIRMATION',
      resolutionSource: 'NONE',
      resolvedStudentId: undefined
    });
  });

  it('sends ambiguous first-name matches to needs review and caps candidates at three', () => {
    const request = createPeerRequestEntry({
      id: 'request-2',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Bob'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].candidates).toHaveLength(3);
    expect(result.updatedRequests[0].status).toBe('UNRESOLVED');
  });

  it('puts unmatched requests into no-match', () => {
    const request = createPeerRequestEntry({
      id: 'request-3',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Zelda Moon'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.noMatch).toHaveLength(1);
    expect(result.updatedRequests[0].candidates).toEqual([]);
  });

  it('marks self-matches as invalid', () => {
    const request = createPeerRequestEntry({
      id: 'request-4',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Alice Smith'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].warning).toContain('requester');
    expect(result.updatedRequests[0].status).toBe('UNRESOLVED');
  });
});
