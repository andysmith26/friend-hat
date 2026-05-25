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
        resolvedStudentId: 'student-2',
        initialResolvedStudentId: 'student-2',
        initialResolutionSource: 'AUTO'
      });
      expect(result.updatedRequests[0].resolutionHistory).toEqual([
        expect.objectContaining({
          action: 'AUTO_MATCHED',
          resolvedStudentId: 'student-2',
          resolutionSource: 'AUTO',
          occurredAt: expect.any(String)
        })
      ]);
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
        resolvedStudentId: 'student-9',
        initialResolvedStudentId: 'student-9',
        initialResolutionSource: 'MANUAL'
      });
      expect(result.updatedRequests[0].resolutionHistory).toEqual([
        expect.objectContaining({
          action: 'MANUALLY_SET',
          resolvedStudentId: 'student-9',
          resolutionSource: 'MANUAL',
          occurredAt: expect.any(String)
        })
      ]);
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
        resolvedStudentId: undefined,
        initialResolvedStudentId: 'student-4',
        initialResolutionSource: 'MANUAL'
      });
      expect(result.updatedRequests[0].resolutionHistory).toEqual([
        expect.objectContaining({
          action: 'CLEARED',
          resolvedStudentId: undefined,
          resolutionSource: 'NONE',
          occurredAt: expect.any(String)
        })
      ]);
    }
  });

  it('preserves the original snapshot when a later manual choice changes the target', () => {
    const request = createPeerRequestEntry({
      id: 'request-5',
      programId: 'program-1',
      requesterStudentId: 'requester-1',
      rank: 1,
      rawText: 'First Choice',
      status: 'CONFIRMED',
      resolvedStudentId: 'student-2',
      resolutionSource: 'AUTO',
      initialResolvedStudentId: 'student-2',
      initialResolutionSource: 'AUTO'
    });

    const result = confirmPeerRequestMatches({
      requests: [request],
      decisions: [{ requestId: 'request-5', action: 'SET_MANUAL', studentId: 'student-3' }]
    });

    expect('updatedRequests' in result).toBe(true);
    if ('updatedRequests' in result) {
      expect(result.updatedRequests[0]).toMatchObject({
        resolvedStudentId: 'student-3',
        resolutionSource: 'MANUAL',
        initialResolvedStudentId: 'student-2',
        initialResolutionSource: 'AUTO'
      });
      expect(result.updatedRequests[0].resolutionHistory).toEqual([
        expect.objectContaining({
          action: 'MANUALLY_SET',
          resolvedStudentId: 'student-3',
          resolutionSource: 'MANUAL',
          occurredAt: expect.any(String)
        })
      ]);
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
