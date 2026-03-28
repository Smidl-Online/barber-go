import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { registerPushTokenSchema } from '@barber-go/shared';
import { AppError } from '../middleware/errorHandler';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// POST /api/notifications/register
notificationsRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, platform } = registerPushTokenSchema.parse(req.body);

    await prisma.pushToken.upsert({
      where: {
        user_id_token: {
          user_id: req.user!.userId,
          token,
        },
      },
      update: {},
      create: {
        user_id: req.user!.userId,
        token,
        platform,
      },
    });

    res.json({ message: 'Token registrován' });
  } catch (e) {
    next(e);
  }
});

// POST /api/notifications/unregister
notificationsRouter.post('/unregister', async (req: Request, res: Response, next: NextFunction) => {
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
