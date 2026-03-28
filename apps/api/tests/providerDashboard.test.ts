import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma, cleanDb, createTestProvider, createTestCustomer } from './helpers';

describe('Provider Dashboard API', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/provider/profile', () => {
    beforeEach(async () => {
      await cleanDb();
    });

    it('returns provider profile', async () => {
      const { token } = await createTestProvider();
      const res = await request(app).get('/api/provider/profile').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.display_name).toBe('Test Barber Shop');
      expect(res.body.category).toBe('barber');
    });

    it('rejects unauthenticated request', async () => {
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
    beforeEach(async () => {
      await cleanDb();
    });

    it('updates provider profile', async () => {
      const { token } = await createTestProvider();
      const res = await request(app)
        .put('/api/provider/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ display_name: 'Updated Name', bio: 'Updated bio' });
      expect(res.status).toBe(200);
      expect(res.body.display_name).toBe('Updated Name');
      expect(res.body.bio).toBe('Updated bio');
    });

    it('validates input', async () => {
      const { token } = await createTestProvider();
      const res = await request(app)
        .put('/api/provider/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ display_name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('Availability CRUD', () => {
    let token: string;

    beforeEach(async () => {
      await cleanDb();
      const provider = await createTestProvider();
      token = provider.token;
    });

    it('creates availability', async () => {
      const res = await request(app)
        .post('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
      expect(res.status).toBe(201);
      expect(res.body.day_of_week).toBe(0);
      expect(res.body.start_time).toBe('09:00');
    });

    it('lists availability', async () => {
      await request(app)
        .post('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
      await request(app)
        .post('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 1, start_time: '10:00', end_time: '18:00' });

      const res = await request(app)
        .get('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('updates availability', async () => {
      const create = await request(app)
        .post('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });

      const res = await request(app)
        .put(`/api/provider/availability/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '08:00', end_time: '16:00' });
      expect(res.status).toBe(200);
      expect(res.body.start_time).toBe('08:00');
    });

    it('deletes availability', async () => {
      const create = await request(app)
        .post('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });

      const res = await request(app)
        .delete(`/api/provider/availability/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const list = await request(app)
        .get('/api/provider/availability')
        .set('Authorization', `Bearer ${token}`);
      expect(list.body).toHaveLength(0);
    });
  });

  describe('Portfolio CRUD', () => {
    let token: string;

    beforeEach(async () => {
      await cleanDb();
      const provider = await createTestProvider();
      token = provider.token;
    });

    it('adds portfolio image', async () => {
      const res = await request(app)
        .post('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/photo.jpg', caption: 'Fade cut' });
      expect(res.status).toBe(201);
      expect(res.body.image_url).toBe('https://example.com/photo.jpg');
      expect(res.body.caption).toBe('Fade cut');
    });

    it('lists portfolio images', async () => {
      await request(app)
        .post('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/1.jpg' });
      await request(app)
        .post('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/2.jpg' });

      const res = await request(app)
        .get('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('deletes portfolio image', async () => {
      const create = await request(app)
        .post('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_url: 'https://example.com/photo.jpg' });

      const res = await request(app)
        .delete(`/api/provider/portfolio/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const list = await request(app)
        .get('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`);
      expect(list.body).toHaveLength(0);
    });

    it('rejects without image_url', async () => {
      const res = await request(app)
        .post('/api/provider/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .send({ caption: 'No URL' });
      expect(res.status).toBe(400);
    });
  });
});
