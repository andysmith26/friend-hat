/**
 * Peer request domain model.
 *
 * Peer requests are imported from free-text columns and kept separate from both
 * Student and Preference so their lifecycle can be reviewed and resolved
 * independently.
 */

export type PeerRequestRank = number;

export type PeerRequestResolutionStatus =
  | 'UNRESOLVED'
  | 'AUTO_MATCHED_PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'MANUALLY_SET';

export type PeerRequestResolutionSource = 'NONE' | 'AUTO' | 'MANUAL';

export type PeerRequestResolutionAuditAction = 'AUTO_MATCHED' | 'MANUALLY_SET' | 'CLEARED';

export interface PeerRequestResolutionAuditEntry {
  action: PeerRequestResolutionAuditAction;
  resolvedStudentId?: string;
  resolutionSource: PeerRequestResolutionSource;
  occurredAt?: string;
}

export type PeerRequestSatisfactionStatus =
  | 'SATISFIED'
  | 'UNSATISFIED'
  | 'PENDING'
  | 'UNRESOLVED'
  | 'STALE';

export interface PeerRequestCandidate {
  studentId: string;
  /** Final ambiguity-calibrated confidence from 0 to 1. */
  score: number;
  /** Alias for `score` in new matching results. */
  confidence?: number;
  /** Raw best permutation similarity before ambiguity calibration. */
  baseScore?: number;
  reasons: string[];
}

export interface PeerRequestEntry {
  id: string;
  programId: string;
  requesterStudentId: string;
  rank: PeerRequestRank;
  rawText: string;
  normalizedText: string;
  status: PeerRequestResolutionStatus;
  resolvedStudentId?: string;
  resolutionSource: PeerRequestResolutionSource;
  initialResolvedStudentId?: string;
  initialResolutionSource?: Exclude<PeerRequestResolutionSource, 'NONE'>;
  resolutionHistory: PeerRequestResolutionAuditEntry[];
  candidates: PeerRequestCandidate[];
}

const IGNORED_PEER_REQUEST_TEXT = new Set([
  '',
  '-',
  '--',
  'n a',
  'na',
  'none',
  'no one',
  'no preference',
  'no preferences',
  'no pref',
  'skip'
]);

export function createPeerRequestEntry(input: {
  id: string;
  programId: string;
  requesterStudentId: string;
  rank: PeerRequestRank;
  rawText: string;
  normalizedText?: string;
  status?: PeerRequestResolutionStatus;
  resolvedStudentId?: string;
  resolutionSource?: PeerRequestResolutionSource;
  initialResolvedStudentId?: string;
  initialResolutionSource?: Exclude<PeerRequestResolutionSource, 'NONE'>;
  resolutionHistory?: PeerRequestResolutionAuditEntry[];
  candidates?: PeerRequestCandidate[];
}): PeerRequestEntry {
  if (!input.id.trim()) {
    throw new Error('Peer request entry id is required');
  }
  if (!input.programId.trim()) {
    throw new Error('Peer request entry programId is required');
  }
  if (!input.requesterStudentId.trim()) {
    throw new Error('Peer request requesterStudentId is required');
  }
  if (!input.rawText.trim()) {
    throw new Error('Peer request rawText is required');
  }
  if (!Number.isInteger(input.rank) || input.rank < 1) {
    throw new Error('Peer request rank must be a positive integer');
  }

  return {
    id: input.id,
    programId: input.programId,
    requesterStudentId: input.requesterStudentId,
    rank: input.rank,
    rawText: input.rawText,
    normalizedText: input.normalizedText ?? normalizePeerRequestText(input.rawText),
    status: input.status ?? 'UNRESOLVED',
    resolvedStudentId: input.resolvedStudentId,
    resolutionSource: input.resolutionSource ?? 'NONE',
    initialResolvedStudentId: input.initialResolvedStudentId,
    initialResolutionSource: input.initialResolutionSource,
    resolutionHistory: (input.resolutionHistory ?? []).map((entry) => ({ ...entry })),
    candidates: (input.candidates ?? []).map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons]
    }))
  };
}

export function appendPeerRequestResolutionHistory(input: {
  request: PeerRequestEntry;
  resolvedStudentId?: string;
  resolutionSource: PeerRequestResolutionSource;
  occurredAt?: string;
}): PeerRequestResolutionAuditEntry[] {
  const { request, resolvedStudentId, resolutionSource, occurredAt } = input;
  const nextEntry: PeerRequestResolutionAuditEntry = {
    action: resolvedStudentId
      ? resolutionSource === 'AUTO'
        ? 'AUTO_MATCHED'
        : 'MANUALLY_SET'
      : 'CLEARED',
    resolvedStudentId,
    resolutionSource,
    occurredAt: occurredAt ?? new Date().toISOString()
  };

  const previous = request.resolutionHistory[request.resolutionHistory.length - 1];
  if (
    previous &&
    previous.action === nextEntry.action &&
    previous.resolvedStudentId === nextEntry.resolvedStudentId &&
    previous.resolutionSource === nextEntry.resolutionSource
  ) {
    return request.resolutionHistory.map((entry) => ({ ...entry }));
  }

  return [...request.resolutionHistory.map((entry) => ({ ...entry })), nextEntry];
}

export function captureInitialPeerRequestResolution(input: {
  request: PeerRequestEntry;
  resolvedStudentId?: string;
  resolutionSource: PeerRequestResolutionSource;
}): Pick<PeerRequestEntry, 'initialResolvedStudentId' | 'initialResolutionSource'> {
  const { request, resolvedStudentId, resolutionSource } = input;

  if (!resolvedStudentId || resolutionSource === 'NONE') {
    return {
      initialResolvedStudentId: request.initialResolvedStudentId,
      initialResolutionSource: request.initialResolutionSource
    };
  }

  return {
    initialResolvedStudentId: request.initialResolvedStudentId ?? resolvedStudentId,
    initialResolutionSource: request.initialResolutionSource ?? resolutionSource
  };
}

export function normalizePeerRequestText(rawText: string): string {
  return rawText
    .trim()
    .toLowerCase()
    .replace(/[\s,.;:!?()\[\]{}\\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isIgnoredPeerRequestText(rawText: string): boolean {
  return IGNORED_PEER_REQUEST_TEXT.has(normalizePeerRequestText(rawText));
}

export function getPeerRequestSatisfactionStatus(input: {
  request: PeerRequestEntry;
  requesterGroupId?: string | null;
  resolvedStudentGroupId?: string | null;
  resolvedStudentExists: boolean;
}): PeerRequestSatisfactionStatus {
  const { request, requesterGroupId, resolvedStudentGroupId, resolvedStudentExists } = input;

  if (request.status === 'UNRESOLVED' || !request.resolvedStudentId) {
    return 'UNRESOLVED';
  }

  if (!resolvedStudentExists) {
    return 'STALE';
  }

  if (!requesterGroupId || !resolvedStudentGroupId) {
    return 'PENDING';
  }

  return requesterGroupId === resolvedStudentGroupId ? 'SATISFIED' : 'UNSATISFIED';
}
