import { describe, expect, it } from 'vitest';
import { createGroup, createStudent, createPeerRequestEntry } from '$lib/domain';
import { getPeerRequestWorkspaceSummary } from './getPeerRequestWorkspaceSummary';

describe('getPeerRequestWorkspaceSummary', () => {
  const students = [
    createStudent({ id: 'student-a', firstName: 'Alex', lastName: 'Avery' }),
    createStudent({ id: 'student-b', firstName: 'Blake', lastName: 'Benson' }),
    createStudent({ id: 'student-c', firstName: 'Casey', lastName: 'Cole' })
  ];

  it('derives satisfied requests', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-1',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Blake Benson',
          status: 'MANUALLY_SET',
          resolvedStudentId: 'student-b',
          resolutionSource: 'MANUAL'
        })
      ],
      students,
      groups: [
        createGroup({ id: 'group-1', name: 'Group 1', memberIds: ['student-a', 'student-b'] })
      ]
    });

    expect(result.byStudentId.get('student-a')).toMatchObject({
      requestCount: 1,
      confirmedRequestCount: 1,
      satisfiedCount: 1,
      unsatisfiedCount: 0,
      unresolvedCount: 0,
      staleCount: 0,
      requestedStudentIds: ['student-b']
    });
    expect(result.byStudentId.get('student-a')?.items[0]).toMatchObject({
      auditItems: [{ label: 'Assigned', resolvedStudentDisplayName: 'Blake Benson' }],
      initialResolvedStudentDisplayName: 'Blake Benson',
      initialResolutionSource: 'MANUAL',
      hasChangedSinceInitial: false,
      resolvedStudentDisplayName: 'Blake Benson',
      satisfactionStatus: 'SATISFIED'
    });
  });

  it('derives unsatisfied requests', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-2',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Casey Cole',
          status: 'CONFIRMED',
          resolvedStudentId: 'student-c',
          resolutionSource: 'AUTO'
        })
      ],
      students,
      groups: [
        createGroup({ id: 'group-1', name: 'Group 1', memberIds: ['student-a'] }),
        createGroup({ id: 'group-2', name: 'Group 2', memberIds: ['student-c'] })
      ]
    });

    expect(result.byStudentId.get('student-a')).toMatchObject({
      requestCount: 1,
      confirmedRequestCount: 1,
      satisfiedCount: 0,
      unsatisfiedCount: 1,
      unresolvedCount: 0,
      staleCount: 0,
      requestedStudentIds: ['student-c']
    });
    expect(result.byStudentId.get('student-a')?.items[0]?.satisfactionStatus).toBe('UNSATISFIED');
  });

  it('treats ungrouped but resolved requests as pending and counts them as unresolved', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-3',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Blake Benson',
          status: 'MANUALLY_SET',
          resolvedStudentId: 'student-b',
          resolutionSource: 'MANUAL'
        })
      ],
      students,
      groups: []
    });

    expect(result.byStudentId.get('student-a')).toMatchObject({
      confirmedRequestCount: 1,
      unresolvedCount: 1,
      requestedStudentIds: ['student-b']
    });
    expect(result.byStudentId.get('student-a')?.items[0]?.satisfactionStatus).toBe('PENDING');
  });

  it('keeps unresolved requests and unresolved pending-confirmation requests as unresolved', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-4',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Unknown Person'
        }),
        createPeerRequestEntry({
          id: 'request-5',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 2,
          rawText: 'Blake Benson',
          status: 'AUTO_MATCHED_PENDING_CONFIRMATION',
          resolvedStudentId: 'student-b',
          resolutionSource: 'AUTO'
        })
      ],
      students,
      groups: [
        createGroup({ id: 'group-1', name: 'Group 1', memberIds: ['student-a', 'student-b'] })
      ]
    });

    expect(result.byStudentId.get('student-a')).toMatchObject({
      requestCount: 2,
      confirmedRequestCount: 0,
      unresolvedCount: 2,
      requestedStudentIds: ['student-b']
    });
    expect(
      result.byStudentId.get('student-a')?.items.map((item) => item.satisfactionStatus)
    ).toEqual(['UNRESOLVED', 'UNRESOLVED']);
  });

  it('marks missing resolved students as stale', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-6',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Former Student',
          status: 'MANUALLY_SET',
          resolvedStudentId: 'missing-student',
          resolutionSource: 'MANUAL'
        })
      ],
      students,
      groups: [createGroup({ id: 'group-1', name: 'Group 1', memberIds: ['student-a'] })]
    });

    expect(result.byStudentId.get('student-a')).toMatchObject({
      confirmedRequestCount: 0,
      staleCount: 1,
      requestedStudentIds: []
    });
    expect(result.byStudentId.get('student-a')?.items[0]).toMatchObject({
      resolvedStudentDisplayName: undefined,
      satisfactionStatus: 'STALE'
    });
  });

  it('preserves duplicate items while deduping requested peer ids', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-7',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Blake Benson',
          status: 'CONFIRMED',
          resolvedStudentId: 'student-b',
          resolutionSource: 'AUTO'
        }),
        createPeerRequestEntry({
          id: 'request-8',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 2,
          rawText: 'Blake Benson',
          status: 'MANUALLY_SET',
          resolvedStudentId: 'student-b',
          resolutionSource: 'MANUAL'
        })
      ],
      students,
      groups: [
        createGroup({ id: 'group-1', name: 'Group 1', memberIds: ['student-a', 'student-b'] })
      ]
    });

    expect(result.byStudentId.get('student-a')?.items).toHaveLength(2);
    expect(result.byStudentId.get('student-a')?.confirmedRequestCount).toBe(2);
    expect(result.byStudentId.get('student-a')?.requestedStudentIds).toEqual(['student-b']);
  });

  it('exposes the initial mapping snapshot when a request is reassigned later', () => {
    const result = getPeerRequestWorkspaceSummary({
      requests: [
        createPeerRequestEntry({
          id: 'request-9',
          programId: 'program-1',
          requesterStudentId: 'student-a',
          rank: 1,
          rawText: 'Blake Benson',
          status: 'MANUALLY_SET',
          resolvedStudentId: 'student-c',
          resolutionSource: 'MANUAL',
          initialResolvedStudentId: 'student-b',
          initialResolutionSource: 'AUTO'
        })
      ],
      students,
      groups: [
        createGroup({ id: 'group-1', name: 'Group 1', memberIds: ['student-a'] }),
        createGroup({ id: 'group-2', name: 'Group 2', memberIds: ['student-c'] })
      ]
    });

    expect(result.byStudentId.get('student-a')?.items[0]).toMatchObject({
      resolvedStudentDisplayName: 'Casey Cole',
      initialResolvedStudentDisplayName: 'Blake Benson',
      initialResolutionSource: 'AUTO',
      hasChangedSinceInitial: true,
      auditItems: [
        { label: 'Initially matched', resolvedStudentDisplayName: 'Blake Benson' },
        { label: 'Assigned', resolvedStudentDisplayName: 'Casey Cole' }
      ]
    });
  });
});
