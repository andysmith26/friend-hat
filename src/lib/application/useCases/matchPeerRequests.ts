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
const MIN_PLAUSIBLE_SCORE = 0.6;
const AMBIGUITY_THRESHOLD = 0.15;

interface NormalizedStudentName {
  firstName: string;
  lastName: string;
  preferredName: string;
}

interface ScoredCandidate {
  studentId: string;
  baseScore: number;
}

function normalizeName(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

function getNormalizedStudentName(student: Student): NormalizedStudentName {
  const metadataPreferredName = student.meta?.preferredName;
  const preferredName =
    typeof metadataPreferredName === 'string' && !student.preferredName?.trim()
      ? metadataPreferredName
      : student.preferredName;

  return {
    firstName: normalizeName(student.firstName),
    lastName: normalizeName(student.lastName),
    preferredName: normalizeName(preferredName)
  };
}

function jaroWinklerSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(left.length, right.length) / 2) - 1, 0);
  const leftMatches = new Array<boolean>(left.length).fill(false);
  const rightMatches = new Array<boolean>(right.length).fill(false);
  let matches = 0;

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const start = Math.max(0, leftIndex - matchDistance);
    const end = Math.min(leftIndex + matchDistance + 1, right.length);

    for (let rightIndex = start; rightIndex < end; rightIndex += 1) {
      if (!rightMatches[rightIndex] && left[leftIndex] === right[rightIndex]) {
        leftMatches[leftIndex] = true;
        rightMatches[rightIndex] = true;
        matches += 1;
        break;
      }
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let rightIndex = 0;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    if (!leftMatches[leftIndex]) continue;
    while (!rightMatches[rightIndex]) rightIndex += 1;
    if (left[leftIndex] !== right[rightIndex]) transpositions += 1;
    rightIndex += 1;
  }

  const jaro =
    (matches / left.length + matches / right.length + (matches - transpositions / 2) / matches) / 3;
  if (jaro <= 0.7) return jaro;

  let prefixLength = 0;
  while (prefixLength < 4 && left[prefixLength] === right[prefixLength]) {
    prefixLength += 1;
  }

  return jaro + prefixLength * 0.1 * (1 - jaro);
}

function buildPermutations(student: Student): string[] {
  const { firstName, lastName, preferredName } = getNormalizedStudentName(student);
  const permutations = new Set<string>();
  const add = (value: string): void => {
    if (value) permutations.add(value);
  };

  if (firstName && lastName) {
    add(`${firstName} ${lastName}`);
    add(`${firstName} ${lastName[0]}`);
    add(`${firstName[0]} ${lastName}`);
  }
  if (preferredName && lastName) {
    add(`${preferredName} ${lastName}`);
    add(`${preferredName} ${lastName[0]}`);
  }
  add(firstName);
  add(lastName);

  return [...permutations];
}

function scoreCandidate(normalizedRequest: string, student: Student): ScoredCandidate {
  const inputSpaceCount = (normalizedRequest.match(/ /g) ?? []).length;
  const baseScore = Math.max(
    ...buildPermutations(student).map((permutation) => {
      const permutationSpaceCount = (permutation.match(/ /g) ?? []).length;
      const score = jaroWinklerSimilarity(normalizedRequest, permutation);
      return Math.max(0, score - (inputSpaceCount === permutationSpaceCount ? 0 : 0.1));
    })
  );

  return {
    studentId: student.id,
    baseScore
  };
}

function isSelfMatch(request: PeerRequestEntry, requester: Student | undefined): boolean {
  if (!requester) {
    return false;
  }

  const normalizedRequest = normalizeName(request.rawText);
  const requesterName = getNormalizedStudentName(requester);

  return (
    buildPermutations(requester).includes(normalizedRequest) ||
    (requesterName.preferredName !== '' && normalizedRequest === requesterName.preferredName)
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
    const normalizedRequest = normalizeName(request.rawText);

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

    const rankedCandidates = normalizedRequest
      ? input.students
          .filter((student) => student.id !== request.requesterStudentId)
          .map((student) => scoreCandidate(normalizedRequest, student))
          .sort(
            (left, right) =>
              right.baseScore - left.baseScore ||
              (left.studentId < right.studentId ? -1 : left.studentId > right.studentId ? 1 : 0)
          )
          .slice(0, MAX_CANDIDATES)
      : [];

    const topBaseScore = rankedCandidates[0]?.baseScore ?? 0;
    const candidates: PeerRequestCandidate[] =
      topBaseScore >= MIN_PLAUSIBLE_SCORE
        ? rankedCandidates.map((candidate, index) => {
            const confidence =
              index === 0
                ? candidate.baseScore *
                  (1 -
                    Math.max(
                      0,
                      (AMBIGUITY_THRESHOLD -
                        (candidate.baseScore - (rankedCandidates[1]?.baseScore ?? 0))) /
                        AMBIGUITY_THRESHOLD
                    ) *
                      0.5)
                : candidate.baseScore * (candidate.baseScore / topBaseScore) ** 2;

            return {
              studentId: candidate.studentId,
              score: confidence,
              confidence,
              baseScore: candidate.baseScore,
              reasons: ['Jaro-Winkler name similarity']
            };
          })
        : [];

    const bestCandidate = candidates[0];

    let bucket: PeerRequestMatchBucket;
    let warning: string | undefined;

    if (!bestCandidate) {
      bucket = 'NO_MATCH';
    } else if (bestCandidate.baseScore === 1 && bestCandidate.score > 0.5) {
      bucket = 'READY_TO_CONFIRM';
    } else {
      bucket = 'NEEDS_REVIEW';
      if (bestCandidate.baseScore === 1 && bestCandidate.score === 0.5) {
        warning = 'Multiple equally strong matches found.';
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
