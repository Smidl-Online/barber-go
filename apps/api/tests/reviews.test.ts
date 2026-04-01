import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma, cleanDb, createTestProvider, createTestCustomer } from './helpers';

describe('Reviews API', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  async function setupCompletedBooking() {
    const { profile, token: providerToken } = await createTestProvider();
    const service = await prisma.service.create({
      data: {
        provider_id: profile.id,
        name: 'Střih',
        duration_minutes: 30,
        price: 350,
        is_active: true,
        sort_order: 0,
      },
    });
    const { token: customerToken, user: customer } = await createTestCustomer();

    const booking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: profile.id,
        service_id: service.id,
        booking_date: '2026-12-15',
        start_time: '10:00',
        location_type: 'salon',
      });

    // Confirm then complete
    await request(app).patch(`/api/bookings/${booking.body.id}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'confirmed' });
    await request(app).patch(`/api/bookings/${booking.body.id}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'completed' });

    return { profile, providerToken, customerToken, customer, bookingId: booking.body.id };
  }

  describe('POST /api/reviews', () => {
    beforeEach(cleanDb);

    it('creates a review for completed booking', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 5, comment: 'Skvělý střih!' });
      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(5);
      expect(res.body.comment).toBe('Skvělý střih!');
    });

    it('updates provider avg_rating', async () => {
      const { customerToken, bookingId, profile } = await setupCompletedBooking();
      await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 4 });

      const updated = await prisma.providerProfile.findUnique({ where: { id: profile.id } });
      expect(Number(updated!.avg_rating)).toBe(4);
      expect(updated!.review_count).toBe(1);
    });

    it('rejects review for pending booking', async () => {
      const { profile } = await createTestProvider();
      const service = await prisma.service.create({
        data: {
          provider_id: profile.id,
          name: 'Střih',
          duration_minutes: 30,
          price: 350,
          is_active: true,
          sort_order: 0,
        },
      });
      const { token } = await createTestCustomer();
      const booking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
        .send({
          provider_id: profile.id,
          service_id: service.id,
          booking_date: '2026-12-15',
          start_time: '10:00',
          location_type: 'salon',
        });

      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${token}`)
        .send({ booking_id: booking.body.id, rating: 5 });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate review', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 5 });
      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 4 });
      expect(res.status).toBe(409);
    });

    it('rejects provider creating review', async () => {
      const { providerToken, bookingId } = await setupCompletedBooking();
      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${providerToken}`)
        .send({ booking_id: bookingId, rating: 5 });
      expect(res.status).toBe(403);
    });

    it('rejects invalid rating', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 6 });
      expect(res.status).toBe(400);
    });

    it('rejects rating below 1', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 0 });
      expect(res.status).toBe(400);
    });

    it('rejects other customer reviewing', async () => {
      const { bookingId } = await setupCompletedBooking();
      const { token: otherToken } = await createTestCustomer();
      const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${otherToken}`)
        .send({ booking_id: bookingId, rating: 5 });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    beforeEach(cleanDb);

    it('updates own review', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const created = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 3 });
      const res = await request(app).put(`/api/reviews/${created.body.id}`).set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 5, comment: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.rating).toBe(5);
      expect(res.body.comment).toBe('Updated');
    });

    it('rejects updating other\'s review', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const created = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 3 });
      const { token: otherToken } = await createTestCustomer();
      const res = await request(app).put(`/api/reviews/${created.body.id}`).set('Authorization', `Bearer ${otherToken}`)
        .send({ rating: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    beforeEach(cleanDb);

    it('deletes own review', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const created = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 4 });
      const res = await request(app).delete(`/api/reviews/${created.body.id}`).set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
    });

    it('rejects deleting other\'s review', async () => {
      const { customerToken, bookingId } = await setupCompletedBooking();
      const created = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 4 });
      const { token: otherToken } = await createTestCustomer();
      const res = await request(app).delete(`/api/reviews/${created.body.id}`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });

    it('updates provider rating after delete', async () => {
      const { customerToken, bookingId, profile } = await setupCompletedBooking();
      const created = await request(app).post('/api/reviews').set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: bookingId, rating: 4 });
      await request(app).delete(`/api/reviews/${created.body.id}`).set('Authorization', `Bearer ${customerToken}`);

      const updated = await prisma.providerProfile.findUnique({ where: { id: profile.id } });
      expect(updated!.review_count).toBe(0);
    });
  });
});
