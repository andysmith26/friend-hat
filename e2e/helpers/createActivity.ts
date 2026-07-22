import type { Page } from '@playwright/test';

const DEFAULT_STUDENTS = [
  'Alice Smith',
  'Bob Jones',
  'Carol White',
  'Dave Brown',
  'Eve Wilson',
  'Frank Miller',
  'Grace Lee',
  'Henry Ford',
  'Ivy Chen',
  'Jack Liu'
];

interface CreateActivityOptions {
  activityName: string;
  students?: string[];
  generateGroups?: boolean;
}

/** Create an activity through the current home-page roster flow. */
export async function createActivity(
  page: Page,
  { activityName, students = DEFAULT_STUDENTS, generateGroups = true }: CreateActivityOptions
): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Paste roster' }).click();
  await page.locator('#ps-name').fill(activityName);
  await page.locator('#ps-paste').fill(students.join('\n'));

  await Promise.all([
    page.waitForURL(/\/activity\/[^/?]+(?:\?.*)?$/),
    page.getByRole('button', { name: 'Create Activity' }).click()
  ]);

  const match = page.url().match(/\/activity\/([^/?]+)/);
  if (!match) throw new Error('Could not extract the activity ID from the current URL');

  if (generateGroups) {
    await page.getByRole('button', { name: 'Make Groups' }).click();
    await page.locator('[data-student-id]').first().waitFor();
  }

  return match[1];
}
