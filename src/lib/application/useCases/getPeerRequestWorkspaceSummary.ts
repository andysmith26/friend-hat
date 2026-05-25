import { getStudentDisplayName, type Group, type Student } from '$lib/domain';
import {
  getPeerRequestSatisfactionStatus,
  type PeerRequestResolutionAuditEntry,
  type PeerRequestEntry,
  type PeerRequestResolutionStatus,
  type PeerRequestSatisfactionStatus
} from '$lib/domain/peerRequest';

export interface PeerRequestWorkspaceAuditItem {
  label: string;
  resolvedStudentDisplayName?: string;
}

export interface PeerRequestWorkspaceItem {
  requestId: string;
  rank: 1 | 2 | 3 | 4 | 5;
  rawText: string;
  resolvedStudentId?: string;
  resolvedStudentDisplayName?: string;
  initialResolvedStudentId?: string;
  initialResolvedStudentDisplayName?: string;
  initialResolutionSource?: 'AUTO' | 'MANUAL';
  hasChangedSinceInitial: boolean;
  auditItems: PeerRequestWorkspaceAuditItem[];
  resolutionStatus: PeerRequestResolutionStatus;
  satisfactionStatus: PeerRequestSatisfactionStatus;
}

function toAuditLabel(entry: PeerRequestResolutionAuditEntry): string {
  if (entry.action === 'AUTO_MATCHED') return 'Initially matched';
  if (entry.action === 'MANUALLY_SET') return 'Assigned';
  return 'Cleared';
}

function buildLegacyAuditItems(input: {
  initialResolvedStudentDisplayName?: string;
  initialResolutionSource?: 'AUTO' | 'MANUAL';
  resolvedStudentDisplayName?: string;
  resolvedStudentId?: string;
  hasChangedSinceInitial: boolean;
}): PeerRequestWorkspaceAuditItem[] {
  const items: PeerRequestWorkspaceAuditItem[] = [];

  if (input.initialResolvedStudentDisplayName) {
    items.push({
      label: input.initialResolutionSource === 'AUTO' ? 'Initially matched' : 'Assigned',
      resolvedStudentDisplayName: input.initialResolvedStudentDisplayName
    });
  }

  if (
    input.hasChangedSinceInitial &&
    (input.resolvedStudentDisplayName || !input.resolvedStudentId)
  ) {
    items.push({
      label: input.resolvedStudentDisplayName ? 'Assigned' : 'Cleared',
      resolvedStudentDisplayName: input.resolvedStudentDisplayName
    });
  }

  return items;
}

export interface StudentPeerRequestWorkspaceSummary {
  studentId: string;
  requestCount: number;
  confirmedRequestCount: number;
  satisfiedCount: number;
  unsatisfiedCount: number;
  unresolvedCount: number;
  staleCount: number;
  requestedStudentIds: string[];
  items: PeerRequestWorkspaceItem[];
}

export interface GetPeerRequestWorkspaceSummaryInput {
  requests: PeerRequestEntry[];
  students: Student[];
  groups: Group[];
}

export interface GetPeerRequestWorkspaceSummaryOutput {
  byStudentId: Map<string, StudentPeerRequestWorkspaceSummary>;
}

function createEmptySummary(studentId: string): StudentPeerRequestWorkspaceSummary {
  return {
    studentId,
    requestCount: 0,
    confirmedRequestCount: 0,
    satisfiedCount: 0,
    unsatisfiedCount: 0,
    unresolvedCount: 0,
    staleCount: 0,
    requestedStudentIds: [],
    items: []
  };
}

function getWorkspaceSatisfactionStatus(input: {
  request: PeerRequestEntry;
  requesterGroupId?: string | null;
  resolvedStudentGroupId?: string | null;
  resolvedStudentExists: boolean;
}): PeerRequestSatisfactionStatus {
  if (input.request.status === 'AUTO_MATCHED_PENDING_CONFIRMATION') {
    return 'UNRESOLVED';
  }

  return getPeerRequestSatisfactionStatus(input);
}

export function getPeerRequestWorkspaceSummary(
  input: GetPeerRequestWorkspaceSummaryInput
): GetPeerRequestWorkspaceSummaryOutput {
  const studentById = new Map(input.students.map((student) => [student.id, student]));
  const groupIdByStudentId = new Map<string, string>();

  for (const group of input.groups) {
    for (const studentId of group.memberIds) {
      groupIdByStudentId.set(studentId, group.id);
    }
  }

  const byStudentId = new Map<string, StudentPeerRequestWorkspaceSummary>();
  const requestedPeerIdsByStudentId = new Map<string, Set<string>>();

  for (const request of input.requests) {
    const requesterId = request.requesterStudentId;
    const summary = byStudentId.get(requesterId) ?? createEmptySummary(requesterId);
    const resolvedStudent = request.resolvedStudentId
      ? (studentById.get(request.resolvedStudentId) ?? null)
      : null;
    const satisfactionStatus = getWorkspaceSatisfactionStatus({
      request,
      requesterGroupId: groupIdByStudentId.get(requesterId) ?? null,
      resolvedStudentGroupId: request.resolvedStudentId
        ? (groupIdByStudentId.get(request.resolvedStudentId) ?? null)
        : null,
      resolvedStudentExists: request.resolvedStudentId
        ? studentById.has(request.resolvedStudentId)
        : false
    });
    const initialResolvedStudentId =
      request.initialResolvedStudentId ??
      (request.resolvedStudentId && request.resolutionSource !== 'NONE'
        ? request.resolvedStudentId
        : undefined);
    const initialResolutionSource =
      request.initialResolutionSource ??
      (request.resolvedStudentId && request.resolutionSource !== 'NONE'
        ? request.resolutionSource
        : undefined);
    const initialResolvedStudent = initialResolvedStudentId
      ? (studentById.get(initialResolvedStudentId) ?? null)
      : null;
    const hasChangedSinceInitial =
      Boolean(initialResolvedStudentId) &&
      (request.resolvedStudentId !== initialResolvedStudentId ||
        request.resolutionSource !== initialResolutionSource);
    const auditItems =
      request.resolutionHistory.length > 0
        ? request.resolutionHistory.map((entry) => ({
            label: toAuditLabel(entry),
            resolvedStudentDisplayName: entry.resolvedStudentId
              ? getStudentDisplayName(
                  studentById.get(entry.resolvedStudentId) ?? {
                    id: entry.resolvedStudentId,
                    firstName: entry.resolvedStudentId
                  }
                )
              : undefined
          }))
        : buildLegacyAuditItems({
            initialResolvedStudentDisplayName: initialResolvedStudent
              ? getStudentDisplayName(initialResolvedStudent)
              : undefined,
            initialResolutionSource,
            resolvedStudentDisplayName: resolvedStudent
              ? getStudentDisplayName(resolvedStudent)
              : undefined,
            resolvedStudentId: request.resolvedStudentId,
            hasChangedSinceInitial
          });

    const item: PeerRequestWorkspaceItem = {
      requestId: request.id,
      rank: request.rank,
      rawText: request.rawText,
      resolvedStudentId: request.resolvedStudentId,
      resolvedStudentDisplayName: resolvedStudent
        ? getStudentDisplayName(resolvedStudent)
        : undefined,
      initialResolvedStudentId,
      initialResolvedStudentDisplayName: initialResolvedStudent
        ? getStudentDisplayName(initialResolvedStudent)
        : undefined,
      initialResolutionSource,
      hasChangedSinceInitial,
      auditItems,
      resolutionStatus: request.status,
      satisfactionStatus
    };

    summary.items.push(item);
    summary.requestCount += 1;

    if (resolvedStudent && (request.status === 'CONFIRMED' || request.status === 'MANUALLY_SET')) {
      summary.confirmedRequestCount += 1;
    }

    if (satisfactionStatus === 'SATISFIED') {
      summary.satisfiedCount += 1;
    } else if (satisfactionStatus === 'UNSATISFIED') {
      summary.unsatisfiedCount += 1;
    } else if (satisfactionStatus === 'STALE') {
      summary.staleCount += 1;
    } else if (satisfactionStatus === 'UNRESOLVED' || satisfactionStatus === 'PENDING') {
      summary.unresolvedCount += 1;
    }

    if (request.resolvedStudentId && studentById.has(request.resolvedStudentId)) {
      let requestedPeerIds = requestedPeerIdsByStudentId.get(requesterId);
      if (!requestedPeerIds) {
        requestedPeerIds = new Set<string>();
        requestedPeerIdsByStudentId.set(requesterId, requestedPeerIds);
      }
      requestedPeerIds.add(request.resolvedStudentId);
    }

    byStudentId.set(requesterId, summary);
  }

  for (const [studentId, summary] of byStudentId) {
    summary.items.sort((left, right) => left.rank - right.rank);
    summary.requestedStudentIds = [...(requestedPeerIdsByStudentId.get(studentId) ?? [])];
  }

  return { byStudentId };
}
