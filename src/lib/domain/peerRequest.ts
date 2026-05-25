/**
 * Peer request domain model.
 *
 * Peer requests are imported from free-text columns and kept separate from both
 * Student and Preference so their lifecycle can be reviewed and resolved
 * independently.
 */

export type PeerRequestRank = 1 | 2 | 3 | 4 | 5;

export type PeerRequestResolutionStatus =
  | 'UNRESOLVED'
  | 'AUTO_MATCHED_PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'MANUALLY_SET';

export type PeerRequestResolutionSource = 'NONE' | 'AUTO' | 'MANUAL';

export type PeerRequestSatisfactionStatus =
  | 'SATISFIED'
  | 'UNSATISFIED'
  | 'PENDING'
  | 'UNRESOLVED'
  | 'STALE';

export interface PeerRequestCandidate {
  studentId: string;
  score: number;
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
    candidates: (input.candidates ?? []).map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons]
    }))
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
