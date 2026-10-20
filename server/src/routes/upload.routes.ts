import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { UploadedFile } from '../models/UploadedFile.js';

const router = Router();
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/photos');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Upload photo (accepts base64 dataUrl or image payload)
router.post('/photo', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      sendError(res, 'No image data provided', 400);
      return;
    }

    // Match data:[<mediatype>];base64,<data>
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      sendError(res, 'Invalid base64 image format. Must be a valid Data URL.', 400);
      return;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      sendError(res, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 415);
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      sendError(res, 'Image file size exceeds the 5MB maximum limit.', 413);
      return;
    }

    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
    const uniqueName = `member_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    try {
      await UploadedFile.findOneAndUpdate(
        { filename: uniqueName },
        {
          filename: uniqueName,
          mimeType,
          data: buffer,
          size: buffer.length,
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.warn('[MongoDB Image Backup Warning]', dbErr);
    }

    const photoUrl = `/uploads/photos/${uniqueName}`;

    sendSuccess(res, 'Photo uploaded successfully', {
      url: photoUrl,
      size: buffer.length,
      mimeType,
      filename: uniqueName,
    });
  } catch (error: any) {
    console.error('[Photo Upload Error]', error);
    sendError(res, error.message || 'Failed to upload photo', 500);
  }
});

export default router;
