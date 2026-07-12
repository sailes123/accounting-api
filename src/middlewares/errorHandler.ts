import type { Request, Response, NextFunction } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

// Express 5 forwards rejected promises from async route handlers here automatically,
// so this is the last line of defense for anything a route's own try/catch missed.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }

  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
