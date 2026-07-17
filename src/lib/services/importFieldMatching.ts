import type { ColumnMapping, MappedField, RawSheetData } from '$lib/domain/import';

/**
 * Suggest a destination field for an imported column header.
 *
 * This is intentionally shared by every import surface so a header-recognition
 * improvement is available consistently for pasted data, uploaded files, and
 * Google Sheets.
 */
export function guessImportFieldMapping(header: string): MappedField | null {
  const normalized = header.toLowerCase().trim();

  if (
    normalized === 'student id' ||
    normalized === 'studentid' ||
    normalized === 'id' ||
    normalized === 'email'
  ) {
    return 'studentId';
  }

  if (normalized === 'display name' || normalized === 'name') {
    return 'displayName';
  }

  if (
    normalized === 'first name' ||
    normalized === 'firstname' ||
    normalized === 'first' ||
    normalized === 'fname'
  ) {
    return 'firstName';
  }

  if (
    normalized === 'preferred name' ||
    normalized === 'preferredname' ||
    normalized === 'preferred' ||
    normalized === 'nickname' ||
    normalized === 'chosen name' ||
    normalized === 'chosenname'
  ) {
    return 'preferredName';
  }

  if (
    normalized === 'last name' ||
    normalized === 'lastname' ||
    normalized === 'last' ||
    normalized === 'lname' ||
    normalized === 'surname'
  ) {
    return 'lastName';
  }

  if (
    normalized.includes('peer request') ||
    normalized.includes('partner request') ||
    normalized.includes('work with') ||
    normalized.includes('want to work with')
  ) {
    return `peerRequest${getRank(normalized)}` as MappedField;
  }

  if (
    normalized.includes('choice') ||
    normalized.includes('preference') ||
    normalized.includes('rank') ||
    normalized.includes('pick')
  ) {
    return `choice${getRank(normalized)}` as MappedField;
  }

  return null;
}

/** Create an editable mapping for each source column using shared suggestions. */
export function createImportColumnMappings(data: RawSheetData): ColumnMapping[] {
  return data.headers.map((headerName, columnIndex) => ({
    columnIndex,
    headerName,
    mappedTo: guessImportFieldMapping(headerName)
  }));
}

function getRank(header: string): number {
  const match = header.match(/[1-5]/);
  return match ? parseInt(match[0], 10) : 1;
}
