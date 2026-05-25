import type { Student } from '$lib/domain';
import {
  createPeerRequestEntry,
  normalizePeerRequestText,
  type PeerRequestCandidate,
  type PeerRequestEntry
} from '$lib/domain/peerRequest';

export type PeerRequestMatchBucket = 'READY_TO_CONFIRM' | 'NEEDS_REVIEW' | 'NO_MATCH' | 'INVALID';

export interface MatchedPeerRequest {
  request: PeerRequestEntry;
  bucket: PeerRequestMatchBucket;
  bestCandidate?: PeerRequestCandidate;
  candidates: PeerRequestCandidate[];
  warning?: string;
}

export interface MatchPeerRequestsInput {
  requests: PeerRequestEntry[];
  students: Student[];
}

export interface MatchPeerRequestsOutput {
  readyToConfirm: MatchedPeerRequest[];
  needsReview: MatchedPeerRequest[];
  noMatch: MatchedPeerRequest[];
  invalid: MatchedPeerRequest[];
  updatedRequests: PeerRequestEntry[];
}

const MAX_CANDIDATES = 3;
const MIN_PLAUSIBLE_SCORE = 50;

interface NormalizedStudentName {
  fullName: string;
  reversedFullName: string;
  firstName: string;
  lastName: string;
}

function getNormalizedStudentName(student: Student): NormalizedStudentName {
  const firstName = normalizePeerRequestText(student.firstName);
  const lastName = normalizePeerRequestText(student.lastName ?? '');
  const fullName = normalizePeerRequestText(`${student.firstName} ${student.lastName ?? ''}`);
  const reversedFullName = normalizePeerRequestText(
    `${student.lastName ?? ''} ${student.firstName}`
  );

  return {
    fullName,
    reversedFullName,
    firstName,
    lastName
  };
}

function scoreCandidate(requestText: string, student: Student): PeerRequestCandidate | null {
  const normalizedRequest = normalizePeerRequestText(requestText);
  if (!normalizedRequest) {
    return null;
  }

  const studentName = getNormalizedStudentName(student);
  let score = 0;
  const reasons: string[] = [];

  if (normalizedRequest === studentName.fullName) {
    return {
      studentId: student.id,
      score: 100,
      reasons: ['Exact full name match']
    };
  }

  if (normalizedRequest === studentName.reversedFullName && studentName.lastName) {
    return {
      studentId: student.id,
      score: 92,
      reasons: ['Exact full name match with reversed order']
    };
  }

  if (normalizedRequest === studentName.firstName) {
    score += 60;
    reasons.push('Exact first name match');
  }

  if (studentName.lastName && normalizedRequest === studentName.lastName) {
    score += 25;
    reasons.push('Exact last name match');
  }

  if (studentName.lastName && normalizedRequest.includes(studentName.lastName)) {
    score += 20;
    reasons.push('Request includes matching last name');
  }

  if (
    normalizedRequest.includes(studentName.firstName) &&
    normalizedRequest !== studentName.firstName
  ) {
    score += 20;
    reasons.push('Request includes matching first name');
  }

  if (studentName.lastName && normalizedRequest.startsWith(studentName.firstName.slice(0, 1))) {
    score += 5;
    reasons.push('Request shares first-name initial');
  }

  if (score === 0) {
    return null;
  }

  return {
    studentId: student.id,
    score: Math.min(score, 99),
    reasons
  };
}

function isSelfMatch(request: PeerRequestEntry, requester: Student | undefined): boolean {
  if (!requester) {
    return false;
  }

  const normalizedRequest = request.normalizedText || normalizePeerRequestText(request.rawText);
  const requesterName = getNormalizedStudentName(requester);

  return (
    normalizedRequest === requesterName.fullName ||
    normalizedRequest === requesterName.reversedFullName ||
    normalizedRequest === requesterName.firstName
  );
}

function toUpdatedRequest(
  request: PeerRequestEntry,
  candidates: PeerRequestCandidate[],
  bucket: PeerRequestMatchBucket
): PeerRequestEntry {
  return createPeerRequestEntry({
    ...request,
    normalizedText: request.normalizedText || normalizePeerRequestText(request.rawText),
    status: bucket === 'READY_TO_CONFIRM' ? 'AUTO_MATCHED_PENDING_CONFIRMATION' : 'UNRESOLVED',
    resolutionSource: 'NONE',
    resolvedStudentId: undefined,
    candidates
  });
}

export function matchPeerRequests(input: MatchPeerRequestsInput): MatchPeerRequestsOutput {
  const studentById = new Map(input.students.map((student) => [student.id, student]));
  const readyToConfirm: MatchedPeerRequest[] = [];
  const needsReview: MatchedPeerRequest[] = [];
  const noMatch: MatchedPeerRequest[] = [];
  const invalid: MatchedPeerRequest[] = [];
  const updatedRequests: PeerRequestEntry[] = [];

  for (const request of input.requests) {
    const requester = studentById.get(request.requesterStudentId);

    if (isSelfMatch(request, requester)) {
      const updatedRequest = toUpdatedRequest(request, [], 'INVALID');
      const matched: MatchedPeerRequest = {
        request: updatedRequest,
        bucket: 'INVALID',
        candidates: [],
        warning: 'Request appears to reference the requester and must be reviewed manually.'
      };
      invalid.push(matched);
      updatedRequests.push(updatedRequest);
      continue;
    }

    const candidates = input.students
      .filter((student) => student.id !== request.requesterStudentId)
      .map((student) => scoreCandidate(request.rawText, student))
      .filter((candidate): candidate is PeerRequestCandidate => candidate !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_CANDIDATES);

    const exactMatchCount = candidates.filter((candidate) => candidate.score === 100).length;
    const bestCandidate = candidates[0];

    let bucket: PeerRequestMatchBucket;
    let warning: string | undefined;

    if (!bestCandidate || bestCandidate.score < MIN_PLAUSIBLE_SCORE) {
      bucket = 'NO_MATCH';
    } else if (bestCandidate.score === 100 && exactMatchCount === 1) {
      bucket = 'READY_TO_CONFIRM';
    } else {
      bucket = 'NEEDS_REVIEW';
      if (bestCandidate.score === 100 && exactMatchCount > 1) {
        warning = 'Multiple exact full-name matches found.';
      }
    }

    const updatedRequest = toUpdatedRequest(request, candidates, bucket);
    const matched: MatchedPeerRequest = {
      request: updatedRequest,
      bucket,
      bestCandidate,
      candidates,
      warning
    };

    if (bucket === 'READY_TO_CONFIRM') {
      readyToConfirm.push(matched);
    } else if (bucket === 'NEEDS_REVIEW') {
      needsReview.push(matched);
    } else {
      noMatch.push(matched);
    }

    updatedRequests.push(updatedRequest);
  }

  return {
    readyToConfirm,
    needsReview,
    noMatch,
    invalid,
    updatedRequests
  };
}
