import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma, cleanDb, createTestProvider, createTestCustomer } from './helpers';

async function createProviderWithService() {
  const { user, profile, token } = await createTestProvider();

  const service = await prisma.service.create({
    data: {
      provider_id: profile.id,
      name: 'Střih',
      description: 'Klasický pánský střih',
      duration_minutes: 30,
      price: 350,
      is_active: true,
      sort_order: 1,
    },
  });

  // Add availability for all weekdays (Mon-Fri = 0-4)
  for (let day = 0; day <= 4; day++) {
    await prisma.availability.create({
      data: {
        provider_id: profile.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      },
    });
  }

  return { user, profile, token, service };
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

describe('Bookings API', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  describe('POST /api/bookings', () => {
    beforeEach(cleanDb);

    it('creates a booking as customer', async () => {
      const { profile, service } = await createProviderWithService();
      const { token } = await createTestCustomer();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: getTomorrowDate(),
          start_time: '10:00',
          location_type: 'salon',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.start_time).toBe('10:00');
      expect(res.body.end_time).toBe('10:30');
      expect(res.body.service.price).toBe(350);
    });

    it('rejects booking from provider role', async () => {
      const { profile, service, token } = await createProviderWithService();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: getTomorrowDate(),
          start_time: '10:00',
          location_type: 'salon',
        });

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).post('/api/bookings').send({});
      expect(res.status).toBe(401);
    });

    it('detects time collision', async () => {
      const { profile, service } = await createProviderWithService();
      const { token } = await createTestCustomer();
      const date = getTomorrowDate();

      // First booking
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: date,
          start_time: '10:00',
          location_type: 'salon',
        });

      // Overlapping booking
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: date,
          start_time: '10:15',
          location_type: 'salon',
        });

      expect(res.status).toBe(409);
    });

    it('requires address for mobile location', async () => {
      const { profile, service } = await createProviderWithService();
      const { token } = await createTestCustomer();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: getTomorrowDate(),
          start_time: '10:00',
          location_type: 'mobile',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/bookings', () => {
    beforeEach(cleanDb);

    it('returns customer bookings', async () => {
      const { profile, service } = await createProviderWithService();
      const { user: customer, token } = await createTestCustomer();

      await prisma.booking.create({
        data: {
          customer_id: customer.id,
          provider_id: profile.id,
          service_id: service.id,
          booking_date: new Date(getTomorrowDate()),
          start_time: '10:00',
          end_time: '10:30',
          location_type: 'salon',
          status: 'pending',
        },
      });

      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].service.name).toBe('Střih');
    });

    it('filters upcoming bookings including today', async () => {
      const { profile, service } = await createProviderWithService();
      const { user: customer, token } = await createTestCustomer();

      // Create booking for today
      await prisma.booking.create({
        data: {
          customer_id: customer.id,
          provider_id: profile.id,
          service_id: service.id,
          booking_date: new Date(getTodayDate()),
          start_time: '18:00',
          end_time: '18:30',
          location_type: 'salon',
          status: 'confirmed',
        },
      });

      const res = await request(app)
        .get('/api/bookings?filter=upcoming')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns empty for provider without profile', async () => {
      const { token } = await createTestCustomer();

      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('PATCH /api/bookings/:id/status', () => {
    beforeEach(cleanDb);

    it('customer can cancel pending booking', async () => {
      const { profile, service } = await createProviderWithService();
      const { user: customer, token } = await createTestCustomer();

      const booking = await prisma.booking.create({
        data: {
          customer_id: customer.id,
          provider_id: profile.id,
          service_id: service.id,
          booking_date: new Date(getTomorrowDate()),
          start_time: '10:00',
          end_time: '10:30',
          location_type: 'salon',
          status: 'pending',
        },
      });

      const res = await request(app)
        .patch(`/api/bookings/${booking.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'cancelled_by_customer' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled_by_customer');
    });

    it('provider can confirm pending booking', async () => {
      const { profile, service, token } = await createProviderWithService();
      const { user: customer } = await createTestCustomer();

      const booking = await prisma.booking.create({
        data: {
          customer_id: customer.id,
          provider_id: profile.id,
          service_id: service.id,
          booking_date: new Date(getTomorrowDate()),
          start_time: '10:00',
          end_time: '10:30',
          location_type: 'salon',
          status: 'pending',
        },
      });

      const res = await request(app)
        .patch(`/api/bookings/${booking.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');
    });
  });
});
