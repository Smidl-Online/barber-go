import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { testPrisma, cleanDb, seedTestData, TestData } from './setup';

let testData: TestData;
let customerToken: string;
let providerToken: string;
let completedBookingId: string;

async function login(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'heslo123' });
  return res.body.accessToken;
}

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
}

async function createCompletedBooking(): Promise<string> {
  const date = getNextMonday();
  const booking = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      provider_id: testData.provider.id,
      service_id: testData.service.id,
      booking_date: date,
      start_time: '10:00',
      location_type: 'salon',
    });

  await request(app)
    .patch(`/api/bookings/${booking.body.id}/status`)
    .set('Authorization', `Bearer ${providerToken}`)
    .send({ status: 'confirmed' });

  await request(app)
    .patch(`/api/bookings/${booking.body.id}/status`)
    .set('Authorization', `Bearer ${providerToken}`)
    .send({ status: 'completed' });

  return booking.body.id;
}

beforeEach(async () => {
  await cleanDb();
  testData = await seedTestData();
  customerToken = await login('test.customer@test.cz');
  providerToken = await login('test.barber@test.cz');
  completedBookingId = await createCompletedBooking();
});

afterAll(async () => {
  await cleanDb();
  await testPrisma.$disconnect();
});

describe('POST /api/reviews', () => {
  it('přidá recenzi ke dokončené rezervaci', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 5,
        comment: 'Skvělý střih!',
      });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe('Skvělý střih!');

    // Check provider rating updated
    const provider = await testPrisma.providerProfile.findUnique({
      where: { id: testData.provider.id },
    });
    expect(Number(provider!.avg_rating)).toBe(5);
    expect(provider!.review_count).toBe(1);
  });

  it('odmítne duplicitní recenzi', async () => {
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 5,
        comment: 'Super',
      });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 4,
        comment: 'Ještě jednou',
      });

    expect(res.status).toBe(409);
  });

  it('odmítne recenzi k nedokončené rezervaci', async () => {
    const date = getNextMonday();
    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '14:00',
        location_type: 'salon',
      });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: booking.body.id,
        rating: 5,
        comment: 'Ještě není hotovo',
      });

    expect(res.status).toBe(400);
  });

  it('odmítne recenzi od providera', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 5,
        comment: 'Nemůžu',
      });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/reviews/:id', () => {
  it('upraví vlastní recenzi', async () => {
    const create = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 4,
        comment: 'Dobré',
      });

    const res = await request(app)
      .put(`/api/reviews/${create.body.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'Vlastně výborné!' });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe('Vlastně výborné!');
  });
});

describe('DELETE /api/reviews/:id', () => {
  it('smaže vlastní recenzi a aktualizuje rating', async () => {
    const create = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: completedBookingId,
        rating: 5,
        comment: 'Skvělé',
      });

    const res = await request(app)
      .delete(`/api/reviews/${create.body.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);

    // Check rating reset
    const provider = await testPrisma.providerProfile.findUnique({
      where: { id: testData.provider.id },
    });
    expect(Number(provider!.avg_rating)).toBe(0);
    expect(provider!.review_count).toBe(0);
  });
});
