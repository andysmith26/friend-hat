import type { PeerRequestRepository } from '$lib/application/ports/PeerRequestRepository';
import type { PeerRequestEntry } from '$lib/domain/peerRequest';

function clonePeerRequestEntry(entry: PeerRequestEntry): PeerRequestEntry {
  return {
    ...entry,
    candidates: entry.candidates.map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons]
    }))
  };
}

export class InMemoryPeerRequestRepository implements PeerRequestRepository {
  private readonly entries = new Map<string, PeerRequestEntry>();

  constructor(initialEntries: PeerRequestEntry[] = []) {
    for (const entry of initialEntries) {
      this.entries.set(entry.id, clonePeerRequestEntry(entry));
    }
  }

  async getById(id: string): Promise<PeerRequestEntry | null> {
    const entry = this.entries.get(id);
    return entry ? clonePeerRequestEntry(entry) : null;
  }

  async listByProgramId(programId: string): Promise<PeerRequestEntry[]> {
    return Array.from(this.entries.values())
      .filter((entry) => entry.programId === programId)
      .map(clonePeerRequestEntry);
  }

  async listByRequesterStudentId(studentId: string): Promise<PeerRequestEntry[]> {
    return Array.from(this.entries.values())
      .filter((entry) => entry.requesterStudentId === studentId)
      .map(clonePeerRequestEntry);
  }

  async save(entry: PeerRequestEntry): Promise<void> {
    this.entries.set(entry.id, clonePeerRequestEntry(entry));
  }

  async saveMany(entries: PeerRequestEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.id, clonePeerRequestEntry(entry));
    }
  }

  async update(entry: PeerRequestEntry): Promise<void> {
    this.entries.set(entry.id, clonePeerRequestEntry(entry));
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async deleteByProgramId(programId: string): Promise<void> {
    for (const [id, entry] of this.entries.entries()) {
      if (entry.programId === programId) {
        this.entries.delete(id);
      }
    }
  }
}
