import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ message });
}
