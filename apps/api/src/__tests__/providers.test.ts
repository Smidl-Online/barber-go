import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { testPrisma, cleanDb, seedTestData, TestData } from './setup';

let testData: TestData;

beforeEach(async () => {
  await cleanDb();
  testData = await seedTestData();
});

afterAll(async () => {
  await cleanDb();
  await testPrisma.$disconnect();
});

describe('GET /api/providers', () => {
  it('vrátí seznam providerů', async () => {
    const res = await request(app).get('/api/providers');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].display_name).toBe('Test Barber Shop');
    expect(res.body.total).toBe(1);
  });

  it('filtruje podle min_rating', async () => {
    const res = await request(app).get('/api/providers?min_rating=4');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // avg_rating is 0
  });

  it('filtruje podle location_type=salon', async () => {
    const res = await request(app).get('/api/providers?location_type=salon');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // 'both' includes salon
  });

  it('filtruje podle location_type=mobile', async () => {
    const res = await request(app).get('/api/providers?location_type=mobile');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // 'both' includes mobile
  });

  it('hledá podle jména', async () => {
    const res = await request(app).get('/api/providers?search=Barber');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('vrátí prázdný výsledek pro neexistující search', async () => {
    const res = await request(app).get('/api/providers?search=neexistuje');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('podporuje stránkování', async () => {
    const res = await request(app).get('/api/providers?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
  });

  it('filtruje podle geo lokace', async () => {
    // Praha centrum - blízko testovacího barbera
    const res = await request(app).get('/api/providers?lat=50.08&lng=14.42&radius_km=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].distance_km).toBeDefined();
    expect(res.body.data[0].distance_km).toBeLessThan(5);
  });

  it('filtruje vzdálené providery dle radiusu', async () => {
    // Brno - daleko
    const res = await request(app).get('/api/providers?lat=49.19&lng=16.61&radius_km=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});

describe('GET /api/providers/:id', () => {
  it('vrátí detail providera', async () => {
    const res = await request(app).get(`/api/providers/${testData.provider.id}`);

    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Test Barber Shop');
    expect(res.body.services).toBeInstanceOf(Array);
    expect(res.body.services.length).toBe(1);
    expect(res.body.availability).toBeInstanceOf(Array);
    expect(res.body.user).toBeDefined();
  });

  it('vrátí 404 pro neexistujícího providera', async () => {
    const res = await request(app).get('/api/providers/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/providers/:id/reviews', () => {
  it('vrátí prázdné recenze', async () => {
    const res = await request(app).get(`/api/providers/${testData.provider.id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(0);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/providers/:id/availability', () => {
  it('vrátí dostupné sloty pro pondělí', async () => {
    // Find next Monday
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    const dateStr = nextMonday.toISOString().split('T')[0];

    const res = await request(app).get(
      `/api/providers/${testData.provider.id}/availability?date=${dateStr}&service_id=${testData.service.id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.slots).toBeInstanceOf(Array);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots).toContain('09:00');
    expect(res.body.slots).toContain('16:00');
  });

  it('vrátí prázdné sloty pro neděli', async () => {
    // Find next Sunday
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    const dateStr = nextSunday.toISOString().split('T')[0];

    const res = await request(app).get(
      `/api/providers/${testData.provider.id}/availability?date=${dateStr}`
    );

    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBe(0);
  });

  it('vrátí chybu bez parametru date', async () => {
    const res = await request(app).get(`/api/providers/${testData.provider.id}/availability`);
    expect(res.status).toBe(400);
  });
});
