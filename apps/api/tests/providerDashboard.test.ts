import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma, cleanDb, createTestProvider, createTestCustomer } from './helpers';

describe('Provider Dashboard API', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  describe('GET /api/provider/profile', () => {
    beforeEach(cleanDb);
    it('returns provider profile', async () => {
      const { token } = await createTestProvider();
      const res = await request(app).get('/api/provider/profile').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.display_name).toBe('Test Barber Shop');
    });
    it('rejects unauthenticated', async () => {
      const res = await request(app).get('/api/provider/profile');
      expect(res.status).toBe(401);
    });
    it('rejects customer role', async () => {
      const { token } = await createTestCustomer();
      const res = await request(app).get('/api/provider/profile').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/provider/profile', () => {
    beforeEach(cleanDb);
    it('updates profile', async () => {
      const { token } = await createTestProvider();
      const res = await request(app).put('/api/provider/profile').set('Authorization', `Bearer ${token}`)
        .send({ display_name: 'Updated Name', bio: 'Updated bio' });
      expect(res.status).toBe(200);
      expect(res.body.display_name).toBe('Updated Name');
    });
    it('validates input', async () => {
      const { token } = await createTestProvider();
      const res = await request(app).put('/api/provider/profile').set('Authorization', `Bearer ${token}`)
        .send({ display_name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('Availability CRUD', () => {
    let token: string;
    beforeEach(async () => { await cleanDb(); token = (await createTestProvider()).token; });

    it('creates', async () => {
      const res = await request(app).post('/api/provider/availability').set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
      expect(res.status).toBe(201);
      expect(res.body.day_of_week).toBe(0);
    });
    it('lists', async () => {
      await request(app).post('/api/provider/availability').set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
      await request(app).post('/api/provider/availability').set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 1, start_time: '10:00', end_time: '18:00' });
      const res = await request(app).get('/api/provider/availability').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
    it('updates', async () => {
      const c = await request(app).post('/api/provider/availability').set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
      const res = await request(app).put(`/api/provider/availability/${c.body.id}`).set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '08:00', end_time: '16:00' });
      expect(res.status).toBe(200);
      expect(res.body.start_time).toBe('08:00');
    });
    it('deletes', async () => {
      const c = await request(app).post('/api/provider/availability').set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
      const res = await request(app).delete(`/api/provider/availability/${c.body.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const list = await request(app).get('/api/provider/availability').set('Authorization', `Bearer ${token}`);
      expect(list.body).toHaveLength(0);
    });
  });

  describe('Portfolio CRUD', () => {
    let token: string;
    beforeEach(async () => { await cleanDb(); token = (await createTestProvider()).token; });

    it('adds image', async () => {
      const res = await request(app).post('/api/provider/portfolio').set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/photo.jpg', caption: 'Fade cut' });
      expect(res.status).toBe(201);
      expect(res.body.image_url).toBe('https://example.com/photo.jpg');
    });
    it('lists images', async () => {
      await request(app).post('/api/provider/portfolio').set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/1.jpg' });
      await request(app).post('/api/provider/portfolio').set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/2.jpg' });
      const res = await request(app).get('/api/provider/portfolio').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
    it('deletes image', async () => {
      const c = await request(app).post('/api/provider/portfolio').set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/photo.jpg' });
      await request(app).delete(`/api/provider/portfolio/${c.body.id}`).set('Authorization', `Bearer ${token}`);
      const list = await request(app).get('/api/provider/portfolio').set('Authorization', `Bearer ${token}`);
      expect(list.body).toHaveLength(0);
    });
    it('rejects without image_url', async () => {
      const res = await request(app).post('/api/provider/portfolio').set('Authorization', `Bearer ${token}`)
        .send({ caption: 'No URL' });
      expect(res.status).toBe(400);
    });
  });
});
