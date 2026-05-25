import { beforeEach, describe, expect, it } from 'vitest';
import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import { createPool } from '$lib/domain/pool';
import { createStudent } from '$lib/domain/student';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { InMemoryStudentRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryStudentRepository';
import { upgradeQuickStartRoster } from './upgradeQuickStartRoster';

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generateId(): string {
    return `student-${this.nextId++}`;
  }
}

describe('upgradeQuickStartRoster', () => {
  let studentRepository: InMemoryStudentRepository;
  let poolRepository: InMemoryPoolRepository;
  let idGenerator: IdGenerator;

  beforeEach(async () => {
    studentRepository = new InMemoryStudentRepository();
    poolRepository = new InMemoryPoolRepository();
    idGenerator = new SequentialIdGenerator();

    await studentRepository.saveMany([
      createStudent({ id: 'placeholder-1', firstName: 'Student', lastName: '1' }),
      createStudent({ id: 'placeholder-2', firstName: 'Student', lastName: '2' })
    ]);

    await poolRepository.save(
      createPool({
        id: 'pool-1',
        name: 'Quick Start',
        type: 'CLASS',
        memberIds: ['placeholder-1', 'placeholder-2']
      })
    );
  });

  it('stores sourceStudentId on replacement students and preserves positional remapping', async () => {
    const result = await upgradeQuickStartRoster(
      {
        idGenerator,
        studentRepository,
        poolRepository
      },
      {
        poolId: 'pool-1',
        students: [
          { firstName: 'Ada', lastName: 'Lovelace', sourceStudentId: 'S-42' },
          { firstName: 'Grace', lastName: 'Hopper', sourceStudentId: 'S-99' }
        ]
      }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.countsMatch).toBe(true);
    expect(result.value.idMapping.get('placeholder-1')).toBe('student-1');
    expect(result.value.idMapping.get('placeholder-2')).toBe('student-2');
    expect(result.value.newStudents).toMatchObject([
      {
        id: 'student-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        meta: { sourceStudentId: 'S-42' }
      },
      {
        id: 'student-2',
        firstName: 'Grace',
        lastName: 'Hopper',
        meta: { sourceStudentId: 'S-99' }
      }
    ]);
  });
});
