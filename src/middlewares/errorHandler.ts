import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { errorResponse } from '../types/apiResponse';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Prisma 유니크 제약 위반 → 409 (마스터 코드는 전 회사 공통 유니크 — 타사 사용 코드와 충돌 가능)
  if ((err as any)?.code === 'P2002') {
    const fields = ((err as any)?.meta?.target ?? []) as string[];
    res.status(409).json(errorResponse(
      `이미 사용 중인 값입니다 (${Array.isArray(fields) ? fields.join(', ') : '고유값'}). 코드류는 전체 시스템에서 고유해야 하므로 다른 값을 사용하세요.`,
    ));
    return;
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError && err.isOperational
    ? err.message
    : 'Internal Server Error';

  console.error(`[ERROR] ${err.message}`, env.isDev ? err.stack : '');

  res.status(statusCode).json(errorResponse(message));
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}
