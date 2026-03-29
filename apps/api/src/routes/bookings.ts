import { Router, Request, Response, NextFunction } from 'express';
import { createBookingSchema, updateBookingStatusSchema } from '@barber-go/shared';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);

// POST /api/bookings
bookingsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'customer') {
      throw new AppError(403, 'Pouze zákazník může vytvořit rezervaci');
    }

    const data = createBookingSchema.parse(req.body);

    // Validate provider exists
    const provider = await prisma.providerProfile.findUnique({
      where: { id: data.provider_id },
    });
    if (!provider || !provider.is_active) {
      throw new AppError(404, 'Provider nenalezen');
    }

    // Validate service
    const service = await prisma.service.findFirst({
      where: { id: data.service_id, provider_id: data.provider_id, is_active: true },
    });
    if (!service) {
      throw new AppError(404, 'Služba nenalezena');
    }

    // Check location_type compatibility
    if (data.location_type === 'mobile' && provider.location_type === 'salon') {
      throw new AppError(400, 'Tento provider neposkytuje mobilní služby');
    }
    if (data.location_type === 'salon' && provider.location_type === 'mobile') {
      throw new AppError(400, 'Tento provider nemá salon');
    }
    if (data.location_type === 'mobile' && !data.customer_address) {
      throw new AppError(400, 'Pro mobilní službu je vyžadována adresa');
    }

    // Compute end_time
    const [startH, startM] = data.start_time.split(':').map(Number);
    const endMinutes = startH * 60 + startM + service.duration_minutes;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Collision check
    const bookingDate = new Date(data.booking_date);
    const existingBookings = await prisma.booking.findMany({
      where: {
        provider_id: data.provider_id,
        booking_date: bookingDate,
        status: { in: ['pending', 'confirmed'] },
      },
    });

    const newStartMin = startH * 60 + startM;
    for (const cb of existingBookings) {
      const cStartMin = timeToMinutes(cb.start_time);
      const cEndMin = timeToMinutes(cb.end_time);

      if (newStartMin < cEndMin && endMinutes > cStartMin) {
        throw new AppError(409, 'Termín je obsazen, vyberte jiný čas');
      }
    }

    const booking = await prisma.booking.create({
      data: {
        customer_id: req.user!.userId,
        provider_id: data.provider_id,
        service_id: data.service_id,
        booking_date: bookingDate,
        start_time: data.start_time,
        end_time,
        location_type: data.location_type,
        customer_address: data.customer_address,
        customer_lat: data.customer_lat,
        customer_lng: data.customer_lng,
        note: data.note,
      },
      include: {
        service: true,
        provider: { select: { display_name: true } },
      },
    });

    res.status(201).json(booking);
  } catch (e) {
    next(e);
  }
});

// GET /api/bookings?filter=upcoming|past|all
bookingsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filter = 'all' } = req.query as Record<string, string>;
    const now = new Date();

    const isProvider = req.user!.role === 'provider';

    let where: any = {};
    if (isProvider) {
      const profile = await prisma.providerProfile.findUnique({
        where: { user_id: req.user!.userId },
      });
      if (!profile) throw new AppError(404, 'Provider profil nenalezen');
      where.provider_id = profile.id;
    } else {
      where.customer_id = req.user!.userId;
    }

    if (filter === 'upcoming') {
      where.booking_date = { gte: now };
      where.status = { in: ['pending', 'confirmed'] };
    } else if (filter === 'past') {
      where.OR = [
        { booking_date: { lt: now } },
        { status: { in: ['completed', 'cancelled_by_customer', 'cancelled_by_provider', 'no_show'] } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { booking_date: 'desc' },
      include: {
        service: { select: { name: true, duration_minutes: true, price: true } },
        provider: { select: { display_name: true, profile_photo_url: true } },
        customer: { select: { full_name: true } },
        review: { select: { id: true } },
      },
    });

    res.json(
      bookings.map((b) => ({
        ...b,
        service: { ...b.service, price: Number(b.service.price) },
      }))
    );
  } catch (e) {
    next(e);
  }
});

// GET /api/bookings/:id
bookingsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: true,
        provider: { select: { display_name: true, profile_photo_url: true, salon_address: true } },
        customer: { select: { full_name: true, phone: true } },
        review: true,
      },
    });

    if (!booking) throw new AppError(404, 'Rezervace nenalezena');

    // Check access
    const isProvider = req.user!.role === 'provider';
    if (isProvider) {
      const profile = await prisma.providerProfile.findUnique({
        where: { user_id: req.user!.userId },
      });
      if (booking.provider_id !== profile?.id) throw new AppError(403, 'Nemáte přístup');
    } else if (booking.customer_id !== req.user!.userId) {
      throw new AppError(403, 'Nemáte přístup');
    }

    res.json({ ...booking, service: { ...booking.service, price: Number(booking.service.price) } });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/bookings/:id/status
bookingsRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = updateBookingStatusSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw new AppError(404, 'Rezervace nenalezena');

    const isProvider = req.user!.role === 'provider';
    const isCustomer = req.user!.role === 'customer';

    // Authorization
    if (isCustomer && booking.customer_id !== req.user!.userId) {
      throw new AppError(403, 'Nemáte přístup');
    }
    if (isProvider) {
      const profile = await prisma.providerProfile.findUnique({
        where: { user_id: req.user!.userId },
      });
      if (booking.provider_id !== profile?.id) throw new AppError(403, 'Nemáte přístup');
    }

    // Status transition validation
    if (isCustomer && status === 'cancelled_by_customer') {
      if (['completed', 'no_show'].includes(booking.status)) {
        throw new AppError(400, 'Dokončenou rezervaci nelze zrušit');
      }
    } else if (isProvider && status === 'confirmed') {
      if (booking.status !== 'pending') {
        throw new AppError(400, 'Lze potvrdit pouze čekající rezervaci');
      }
    } else if (isProvider && status === 'cancelled_by_provider') {
      if (['completed', 'no_show'].includes(booking.status)) {
        throw new AppError(400, 'Dokončenou rezervaci nelze zrušit');
      }
    } else if (isProvider && status === 'completed') {
      if (booking.status !== 'confirmed') {
        throw new AppError(400, 'Lze dokončit pouze potvrzenou rezervaci');
      }
    } else if (isProvider && status === 'no_show') {
      if (booking.status !== 'confirmed') {
        throw new AppError(400, 'No-show lze označit pouze u potvrzené rezervace');
      }
    } else if (isCustomer && !['cancelled_by_customer'].includes(status)) {
      throw new AppError(403, 'Zákazník může pouze zrušit rezervaci');
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        service: { select: { name: true } },
        provider: { select: { display_name: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
