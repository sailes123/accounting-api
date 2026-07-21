import fs from "fs";
import path from "path";
import multer from "multer";
import { logger } from "./logger";

export const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
export const LOGOS_DIR = path.join(UPLOADS_ROOT, "logos");

fs.mkdirSync(LOGOS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (req, file, cb) => {
    const userId = (req as { userId?: number }).userId;
    const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname);
    cb(null, `logo-user${userId}-${Date.now()}${ext}`);
  },
});

export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new Error("Only PNG, JPEG, WEBP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Path (relative to LOGOS_DIR) stored in logoUrl, e.g. "/uploads/logos/xxx.png" -> filename "xxx.png" */
export function logoFilenameFromUrl(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  return path.basename(logoUrl);
}

export function deleteLogoFile(logoUrl: string | null): void {
  const filename = logoFilenameFromUrl(logoUrl);
  if (!filename) return;
  const filePath = path.join(LOGOS_DIR, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      // Best-effort cleanup; an orphaned file on disk is not worth failing the request over.
      logger.error({ err, filePath }, "Failed to delete old logo file");
    }
  });
}
