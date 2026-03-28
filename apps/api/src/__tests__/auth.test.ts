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

describe('POST /api/auth/register', () => {
  it('registruje nového zákazníka', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'novy@test.cz',
        password: 'heslo123',
        full_name: 'Nový Uživatel',
        role: 'customer',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('novy@test.cz');
    expect(res.body.user.role).toBe('customer');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('registruje providera s vytvořeným profilem', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'novy.barber@test.cz',
        password: 'heslo123',
        full_name: 'Nový Barber',
        role: 'provider',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('provider');

    const profile = await testPrisma.providerProfile.findFirst({
      where: { user_id: res.body.user.id },
    });
    expect(profile).toBeTruthy();
    expect(profile!.display_name).toBe('Nový Barber');
  });

  it('odmítne duplicitní email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test.customer@test.cz',
        password: 'heslo123',
        full_name: 'Duplikát',
        role: 'customer',
      });

    expect(res.status).toBe(409);
  });

  it('odmítne nevalidní data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('přihlásí existujícího uživatele', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.customer@test.cz', password: 'heslo123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test.customer@test.cz');
    expect(res.body.accessToken).toBeDefined();
  });

  it('odmítne špatné heslo', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.customer@test.cz', password: 'spatne' });

    expect(res.status).toBe(401);
  });

  it('odmítne neexistující email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'neexistuje@test.cz', password: 'heslo123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('obnoví token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.customer@test.cz', password: 'heslo123' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  it('vrátí profil přihlášeného uživatele', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.customer@test.cz', password: 'heslo123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test.customer@test.cz');
  });

  it('odmítne neautorizovaný požadavek', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
