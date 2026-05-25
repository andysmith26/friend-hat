import { createPeerRequestEntry, type PeerRequestEntry } from '$lib/domain/peerRequest';

export type PeerRequestReviewDecision =
  | {
      requestId: string;
      action: 'CONFIRM_SUGGESTED';
    }
  | {
      requestId: string;
      action: 'SET_MANUAL';
      studentId: string;
    }
  | {
      requestId: string;
      action: 'LEAVE_UNRESOLVED';
    };

export interface ConfirmPeerRequestMatchesInput {
  requests: PeerRequestEntry[];
  decisions: PeerRequestReviewDecision[];
}

export interface ConfirmPeerRequestMatchesOutput {
  updatedRequests: PeerRequestEntry[];
}

export type ConfirmPeerRequestMatchesError =
  | { type: 'REQUEST_NOT_FOUND'; requestId: string }
  | { type: 'SUGGESTED_MATCH_NOT_AVAILABLE'; requestId: string }
  | { type: 'INVALID_MANUAL_SELECTION'; requestId: string; message: string };

export function confirmPeerRequestMatches(
  input: ConfirmPeerRequestMatchesInput
): ConfirmPeerRequestMatchesOutput | ConfirmPeerRequestMatchesError {
  const requestsById = new Map(input.requests.map((request) => [request.id, request]));

  for (const decision of input.decisions) {
    const existing = requestsById.get(decision.requestId);

    if (!existing) {
      return {
        type: 'REQUEST_NOT_FOUND',
        requestId: decision.requestId
      };
    }

    if (decision.action === 'CONFIRM_SUGGESTED') {
      const suggestedMatch = existing.candidates[0];

      if (existing.status !== 'AUTO_MATCHED_PENDING_CONFIRMATION' || !suggestedMatch) {
        return {
          type: 'SUGGESTED_MATCH_NOT_AVAILABLE',
          requestId: decision.requestId
        };
      }

      requestsById.set(
        decision.requestId,
        createPeerRequestEntry({
          ...existing,
          status: 'CONFIRMED',
          resolvedStudentId: suggestedMatch.studentId,
          resolutionSource: 'AUTO'
        })
      );
      continue;
    }

    if (decision.action === 'SET_MANUAL') {
      const studentId = decision.studentId.trim();
      if (!studentId) {
        return {
          type: 'INVALID_MANUAL_SELECTION',
          requestId: decision.requestId,
          message: 'studentId is required for manual selection'
        };
      }

      if (studentId === existing.requesterStudentId) {
        return {
          type: 'INVALID_MANUAL_SELECTION',
          requestId: decision.requestId,
          message: 'requester cannot be selected as the resolved student'
        };
      }

      requestsById.set(
        decision.requestId,
        createPeerRequestEntry({
          ...existing,
          status: 'MANUALLY_SET',
          resolvedStudentId: studentId,
          resolutionSource: 'MANUAL'
        })
      );
      continue;
    }

    requestsById.set(
      decision.requestId,
      createPeerRequestEntry({
        ...existing,
        status: 'UNRESOLVED',
        resolvedStudentId: undefined,
        resolutionSource: 'NONE'
      })
    );
  }

  return {
    updatedRequests: input.requests.map((request) => requestsById.get(request.id) ?? request)
  };
}
