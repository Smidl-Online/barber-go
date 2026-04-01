import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma, cleanDb, createTestCustomer, createTestProvider } from './helpers';

describe('Auth API', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  describe('POST /api/auth/register', () => {
    beforeEach(cleanDb);

    it('registers a customer', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'new@test.cz',
        password: 'Test1234',
        full_name: 'Nový Zákazník',
        role: 'customer',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('new@test.cz');
      expect(res.body.user.role).toBe('customer');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('registers a provider with profile', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'barber@test.cz',
        password: 'Test1234',
        full_name: 'Test Barber',
        role: 'provider',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('provider');
      // Check provider profile was created
      const profile = await prisma.providerProfile.findFirst({
        where: { user_id: res.body.user.id },
      });
      expect(profile).not.toBeNull();
      expect(profile!.display_name).toBe('Test Barber');
    });

    it('rejects duplicate email', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'dup@test.cz',
        password: 'Test1234',
        full_name: 'First',
        role: 'customer',
      });
      const res = await request(app).post('/api/auth/register').send({
        email: 'dup@test.cz',
        password: 'Test1234',
        full_name: 'Second',
        role: 'customer',
      });
      expect(res.status).toBe(409);
    });

    it('rejects invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'Test1234',
        full_name: 'Test',
        role: 'customer',
      });
      expect(res.status).toBe(400);
    });

    it('rejects short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'short@test.cz',
        password: '12345',
        full_name: 'Test',
        role: 'customer',
      });
      expect(res.status).toBe(400);
    });

    it('rejects missing full_name', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'noname@test.cz',
        password: 'Test1234',
        role: 'customer',
      });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'role@test.cz',
        password: 'Test1234',
        full_name: 'Test',
        role: 'admin',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(cleanDb);

    it('logs in with correct credentials', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'login@test.cz',
        password: 'Test1234',
        full_name: 'Login User',
        role: 'customer',
      });
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.cz',
        password: 'Test1234',
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('login@test.cz');
    });

    it('rejects wrong password', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'wrong@test.cz',
        password: 'Test1234',
        full_name: 'Test',
        role: 'customer',
      });
      const res = await request(app).post('/api/auth/login').send({
        email: 'wrong@test.cz',
        password: 'WrongPass',
      });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@test.cz',
        password: 'Test1234',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(cleanDb);

    it('refreshes tokens', async () => {
      const reg = await request(app).post('/api/auth/register').send({
        email: 'refresh@test.cz',
        password: 'Test1234',
        full_name: 'Refresh User',
        role: 'customer',
      });
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: reg.body.refreshToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('rejects missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid-token',
      });
      expect(res.status).toBe(500); // JWT verify throws
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(cleanDb);

    it('returns current user', async () => {
      const { token } = await createTestCustomer();
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBeDefined();
      expect(res.body.role).toBe('customer');
    });

    it('rejects unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(cleanDb);

    it('updates profile', async () => {
      const { token } = await createTestCustomer();
      const res = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`)
        .send({ full_name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.full_name).toBe('Updated Name');
    });

    it('updates phone', async () => {
      const { token } = await createTestCustomer();
      const res = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`)
        .send({ phone: '+420123456789' });
      expect(res.status).toBe(200);
      expect(res.body.phone).toBe('+420123456789');
    });

    it('rejects unauthenticated', async () => {
      const res = await request(app).put('/api/auth/profile').send({ full_name: 'Hacker' });
      expect(res.status).toBe(401);
    });
  });
});
