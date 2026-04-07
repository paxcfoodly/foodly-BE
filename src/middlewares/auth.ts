import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { errorResponse } from '../types/apiResponse';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware — verifies JWT access token from Authorization header.
 * Sets req.user on success, returns 401 on failure.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('인증 토큰이 필요합니다.'));
    return;
  }

  const token = authHeader.substring(7); // strip "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json(errorResponse('토큰이 만료되었습니다.'));
      return;
    }
    res.status(401).json(errorResponse('유효하지 않은 토큰입니다.'));
    return;
  }
}
