import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { registerSchema, loginSchema } from '@barber-go/shared';
import { prisma } from '../utils/prisma';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
});

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'Email je již registrován');
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        ...(data.role === 'provider'
          ? {
              provider_profile: {
                create: {
                  display_name: data.full_name,
                  category: 'barber',
                },
              },
            }
          : {}),
      },
      select: { id: true, email: true, full_name: true, role: true },
    });

    const tokens = generateTokens({ userId: user.id, role: user.role });

    res.status(201).json({ user, ...tokens });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError(401, 'Neplatný email nebo heslo');
    }

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Neplatný email nebo heslo');
    }

    const tokens = generateTokens({ userId: user.id, role: user.role });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
      },
      ...tokens,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token je povinný');
    }

    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
    if (!user) {
      throw new AppError(401, 'Uživatel neexistuje, přihlaste se znovu');
    }

    const tokens = generateTokens({ userId: payload.userId, role: payload.role });

    res.json(tokens);
  } catch (e) {
    next(e);
  }
});

// PUT /api/auth/profile
authRouter.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        phone: true,
        avatar_url: true,
      },
    });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        phone: true,
        avatar_url: true,
      },
    });
    if (!user) {
      throw new AppError(404, 'Uživatel nenalezen');
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});
