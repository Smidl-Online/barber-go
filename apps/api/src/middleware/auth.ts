import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { AppError } from './errorHandler';
import { prisma } from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Přihlášení je vyžadováno'));
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
      .then((user) => {
        if (!user) {
          return next(new AppError(401, 'Uživatel neexistuje, přihlaste se znovu'));
        }
        req.user = payload;
        next();
      })
      .catch(() => {
        next(new AppError(401, 'Chyba ověření uživatele'));
      });
  } catch {
    next(new AppError(401, 'Neplatný nebo expirovaný token'));
  }
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return next(new AppError(403, 'Nedostatečná oprávnění'));
    }
    next();
  };
}
