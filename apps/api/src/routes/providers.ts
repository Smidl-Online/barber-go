import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const providersRouter = Router();

// GET /api/providers
providersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      category = 'barber',
      location_type,
      lat,
      lng,
      radius_km,
      min_rating,
      sort_by = 'rating',
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ProviderProfileWhereInput = {
      is_active: true,
      category,
    };

    if (location_type && ['salon', 'mobile', 'both'].includes(location_type)) {
      if (location_type === 'salon') {
        where.location_type = { in: ['salon', 'both'] };
      } else if (location_type === 'mobile') {
        where.location_type = { in: ['mobile', 'both'] };
      } else {
        where.location_type = 'both';
      }
    }

    if (min_rating) {
      where.avg_rating = { gte: parseFloat(min_rating) };
    }

    if (search) {
      where.OR = [
        { display_name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ProviderProfileOrderByWithRelationInput = { avg_rating: 'desc' };
    if (sort_by === 'review_count') orderBy = { review_count: 'desc' };

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          services: {
            where: { is_active: true },
            orderBy: { sort_order: 'asc' },
            take: 1,
            select: { price: true },
          },
          user: { select: { full_name: true } },
        },
      }),
      prisma.providerProfile.count({ where }),
    ]);

    // If geo search, filter by Haversine distance
    let results = providers.map((p) => {
      const minPrice = p.services[0]?.price || null;
      return {
        id: p.id,
        display_name: p.display_name,
        bio: p.bio,
        category: p.category,
        profile_photo_url: p.profile_photo_url,
        location_type: p.location_type,
        salon_address: p.salon_address,
        avg_rating: Number(p.avg_rating),
        review_count: p.review_count,
        min_price: minPrice ? Number(minPrice) : null,
        distance_km: null as number | null,
      };
    });

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = radius_km ? parseFloat(radius_km) : 50;

      results = providers
        .map((p) => {
          const pLat = p.salon_lat ? Number(p.salon_lat) : null;
          const pLng = p.salon_lng ? Number(p.salon_lng) : null;
          const dist = pLat && pLng ? haversine(userLat, userLng, pLat, pLng) : null;
          const minPrice = p.services[0]?.price || null;

          return {
            id: p.id,
            display_name: p.display_name,
            bio: p.bio,
            category: p.category,
            profile_photo_url: p.profile_photo_url,
            location_type: p.location_type,
            salon_address: p.salon_address,
            avg_rating: Number(p.avg_rating),
            review_count: p.review_count,
            min_price: minPrice ? Number(minPrice) : null,
            distance_km: dist ? Math.round(dist * 10) / 10 : null,
          };
        })
        .filter((p) => p.distance_km === null || p.distance_km <= maxRadius);

      if (sort_by === 'distance') {
        results.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
      }
    }

    res.json({
      data: results,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/providers/:id
providersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { full_name: true, email: true } },
        services: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
        },
        portfolio_images: { orderBy: { sort_order: 'asc' } },
        availability: {
          where: { is_active: true },
          orderBy: { day_of_week: 'asc' },
        },
        reviews: {
          orderBy: { created_at: 'desc' },
          take: 5,
          include: {
            customer: { select: { full_name: true, avatar_url: true } },
          },
        },
      },
    });

    if (!provider) {
      res.status(404).json({ status: 404, message: 'Provider nenalezen' });
      return;
    }

    res.json({
      ...provider,
      avg_rating: Number(provider.avg_rating),
      services: provider.services.map((s) => ({ ...s, price: Number(s.price) })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/providers/:id/reviews
providersRouter.get('/:id/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { provider_id: req.params.id },
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          customer: { select: { full_name: true, avatar_url: true } },
        },
      }),
      prisma.review.count({ where: { provider_id: req.params.id } }),
    ]);

    res.json({
      data: reviews,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/providers/:id/availability?date=2026-04-15&service_id=uuid
providersRouter.get('/:id/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, service_id } = req.query as Record<string, string>;

    if (!date) {
      res.status(400).json({ status: 400, message: 'Parametr date je povinný' });
      return;
    }

    const requestedDate = new Date(date);
    // JS getDay: 0=Ne, 1=Po ... 6=So → convert to 0=Po, 6=Ne
    const jsDay = requestedDate.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

    const availability = await prisma.availability.findFirst({
      where: {
        provider_id: req.params.id,
        day_of_week: dayOfWeek,
        is_active: true,
      },
    });

    if (!availability) {
      res.json({ date, slots: [] });
      return;
    }

    // Get service duration
    let durationMinutes = 30; // default slot size
    if (service_id) {
      const service = await prisma.service.findUnique({ where: { id: service_id } });
      if (service) durationMinutes = service.duration_minutes;
    }

    // Get existing bookings for this date
    const existingBookings = await prisma.booking.findMany({
      where: {
        provider_id: req.params.id,
        booking_date: requestedDate,
        status: { in: ['pending', 'confirmed'] },
      },
    });

    // Generate time slots
    const slots = generateSlots(
      availability.start_time,
      availability.end_time,
      durationMinutes,
      existingBookings.map((b) => ({ start: b.start_time, end: b.end_time }))
    );

    res.json({ date, slots });
  } catch (e) {
    next(e);
  }
});

function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  booked: Array<{ start: string; end: string }>
): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);

    const isBooked = booked.some((b) => {
      const bStart = timeToMinutes(b.start);
      const bEnd = timeToMinutes(b.end);
      return currentMinutes < bEnd && currentMinutes + durationMinutes > bStart;
    });

    if (!isBooked) {
      slots.push(slotStart);
    }

    currentMinutes += 30; // 30-minute granularity
  }

  return slots;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
