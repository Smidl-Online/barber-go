import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma, cleanDb, createTestProvider, createTestCustomer } from './helpers';

describe('Bookings API', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  async function createServiceForProvider(providerId: string) {
    return prisma.service.create({
      data: {
        provider_id: providerId,
        name: 'Střih',
        duration_minutes: 30,
        price: 350,
        is_active: true,
        sort_order: 0,
      },
    });
  }

  async function createBooking(customerToken: string, providerId: string, serviceId: string, date: string, startTime: string) {
    return request(app).post('/api/bookings').set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: providerId,
        service_id: serviceId,
        booking_date: date,
        start_time: startTime,
        location_type: 'salon',
      });
  }

  describe('POST /api/bookings', () => {
    beforeEach(cleanDb);

    it('creates a booking', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      const res = await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');
      expect(res.status).toBe(201);
      expect(res.body.start_time).toBe('10:00');
      expect(res.body.end_time).toBe('10:30');
      expect(res.body.status).toBe('pending');
    });

    it('computes end_time from service duration', async () => {
      const { profile } = await createTestProvider();
      const service = await prisma.service.create({
        data: {
          provider_id: profile.id,
          name: 'Deluxe',
          duration_minutes: 90,
          price: 800,
          is_active: true,
          sort_order: 0,
        },
      });
      const { token } = await createTestCustomer();

      const res = await createBooking(token, profile.id, service.id, '2026-12-15', '14:00');
      expect(res.status).toBe(201);
      expect(res.body.end_time).toBe('15:30');
    });

    it('rejects provider creating booking', async () => {
      const { token, profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);

      const res = await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated', async () => {
      const res = await request(app).post('/api/bookings').send({
        provider_id: 'fake',
        service_id: 'fake',
        booking_date: '2026-12-15',
        start_time: '10:00',
        location_type: 'salon',
      });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent provider', async () => {
      const { token } = await createTestCustomer();
      const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: '00000000-0000-0000-0000-000000000000',
          service_id: '00000000-0000-0000-0000-000000000000',
          booking_date: '2026-12-15',
          start_time: '10:00',
          location_type: 'salon',
        });
      expect(res.status).toBe(404);
    });

    it('detects time collision', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');
      const res = await createBooking(token, profile.id, service.id, '2026-12-15', '10:15');
      expect(res.status).toBe(409);
    });

    it('allows non-overlapping bookings', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');
      const res = await createBooking(token, profile.id, service.id, '2026-12-15', '10:30');
      expect(res.status).toBe(201);
    });

    it('rejects mobile without address', async () => {
      const { profile } = await createTestProvider();
      // Update provider to support mobile
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { location_type: 'both' },
      });
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: '2026-12-15',
          start_time: '10:00',
          location_type: 'mobile',
        });
      expect(res.status).toBe(400);
    });

    it('rejects mobile for salon-only provider', async () => {
      const { profile } = await createTestProvider();
      // Ensure salon only
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { location_type: 'salon' },
      });
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: '2026-12-15',
          start_time: '10:00',
          location_type: 'mobile',
          customer_address: 'Test 123',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/bookings', () => {
    beforeEach(cleanDb);

    it('lists customer bookings', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');
      await createBooking(token, profile.id, service.id, '2026-12-15', '11:00');

      const res = await request(app).get('/api/bookings').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters upcoming bookings', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');

      const res = await request(app).get('/api/bookings?filter=upcoming').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('provider sees own bookings', async () => {
      const { profile, token: providerToken } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');

      const res = await request(app).get('/api/bookings').set('Authorization', `Bearer ${providerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/bookings/:id', () => {
    beforeEach(cleanDb);

    it('returns booking detail', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token } = await createTestCustomer();

      const created = await createBooking(token, profile.id, service.id, '2026-12-15', '10:00');
      const res = await request(app).get(`/api/bookings/${created.body.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('rejects access from other customer', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: token1 } = await createTestCustomer();
      const { token: token2 } = await createTestCustomer();

      const created = await createBooking(token1, profile.id, service.id, '2026-12-15', '10:00');
      const res = await request(app).get(`/api/bookings/${created.body.id}`).set('Authorization', `Bearer ${token2}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent booking', async () => {
      const { token } = await createTestCustomer();
      const res = await request(app).get('/api/bookings/00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/bookings/:id/status', () => {
    beforeEach(cleanDb);

    it('provider confirms booking', async () => {
      const { profile, token: providerToken } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      const created = await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');
      const res = await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'confirmed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');
    });

    it('provider completes confirmed booking', async () => {
      const { profile, token: providerToken } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      const created = await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');
      await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'confirmed' });
      const res = await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('customer cancels booking', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      const created = await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');
      const res = await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'cancelled_by_customer' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled_by_customer');
    });

    it('customer cannot confirm booking', async () => {
      const { profile } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      const created = await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');
      const res = await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'confirmed' });
      expect(res.status).toBe(403);
    });

    it('cannot complete pending booking', async () => {
      const { profile, token: providerToken } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      const created = await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');
      const res = await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(400);
    });

    it('cannot cancel completed booking', async () => {
      const { profile, token: providerToken } = await createTestProvider();
      const service = await createServiceForProvider(profile.id);
      const { token: customerToken } = await createTestCustomer();

      const created = await createBooking(customerToken, profile.id, service.id, '2026-12-15', '10:00');
      await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'confirmed' });
      await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed' });
      const res = await request(app).patch(`/api/bookings/${created.body.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'cancelled_by_customer' });
      expect(res.status).toBe(400);
    });
  });
});
