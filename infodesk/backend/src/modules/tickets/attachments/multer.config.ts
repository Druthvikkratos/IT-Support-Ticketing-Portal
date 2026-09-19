import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';

export const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024;
export const MAX_FILE_PER_REQUEST = 10;

export const attachmentMulterOptions = {
  storage: diskStorage({
    destination: (req: Request, file, callback) => {
      const ticketId = req.params['id'];
      const dir = `assets/ticket-attachements/${ticketId}`;
      require('fs').mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    filename: (req, file, callback) => {
      const safeExt = extname(file.originalname)
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '');
      callback(null, `${randomUUID()}${safeExt}`);
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
};
