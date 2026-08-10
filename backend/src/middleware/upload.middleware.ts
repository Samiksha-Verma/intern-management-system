import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { HttpError } from "../utils/http-error";

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      return cb(new HttpError(400, "Only .csv files are allowed"));
    }
    cb(null, true);
  },
});

export function singleCsvUpload(req: Request, res: Response, next: NextFunction) {
  csvUpload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof HttpError) return next(err);
    if (err instanceof Error) return next(new HttpError(400, err.message));
    return next(err);
  });
}

// Local disk storage for task deliverables. Files live outside any
// statically-served directory — downloads only happen through the
// authenticated, ownership-checked endpoints in intern/mentor controllers.
export const TASK_UPLOAD_DIR = path.join(process.cwd(), "uploads", "tasks");
fs.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });

// Generated offer letters / completion certificates, held briefly on disk
// between a "Generate" call and a follow-up "Send via Email" call.
export const DOCUMENT_UPLOAD_DIR = path.join(process.cwd(), "uploads", "documents");
fs.mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });

const taskFileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TASK_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    cb(null, `${req.params.id}-${Date.now()}-${safeName}`);
  },
});

const taskFileUpload = multer({
  storage: taskFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function singleTaskFileUpload(req: Request, res: Response, next: NextFunction) {
  taskFileUpload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof HttpError) return next(err);
    if (err instanceof Error) return next(new HttpError(400, err.message));
    return next(err);
  });
}
