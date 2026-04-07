import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';

// ─── Configuration ───
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',  // images
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',  // documents
  '.csv', '.txt', '.zip',                     // misc
]);

const UPLOAD_BASE_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Build a date-based subdirectory path: uploads/YYYY-MM
 */
function getUploadDir(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(UPLOAD_BASE_DIR, `${yyyy}-${mm}`);
}

/**
 * Multer disk storage: files are saved as {uuid}.{ext} under uploads/YYYY-MM/
 */
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = getUploadDir();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

/**
 * File filter: reject disallowed extensions
 */
function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new AppError(`허용되지 않는 파일 형식입니다: ${ext}`, 400));
    return;
  }
  cb(null, true);
}

/**
 * Configured multer instance for single/multi file upload.
 * Usage:
 *   router.post('/upload', upload.array('files', 10), handler)
 *   router.post('/upload', upload.single('file'), handler)
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export { MAX_FILE_SIZE, ALLOWED_EXTENSIONS, UPLOAD_BASE_DIR };
