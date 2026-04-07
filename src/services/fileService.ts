import prisma from '../config/database';
import path from 'path';
import fs from 'fs';
import { AppError } from '../middlewares/errorHandler';

export interface FileMetadata {
  file_id: number;
  original_nm: string;
  stored_nm: string;
  file_path: string;
  file_size: number | null;
  file_ext: string | null;
  ref_table: string | null;
  ref_id: string | null;
  create_by: string | null;
  create_dt: Date;
}

/**
 * Save file metadata to TB_FILE after multer has written the file to disk.
 */
export async function saveFileMetadata(
  file: Express.Multer.File,
  opts?: { refTable?: string; refId?: string; createBy?: string },
): Promise<FileMetadata> {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  // Build relative path from upload root for portability
  const uploadRoot = path.resolve(process.cwd(), 'uploads');
  const relativePath = path.relative(uploadRoot, file.path);

  const record = await prisma.tbFile.create({
    data: {
      original_nm: file.originalname,
      stored_nm: file.filename,
      file_path: relativePath,
      file_size: file.size,
      file_ext: ext || null,
      ref_table: opts?.refTable ?? null,
      ref_id: opts?.refId ?? null,
      create_by: opts?.createBy ?? null,
    },
  });

  return record;
}

/**
 * Save multiple file metadata records.
 */
export async function saveFilesMetadata(
  files: Express.Multer.File[],
  opts?: { refTable?: string; refId?: string; createBy?: string },
): Promise<FileMetadata[]> {
  const results: FileMetadata[] = [];
  for (const file of files) {
    results.push(await saveFileMetadata(file, opts));
  }
  return results;
}

/**
 * Retrieve file metadata by ID and verify the file exists on disk.
 * Returns the metadata + absolute disk path.
 */
export async function getFileForDownload(
  fileId: number,
): Promise<{ metadata: FileMetadata; absolutePath: string }> {
  const metadata = await prisma.tbFile.findUnique({
    where: { file_id: fileId },
  });

  if (!metadata) {
    throw new AppError('파일을 찾을 수 없습니다.', 404);
  }

  const uploadRoot = path.resolve(process.cwd(), 'uploads');
  const absolutePath = path.join(uploadRoot, metadata.file_path);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError('파일이 서버에 존재하지 않습니다.', 404);
  }

  return { metadata, absolutePath };
}
