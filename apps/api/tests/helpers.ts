import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateTokens } from '../src/utils/jwt';

export const prisma = new PrismaClient();

export async function cleanDb() {
  await prisma.$executeRawUnsafe('TRUNCATE reviews, bookings, portfolio_images, availability, services, provider_profiles, users CASCADE');
}

export async function createTestProvider() {
  const hash = await bcrypt.hash('Test1234', 10);
  const user = await prisma.user.create({
    data: {
      email: `provider-${Date.now()}@test.cz`,
      password_hash: hash,
      full_name: 'Test Barber',
      role: 'provider',
    },
  });
  const profile = await prisma.providerProfile.create({
    data: {
      user_id: user.id,
      display_name: 'Test Barber Shop',
      bio: 'Testovací barber',
      category: 'barber',
      location_type: 'both',
      salon_address: 'Testovací 123, Praha',
    },
  });
  const { accessToken } = generateTokens({ userId: user.id, role: 'provider' });
  return { user, profile, token: accessToken };
}

export async function createTestCustomer() {
  const hash = await bcrypt.hash('Test1234', 10);
  const user = await prisma.user.create({
    data: {
      email: `customer-${Date.now()}@test.cz`,
      password_hash: hash,
      full_name: 'Test Customer',
      role: 'customer',
    },
  });
  const { accessToken } = generateTokens({ userId: user.id, role: 'customer' });
  return { user, token: accessToken };
}
