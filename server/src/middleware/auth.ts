import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../models/types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'library-mgmt-secret-jwt-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token has expired or is invalid',
      },
    });
  }
}

export function roleMiddleware(allowedRoles: Array<'librarian' | 'student'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires role: ${allowedRoles.join(' or ')}`,
        },
      });
      return;
    }

    next();
  };
}

export function generateToken(payload: JWTPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}
