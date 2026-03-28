import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// POST /api/notifications/register — register push token
notificationsRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, platform } = req.body;
    if (!token) throw new AppError(400, 'token je povinný');

    await prisma.pushToken.upsert({
      where: { token },
      update: { user_id: req.user!.userId },
      create: {
        user_id: req.user!.userId,
        token,
        platform: platform || 'expo',
      },
    });

    res.json({ message: 'Token registrován' });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/notifications/unregister — remove push token
notificationsRouter.delete('/unregister', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError(400, 'token je povinný');

    await prisma.pushToken.deleteMany({
      where: { token, user_id: req.user!.userId },
    });

    res.json({ message: 'Token odregistrován' });
  } catch (e) {
    next(e);
  }
});
