import { diskStorage } from 'multer';
import { Request } from 'express';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const CHAT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const chatMulterOptions = {
  storage: diskStorage({
    destination: (req: Request, file, callback) => {
      const ticketId = req.params['ticketId'];
      const dir = `assets/ticket-attachements/${ticketId}/chat`;
      mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    filename: (req, file, callback) => {
      const safeExt = extname(file.originalname)
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '');
      callback(null, `${randomUUID()}${safeExt}`);
    },
  }),
  limits: { fileSize: CHAT_MAX_UPLOAD_BYTES },
};
