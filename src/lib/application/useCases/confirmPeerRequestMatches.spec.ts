import { describe, expect, it } from 'vitest';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { confirmPeerRequestMatches } from './confirmPeerRequestMatches';

describe('confirmPeerRequestMatches', () => {
  it('confirms the top suggested match', () => {
    const request = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'requester-1',
      rank: 1,
      rawText: 'Bob Jones',
      status: 'AUTO_MATCHED_PENDING_CONFIRMATION',
      candidates: [{ studentId: 'student-2', score: 100, reasons: ['Exact full name match'] }]
    });

    const result = confirmPeerRequestMatches({
      requests: [request],
      decisions: [{ requestId: 'request-1', action: 'CONFIRM_SUGGESTED' }]
    });

    expect('updatedRequests' in result).toBe(true);
    if ('updatedRequests' in result) {
      expect(result.updatedRequests[0]).toMatchObject({
        status: 'CONFIRMED',
        resolutionSource: 'AUTO',
        resolvedStudentId: 'student-2'
      });
    }
  });

  it('allows manual resolution', () => {
    const request = createPeerRequestEntry({
      id: 'request-2',
      programId: 'program-1',
      requesterStudentId: 'requester-1',
      rank: 1,
      rawText: 'Someone'
    });

    const result = confirmPeerRequestMatches({
      requests: [request],
      decisions: [{ requestId: 'request-2', action: 'SET_MANUAL', studentId: 'student-9' }]
    });

    expect('updatedRequests' in result).toBe(true);
    if ('updatedRequests' in result) {
      expect(result.updatedRequests[0]).toMatchObject({
        status: 'MANUALLY_SET',
        resolutionSource: 'MANUAL',
        resolvedStudentId: 'student-9'
      });
    }
  });

  it('allows leaving a request unresolved', () => {
    const request = createPeerRequestEntry({
      id: 'request-3',
      programId: 'program-1',
      requesterStudentId: 'requester-1',
      rank: 1,
      rawText: 'Someone',
      status: 'MANUALLY_SET',
      resolvedStudentId: 'student-4',
      resolutionSource: 'MANUAL'
    });

    const result = confirmPeerRequestMatches({
      requests: [request],
      decisions: [{ requestId: 'request-3', action: 'LEAVE_UNRESOLVED' }]
    });

    expect('updatedRequests' in result).toBe(true);
    if ('updatedRequests' in result) {
      expect(result.updatedRequests[0]).toMatchObject({
        status: 'UNRESOLVED',
        resolutionSource: 'NONE',
        resolvedStudentId: undefined
      });
    }
  });

  it('rejects invalid manual self-selection', () => {
    const request = createPeerRequestEntry({
      id: 'request-4',
      programId: 'program-1',
      requesterStudentId: 'requester-1',
      rank: 1,
      rawText: 'Self'
    });

    const result = confirmPeerRequestMatches({
      requests: [request],
      decisions: [{ requestId: 'request-4', action: 'SET_MANUAL', studentId: 'requester-1' }]
    });

    expect(result).toEqual({
      type: 'INVALID_MANUAL_SELECTION',
      requestId: 'request-4',
      message: 'requester cannot be selected as the resolved student'
    });
  });
});
