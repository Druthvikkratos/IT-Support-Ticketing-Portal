import { memoryStorage } from 'multer';

export const bulkUploadMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};
