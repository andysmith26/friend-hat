import { beforeEach, describe, expect, it } from 'vitest';
import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import { createPool } from '$lib/domain/pool';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { InMemoryStudentRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryStudentRepository';
import { addStudentToPool } from './addStudentToPool';

class MockIdGenerator implements IdGenerator {
  generateId(): string {
    return 'gw-student-1';
  }
}

describe('addStudentToPool', () => {
  let studentRepo: InMemoryStudentRepository;
  let poolRepo: InMemoryPoolRepository;
  let idGenerator: IdGenerator;

  beforeEach(async () => {
    studentRepo = new InMemoryStudentRepository();
    poolRepo = new InMemoryPoolRepository();
    idGenerator = new MockIdGenerator();

    await poolRepo.save(
      createPool({
        id: 'pool-1',
        name: 'Room 101',
        type: 'CLASS',
        memberIds: []
      })
    );
  });

  it('stores the editable source student id separately from the internal id', async () => {
    const result = await addStudentToPool(
      {
        studentRepo,
        poolRepo,
        idGenerator
      },
      {
        poolId: 'pool-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        sourceStudentId: 'S-42'
      }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.student.id).toBe('gw-student-1');
    expect(result.value.student.meta?.sourceStudentId).toBe('S-42');
  });
});
