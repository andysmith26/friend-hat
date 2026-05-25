import { describe, expect, it } from 'vitest';
import {
  appendPeerRequestResolutionHistory,
  createPeerRequestEntry,
  getPeerRequestSatisfactionStatus,
  isIgnoredPeerRequestText,
  normalizePeerRequestText
} from './peerRequest';

describe('normalizePeerRequestText', () => {
  it('normalizes casing and repeated separators', () => {
    expect(normalizePeerRequestText('  Alex,   Rivera  ')).toBe('alex rivera');
  });
});

describe('isIgnoredPeerRequestText', () => {
  it('recognizes common placeholder values', () => {
    expect(isIgnoredPeerRequestText('N/A')).toBe(true);
    expect(isIgnoredPeerRequestText('No Preference')).toBe(true);
  });

  it('keeps actual names', () => {
    expect(isIgnoredPeerRequestText('Alex Rivera')).toBe(false);
  });
});

describe('createPeerRequestEntry', () => {
  it('creates an unresolved entry with normalized text by default', () => {
    const entry = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: ' Alex Rivera '
    });

    expect(entry).toEqual({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: ' Alex Rivera ',
      normalizedText: 'alex rivera',
      status: 'UNRESOLVED',
      resolvedStudentId: undefined,
      resolutionSource: 'NONE',
      initialResolvedStudentId: undefined,
      initialResolutionSource: undefined,
      resolutionHistory: [],
      candidates: []
    });
  });

  it('clones candidate reasons when provided', () => {
    const entry = createPeerRequestEntry({
      id: 'request-2',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 2,
      rawText: 'Jamie',
      candidates: [{ studentId: 'student-2', score: 0.9, reasons: ['exact first name'] }]
    });

    entry.candidates[0].reasons.push('mutated');

    expect(entry.candidates[0].reasons).toEqual(['exact first name', 'mutated']);
  });

  it('rejects non-positive ranks', () => {
    expect(() =>
      createPeerRequestEntry({
        id: 'request-2b',
        programId: 'program-1',
        requesterStudentId: 'student-1',
        rank: 0,
        rawText: 'Jamie'
      })
    ).toThrow('Peer request rank must be a positive integer');
  });

  it('appends audit history entries without duplicating identical consecutive states', () => {
    const request = createPeerRequestEntry({
      id: 'request-3',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Jamie'
    });

    const first = appendPeerRequestResolutionHistory({
      request,
      resolvedStudentId: 'student-2',
      resolutionSource: 'MANUAL',
      occurredAt: '2026-05-25T12:00:00.000Z'
    });
    const second = appendPeerRequestResolutionHistory({
      request: { ...request, resolutionHistory: first },
      resolvedStudentId: 'student-2',
      resolutionSource: 'MANUAL',
      occurredAt: '2026-05-25T12:05:00.000Z'
    });

    expect(first).toEqual([
      {
        action: 'MANUALLY_SET',
        resolvedStudentId: 'student-2',
        resolutionSource: 'MANUAL',
        occurredAt: '2026-05-25T12:00:00.000Z'
      }
    ]);
    expect(second).toEqual(first);
  });
});

describe('getPeerRequestSatisfactionStatus', () => {
  const confirmedRequest = createPeerRequestEntry({
    id: 'request-1',
    programId: 'program-1',
    requesterStudentId: 'student-1',
    rank: 1,
    rawText: 'Alex Rivera',
    resolvedStudentId: 'student-2',
    status: 'CONFIRMED',
    resolutionSource: 'AUTO'
  });

  it('returns unresolved for unresolved requests', () => {
    const unresolved = createPeerRequestEntry({
      id: 'request-2',
      programId: 'program-1',
      requesterStudentId: 'student-1',
      rank: 1,
      rawText: 'Jamie'
    });

    expect(
      getPeerRequestSatisfactionStatus({
        request: unresolved,
        requesterGroupId: 'group-a',
        resolvedStudentGroupId: 'group-a',
        resolvedStudentExists: true
      })
    ).toBe('UNRESOLVED');
  });

  it('returns stale when the resolved student no longer exists', () => {
    expect(
      getPeerRequestSatisfactionStatus({
        request: confirmedRequest,
        requesterGroupId: 'group-a',
        resolvedStudentGroupId: null,
        resolvedStudentExists: false
      })
    ).toBe('STALE');
  });

  it('returns pending when group assignments are not yet available', () => {
    expect(
      getPeerRequestSatisfactionStatus({
        request: confirmedRequest,
        requesterGroupId: null,
        resolvedStudentGroupId: 'group-a',
        resolvedStudentExists: true
      })
    ).toBe('PENDING');
  });

  it('returns satisfied when both students share a group', () => {
    expect(
      getPeerRequestSatisfactionStatus({
        request: confirmedRequest,
        requesterGroupId: 'group-a',
        resolvedStudentGroupId: 'group-a',
        resolvedStudentExists: true
      })
    ).toBe('SATISFIED');
  });

  it('returns unsatisfied when students are in different groups', () => {
    expect(
      getPeerRequestSatisfactionStatus({
        request: confirmedRequest,
        requesterGroupId: 'group-a',
        resolvedStudentGroupId: 'group-b',
        resolvedStudentExists: true
      })
    ).toBe('UNSATISFIED');
  });
});
