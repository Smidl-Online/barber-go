import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { testPrisma, cleanDb, seedTestData, TestData } from './setup';

let testData: TestData;
let customerToken: string;
let providerToken: string;

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

beforeEach(async () => {
  await cleanDb();
  testData = await seedTestData();
  customerToken = await login('test.customer@test.cz');
  providerToken = await login('test.barber@test.cz');
});

afterAll(async () => {
  await cleanDb();
  await testPrisma.$disconnect();
});

describe('POST /api/bookings', () => {
  it('vytvoří rezervaci', async () => {
    const date = getNextMonday();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.start_time).toBe('10:00');
    expect(res.body.end_time).toBe('10:30');
    expect(res.body.location_type).toBe('salon');
  });

  it('vytvoří mobilní rezervaci s adresou', async () => {
    const date = getNextMonday();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '11:00',
        location_type: 'mobile',
        customer_address: 'Testovací 42, Praha',
        customer_lat: 50.08,
        customer_lng: 14.42,
      });

    expect(res.status).toBe(201);
    expect(res.body.location_type).toBe('mobile');
    expect(res.body.customer_address).toBe('Testovací 42, Praha');
  });

  it('odmítne mobilní rezervaci bez adresy', async () => {
    const date = getNextMonday();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'mobile',
      });

    expect(res.status).toBe(400);
  });

  it('detekuje kolizi rezervací', async () => {
    const date = getNextMonday();
    // First booking
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    // Conflicting booking
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    expect(res.status).toBe(409);
  });

  it('povolí nekolizní rezervaci', async () => {
    const date = getNextMonday();
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '11:00',
        location_type: 'salon',
      });

    expect(res.status).toBe(201);
  });

  it('odmítne rezervaci od providera', async () => {
    const date = getNextMonday();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    expect(res.status).toBe(403);
  });

  it('odmítne neautorizovaný požadavek', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({});

    expect(res.status).toBe(401);
  });
});

describe('GET /api/bookings', () => {
  it('vrátí zákazníkovy rezervace', async () => {
    const date = getNextMonday();
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(1);
  });

  it('vrátí providerovy rezervace', async () => {
    const date = getNextMonday();
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(1);
  });
});

describe('PATCH /api/bookings/:id/status', () => {
  let bookingId: string;

  beforeEach(async () => {
    const date = getNextMonday();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider_id: testData.provider.id,
        service_id: testData.service.id,
        booking_date: date,
        start_time: '10:00',
        location_type: 'salon',
      });
    bookingId = res.body.id;
  });

  it('provider potvrdí rezervaci', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('customer zruší rezervaci', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'cancelled_by_customer' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled_by_customer');
  });

  it('provider dokončí potvrzenou rezervaci', async () => {
    await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'confirmed' });

    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('odmítne dokončení nepotvrzené rezervace', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
  });

  it('customer nemůže potvrdit rezervaci', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
  });
});
