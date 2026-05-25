import type { PeerRequestRepository, SyncService } from '$lib/application/ports';
import type { PeerRequestEntry } from '$lib/domain/peerRequest';

export class SyncedPeerRequestRepository implements PeerRequestRepository {
  constructor(
    private readonly local: PeerRequestRepository,
    private readonly sync: SyncService
  ) {}

  async getById(id: string): Promise<PeerRequestEntry | null> {
    return this.local.getById(id);
  }

  async listByProgramId(programId: string): Promise<PeerRequestEntry[]> {
    return this.local.listByProgramId(programId);
  }

  async listByRequesterStudentId(studentId: string): Promise<PeerRequestEntry[]> {
    return this.local.listByRequesterStudentId(studentId);
  }

  async save(entry: PeerRequestEntry): Promise<void> {
    await this.local.save(entry);

    if (this.sync.isEnabled()) {
      await this.sync.queueForSync('peerRequests', 'save', entry.id);
    }
  }

  async saveMany(entries: PeerRequestEntry[]): Promise<void> {
    if (this.local.saveMany) {
      await this.local.saveMany(entries);
    } else {
      for (const entry of entries) {
        await this.local.save(entry);
      }
    }

    if (this.sync.isEnabled()) {
      for (const entry of entries) {
        await this.sync.queueForSync('peerRequests', 'save', entry.id);
      }
    }
  }

  async update(entry: PeerRequestEntry): Promise<void> {
    await this.local.update(entry);

    if (this.sync.isEnabled()) {
      await this.sync.queueForSync('peerRequests', 'save', entry.id);
    }
  }

  async delete(id: string): Promise<void> {
    await this.local.delete(id);

    if (this.sync.isEnabled()) {
      await this.sync.queueForSync('peerRequests', 'delete', id);
    }
  }

  async deleteByProgramId(programId: string): Promise<void> {
    const entries = await this.local.listByProgramId(programId);

    if (this.local.deleteByProgramId) {
      await this.local.deleteByProgramId(programId);

      if (this.sync.isEnabled()) {
        for (const entry of entries) {
          await this.sync.queueForSync('peerRequests', 'delete', entry.id);
        }
      }

      return;
    }

    for (const entry of entries) {
      await this.delete(entry.id);
    }
  }
}
