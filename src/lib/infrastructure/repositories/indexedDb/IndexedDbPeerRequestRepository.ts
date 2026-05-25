import type { PeerRequestRepository } from '$lib/application/ports/PeerRequestRepository';
import type { PeerRequestEntry } from '$lib/domain/peerRequest';
import { openDb } from './db';

const STORE_NAME = 'peerRequests';

function serializePeerRequestEntry(entry: PeerRequestEntry): object {
  return {
    ...entry,
    candidates: entry.candidates.map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons]
    }))
  };
}

function deserializePeerRequestEntry(data: Record<string, unknown>): PeerRequestEntry {
  const entry = data as unknown as PeerRequestEntry;
  return {
    ...entry,
    candidates: (entry.candidates ?? []).map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons]
    }))
  };
}

export class IndexedDbPeerRequestRepository implements PeerRequestRepository {
  async getById(id: string): Promise<PeerRequestEntry | null> {
    if (typeof indexedDB === 'undefined') return null;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result as Record<string, unknown> | undefined;
        resolve(data ? deserializePeerRequestEntry(data) : null);
      };
    });
  }

  async listByProgramId(programId: string): Promise<PeerRequestEntry[]> {
    if (typeof indexedDB === 'undefined') return [];

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('programId');
      const request = index.getAll(programId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = (request.result as Record<string, unknown>[] | undefined) ?? [];
        resolve(data.map(deserializePeerRequestEntry));
      };
    });
  }

  async listByRequesterStudentId(studentId: string): Promise<PeerRequestEntry[]> {
    if (typeof indexedDB === 'undefined') return [];

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('requesterStudentId');
      const request = index.getAll(studentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = (request.result as Record<string, unknown>[] | undefined) ?? [];
        resolve(data.map(deserializePeerRequestEntry));
      };
    });
  }

  async save(entry: PeerRequestEntry): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(serializePeerRequestEntry(entry));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveMany(entries: PeerRequestEntry[]): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    if (entries.length === 0) return;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      let completed = 0;
      let hasError = false;

      for (const entry of entries) {
        const request = store.put(serializePeerRequestEntry(entry));
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
        request.onsuccess = () => {
          completed++;
          if (completed === entries.length && !hasError) {
            resolve();
          }
        };
      }
    });
  }

  async update(entry: PeerRequestEntry): Promise<void> {
    await this.save(entry);
  }

  async delete(id: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteByProgramId(programId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('programId');
      const request = index.getAllKeys(programId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const keys = request.result ?? [];
        if (keys.length === 0) {
          resolve();
          return;
        }

        let completed = 0;
        let hasError = false;

        for (const key of keys) {
          const deleteRequest = store.delete(key);
          deleteRequest.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(deleteRequest.error);
            }
          };
          deleteRequest.onsuccess = () => {
            completed++;
            if (completed === keys.length && !hasError) {
              resolve();
            }
          };
        }
      };
    });
  }
}
