import type { PeerRequestEntry } from '$lib/domain/peerRequest';

export interface PeerRequestRepository {
  getById(id: string): Promise<PeerRequestEntry | null>;
  listByProgramId(programId: string): Promise<PeerRequestEntry[]>;
  listByRequesterStudentId(studentId: string): Promise<PeerRequestEntry[]>;
  save(entry: PeerRequestEntry): Promise<void>;
  saveMany?(entries: PeerRequestEntry[]): Promise<void>;
  update(entry: PeerRequestEntry): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByProgramId?(programId: string): Promise<void>;
}
