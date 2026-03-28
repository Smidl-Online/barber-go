import { Router, Request, Response, NextFunction } from 'express';
import {
  updateProviderProfileSchema,
  createServiceSchema,
  updateServiceSchema,
  createAvailabilitySchema,
} from '@barber-go/shared';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const providerDashboardRouter = Router();

providerDashboardRouter.use(authenticate, requireRole('provider'));

async function getProfile(userId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { user_id: userId },
  });
  if (!profile) throw new AppError(404, 'Provider profil nenalezen');
  return profile;
}

// GET /api/provider/profile
providerDashboardRouter.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    res.json(profile);
  } catch (e) {
    next(e);
  }
});

// GET /api/provider/portfolio
providerDashboardRouter.get('/portfolio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const images = await prisma.portfolioImage.findMany({
      where: { provider_id: profile.id },
      orderBy: { sort_order: 'asc' },
    });
    res.json(images);
  } catch (e) {
    next(e);
  }
});

// PUT /api/provider/profile
providerDashboardRouter.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const data = updateProviderProfileSchema.parse(req.body);

    const updated = await prisma.providerProfile.update({
      where: { id: profile.id },
      data,
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// --- Services CRUD ---

// GET /api/provider/services
providerDashboardRouter.get('/services', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const services = await prisma.service.findMany({
      where: { provider_id: profile.id },
      orderBy: { sort_order: 'asc' },
    });
    res.json(services.map((s) => ({ ...s, price: Number(s.price) })));
  } catch (e) {
    next(e);
  }
});

// POST /api/provider/services
providerDashboardRouter.post('/services', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const data = createServiceSchema.parse(req.body);

    const service = await prisma.service.create({
      data: {
        ...data,
        provider_id: profile.id,
        sort_order: data.sort_order ?? 0,
      },
    });

    res.status(201).json({ ...service, price: Number(service.price) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/provider/services/:id
providerDashboardRouter.put('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, provider_id: profile.id },
    });
    if (!existing) throw new AppError(404, 'Služba nenalezena');

    const data = updateServiceSchema.parse(req.body);
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ ...service, price: Number(service.price) });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/provider/services/:id
providerDashboardRouter.delete('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, provider_id: profile.id },
    });
    if (!existing) throw new AppError(404, 'Služba nenalezena');

    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ message: 'Služba smazána' });
  } catch (e) {
    next(e);
  }
});

// --- Availability CRUD ---

// GET /api/provider/availability
providerDashboardRouter.get('/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const availability = await prisma.availability.findMany({
      where: { provider_id: profile.id },
      orderBy: { day_of_week: 'asc' },
    });
    res.json(availability);
  } catch (e) {
    next(e);
  }
});

// POST /api/provider/availability
providerDashboardRouter.post('/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const data = createAvailabilitySchema.parse(req.body);

    const avail = await prisma.availability.create({
      data: {
        ...data,
        provider_id: profile.id,
        is_active: data.is_active ?? true,
      },
    });

    res.status(201).json(avail);
  } catch (e) {
    next(e);
  }
});

// PUT /api/provider/availability/:id
providerDashboardRouter.put('/availability/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const existing = await prisma.availability.findFirst({
      where: { id: req.params.id, provider_id: profile.id },
    });
    if (!existing) throw new AppError(404, 'Dostupnost nenalezena');

    const data = createAvailabilitySchema.parse(req.body);
    const avail = await prisma.availability.update({
      where: { id: req.params.id },
      data,
    });

    res.json(avail);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/provider/availability/:id
providerDashboardRouter.delete('/availability/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const existing = await prisma.availability.findFirst({
      where: { id: req.params.id, provider_id: profile.id },
    });
    if (!existing) throw new AppError(404, 'Dostupnost nenalezena');

    await prisma.availability.delete({ where: { id: req.params.id } });
    res.json({ message: 'Dostupnost smazána' });
  } catch (e) {
    next(e);
  }
});

// POST /api/provider/portfolio
providerDashboardRouter.post('/portfolio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const { image_url, caption, sort_order } = req.body;

    if (!image_url) throw new AppError(400, 'image_url je povinný');

    const image = await prisma.portfolioImage.create({
      data: {
        provider_id: profile.id,
        image_url,
        caption,
        sort_order: sort_order ?? 0,
      },
    });

    res.status(201).json(image);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/provider/portfolio/:id
providerDashboardRouter.delete('/portfolio/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile(req.user!.userId);
    const existing = await prisma.portfolioImage.findFirst({
      where: { id: req.params.id, provider_id: profile.id },
    });
    if (!existing) throw new AppError(404, 'Obrázek nenalezen');

    await prisma.portfolioImage.delete({ where: { id: req.params.id } });
    res.json({ message: 'Obrázek smazán' });
  } catch (e) {
    next(e);
  }
});
