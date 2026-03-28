import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const testDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:barbergo@localhost:5433/barbergo_test?schema=public';
export const testPrisma = new PrismaClient({ datasourceUrl: testDbUrl });

export async function cleanDb() {
  await testPrisma.$executeRawUnsafe('TRUNCATE reviews, bookings, portfolio_images, services, availability, provider_profiles, users CASCADE');
}

export async function seedTestData() {
  const passwordHash = await bcrypt.hash('heslo123', 10);

  // Create customer
  const customer = await testPrisma.user.create({
    data: {
      email: 'test.customer@test.cz',
      password_hash: passwordHash,
      full_name: 'Test Zákazník',
      role: 'customer',
    },
  });

  // Create provider user
  const providerUser = await testPrisma.user.create({
    data: {
      email: 'test.barber@test.cz',
      password_hash: passwordHash,
      full_name: 'Test Barber',
      role: 'provider',
    },
  });

  // Create provider profile
  const provider = await testPrisma.providerProfile.create({
    data: {
      user_id: providerUser.id,
      display_name: 'Test Barber Shop',
      bio: 'Testovací barber pro testy',
      category: 'barber',
      location_type: 'both',
      salon_address: 'Testovací 1, Praha 1',
      salon_lat: 50.0875,
      salon_lng: 14.4213,
      service_radius_km: 10,
      avg_rating: 0,
      review_count: 0,
      is_active: true,
    },
  });

  // Create service
  const service = await testPrisma.service.create({
    data: {
      provider_id: provider.id,
      name: 'Testovací střih',
      description: 'Základní střih pro testy',
      duration_minutes: 30,
      price: 400,
      is_active: true,
      sort_order: 0,
    },
  });

  // Create availability (Monday-Friday 9:00-17:00)
  for (let day = 0; day < 5; day++) {
    await testPrisma.availability.create({
      data: {
        provider_id: provider.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      },
    });
  }

  return { customer, providerUser, provider, service };
}

export type TestData = Awaited<ReturnType<typeof seedTestData>>;
