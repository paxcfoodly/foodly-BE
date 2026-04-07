import { describe, it, expect } from 'vitest';
import { MAX_FILE_SIZE, ALLOWED_EXTENSIONS } from '../utils/fileUpload';

describe('fileUpload config', () => {
  it('MAX_FILE_SIZE should be 10MB', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it('should allow common image extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('.jpg')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.png')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.gif')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.webp')).toBe(true);
  });

  it('should allow document extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('.pdf')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.doc')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.docx')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.xls')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.xlsx')).toBe(true);
    expect(ALLOWED_EXTENSIONS.has('.csv')).toBe(true);
  });

  it('should reject dangerous extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('.exe')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('.sh')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('.bat')).toBe(false);
    expect(ALLOWED_EXTENSIONS.has('.js')).toBe(false);
  });
});
