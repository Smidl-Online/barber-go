import { Router, Request, Response, NextFunction } from 'express';
import { createReviewSchema, updateReviewSchema } from '@barber-go/shared';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const reviewsRouter = Router();

reviewsRouter.use(authenticate);

async function updateProviderRating(providerId: string) {
  const reviews = await prisma.review.findMany({
    where: { provider_id: providerId },
    select: { rating: true },
  });
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  await prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      avg_rating: Math.round(avg * 10) / 10,
      review_count: count,
    },
  });
}

// POST /api/reviews
reviewsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'customer') {
      throw new AppError(403, 'Pouze zákazník může přidat recenzi');
    }

    const data = createReviewSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.booking_id },
      include: { review: true },
    });

    if (!booking) throw new AppError(404, 'Rezervace nenalezena');
    if (booking.customer_id !== req.user!.userId) throw new AppError(403, 'Nemáte přístup');
    if (booking.status !== 'completed') throw new AppError(400, 'Recenzi lze přidat pouze k dokončené rezervaci');
    if (booking.review) throw new AppError(409, 'K této rezervaci již existuje recenze');

    const review = await prisma.review.create({
      data: {
        booking_id: data.booking_id,
        customer_id: req.user!.userId,
        provider_id: booking.provider_id,
        rating: data.rating,
        comment: data.comment,
      },
    });

    await updateProviderRating(booking.provider_id);

    res.status(201).json(review);
  } catch (e) {
    next(e);
  }
});

// PUT /api/reviews/:id
reviewsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Recenze nenalezena');
    if (existing.customer_id !== req.user!.userId) throw new AppError(403, 'Nemáte přístup');

    const data = updateReviewSchema.parse(req.body);

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data,
    });

    await updateProviderRating(existing.provider_id);

    res.json(review);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/reviews/:id
reviewsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Recenze nenalezena');
    if (existing.customer_id !== req.user!.userId) throw new AppError(403, 'Nemáte přístup');

    await prisma.review.delete({ where: { id: req.params.id } });
    await updateProviderRating(existing.provider_id);

    res.json({ message: 'Recenze smazána' });
  } catch (e) {
    next(e);
  }
});
