import { PrismaClient, UserRole, LocationType, BookingLocationType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.portfolioImage.deleteMany();
  await prisma.service.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('heslo123', 10);

  // --- PROVIDERS ---
  const providers = [
    {
      email: 'jakub.novak@barbergo.cz',
      full_name: 'Jakub Novák',
      phone: '+420 601 111 111',
      profile: {
        display_name: 'Jakub "The Blade" Novák',
        bio: 'Barber s 8letou praxí. Specializuji se na klasické střihy a hot towel shave. Najdete mě v centru Prahy.',
        category: 'barber',
        experience_years: 8,
        profile_photo_url: 'https://picsum.photos/seed/barber1/400/400',
        location_type: LocationType.salon,
        salon_address: 'Dlouhá 12, Praha 1',
        salon_lat: 50.0892,
        salon_lng: 14.4263,
      },
    },
    {
      email: 'martin.dvorak@barbergo.cz',
      full_name: 'Martin Dvořák',
      phone: '+420 602 222 222',
      profile: {
        display_name: 'Martin Dvořák Barbershop',
        bio: 'Moderní barbershop na Vinohradech. Fade, skin fade, textury — to je můj svět. Přijďte si odpočinout.',
        category: 'barber',
        experience_years: 5,
        profile_photo_url: 'https://picsum.photos/seed/barber2/400/400',
        location_type: LocationType.salon,
        salon_address: 'Vinohradská 45, Praha 2',
        salon_lat: 50.0755,
        salon_lng: 14.4378,
      },
    },
    {
      email: 'tomas.svoboda@barbergo.cz',
      full_name: 'Tomáš Svoboda',
      phone: '+420 603 333 333',
      profile: {
        display_name: 'Tomáš - Mobilní Barber',
        bio: 'Přijedu k vám domů nebo do kanceláře. Praha a okolí do 20 km. Vše mám s sebou, vy si jen sednete.',
        category: 'barber',
        experience_years: 3,
        profile_photo_url: 'https://picsum.photos/seed/barber3/400/400',
        location_type: LocationType.mobile,
        service_radius_km: 20,
        salon_lat: 50.0755,
        salon_lng: 14.4178,
      },
    },
    {
      email: 'petr.kral@barbergo.cz',
      full_name: 'Petr Král',
      phone: '+420 604 444 444',
      profile: {
        display_name: 'Petr Král - Barber On The Go',
        bio: 'Jezdím po celé Praze. Svatby, firemní akce, domácí návštěvy. Kvalitní střih kdekoli potřebujete.',
        category: 'barber',
        experience_years: 6,
        profile_photo_url: 'https://picsum.photos/seed/barber4/400/400',
        location_type: LocationType.mobile,
        service_radius_km: 30,
        salon_lat: 50.0833,
        salon_lng: 14.4167,
      },
    },
    {
      email: 'ondrej.horak@barbergo.cz',
      full_name: 'Ondřej Horák',
      phone: '+420 605 555 555',
      profile: {
        display_name: 'Ondřej Horák - Dual Mode Barber',
        bio: 'Mám salon na Žižkově, ale klidně přijedu i k vám. 10 let zkušeností, stovky spokojených zákazníků.',
        category: 'barber',
        experience_years: 10,
        profile_photo_url: 'https://picsum.photos/seed/barber5/400/400',
        location_type: LocationType.both,
        salon_address: 'Husitská 78, Praha 3',
        salon_lat: 50.0876,
        salon_lng: 14.4498,
        service_radius_km: 15,
      },
    },
  ];

  const providerProfiles = [];

  for (const p of providers) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        password_hash: passwordHash,
        full_name: p.full_name,
        phone: p.phone,
        role: UserRole.provider,
        provider_profile: {
          create: p.profile,
        },
      },
      include: { provider_profile: true },
    });
    providerProfiles.push(user.provider_profile!);
  }

  // --- SERVICES ---
  const serviceTemplates = [
    { name: 'Klasický střih', description: 'Střih nůžkami, mytí, styling', duration_minutes: 30, price: 400 },
    { name: 'Fade střih', description: 'Moderní fade s přechodem', duration_minutes: 40, price: 500 },
    { name: 'Úprava vousů', description: 'Tvarování a holení vousů', duration_minutes: 20, price: 300 },
    { name: 'Hot towel shave', description: 'Klasické holení s horkým ručníkem', duration_minutes: 35, price: 450 },
    { name: 'Combo: střih + vousy', description: 'Kompletní balíček — střih a úprava vousů', duration_minutes: 50, price: 650 },
    { name: 'Dětský střih', description: 'Střih pro děti do 12 let', duration_minutes: 20, price: 250 },
    { name: 'Skin fade', description: 'Skin fade na nulu s ostrým přechodem', duration_minutes: 45, price: 550 },
    { name: 'Head shave', description: 'Kompletní oholení hlavy břitvou', duration_minutes: 30, price: 350 },
  ];

  for (let i = 0; i < providerProfiles.length; i++) {
    const profile = providerProfiles[i];
    // Each provider gets 3-5 services
    const count = 3 + (i % 3);
    const offset = i % 2;
    for (let j = 0; j < count; j++) {
      const tmpl = serviceTemplates[(j + offset) % serviceTemplates.length];
      await prisma.service.create({
        data: {
          provider_id: profile.id,
          name: tmpl.name,
          description: tmpl.description,
          duration_minutes: tmpl.duration_minutes,
          price: tmpl.price + (i * 20) - 40, // vary prices
          sort_order: j,
        },
      });
    }
  }

  // --- AVAILABILITY ---
  for (const profile of providerProfiles) {
    const isEarly = Math.random() > 0.5;
    const days = [0, 1, 2, 3, 4]; // Po-Pá
    if (Math.random() > 0.5) days.push(5); // some work Saturdays

    for (const day of days) {
      await prisma.availability.create({
        data: {
          provider_id: profile.id,
          day_of_week: day,
          start_time: isEarly ? '08:00' : '10:00',
          end_time: isEarly ? '16:00' : '20:00',
          is_active: true,
        },
      });
    }
  }

  // --- PORTFOLIO IMAGES ---
  for (let i = 0; i < providerProfiles.length; i++) {
    const profile = providerProfiles[i];
    const imageCount = 3 + (i % 3);
    for (let j = 0; j < imageCount; j++) {
      await prisma.portfolioImage.create({
        data: {
          provider_id: profile.id,
          image_url: `https://picsum.photos/seed/portfolio-${i}-${j}/600/400`,
          caption: ['Fade střih', 'Klasický look', 'Úprava vousů', 'Před a po', 'Svatební styling'][j % 5],
          sort_order: j,
        },
      });
    }
  }

  // --- CUSTOMERS ---
  const customer1 = await prisma.user.create({
    data: {
      email: 'jan.zakaznik@test.cz',
      password_hash: passwordHash,
      full_name: 'Jan Zákazník',
      phone: '+420 700 100 100',
      role: UserRole.customer,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'petra.nova@test.cz',
      password_hash: passwordHash,
      full_name: 'Petra Nová',
      phone: '+420 700 200 200',
      role: UserRole.customer,
    },
  });

  // --- BOOKINGS ---
  const services = await prisma.service.findMany();

  const bookingData: Array<{
    customer_id: string;
    provider_id: string;
    service_id: string;
    status: BookingStatus;
    booking_date: Date;
    start_time: string;
    end_time: string;
    location_type: BookingLocationType;
    customer_address?: string;
    note?: string;
  }> = [];

  // Completed bookings for reviews
  for (let i = 0; i < 3; i++) {
    const svc = services[i % services.length];
    bookingData.push({
      customer_id: customer1.id,
      provider_id: svc.provider_id,
      service_id: svc.id,
      status: BookingStatus.completed,
      booking_date: new Date('2026-03-15'),
      start_time: `${10 + i}:00`,
      end_time: `${10 + i}:${svc.duration_minutes}`,
      location_type: BookingLocationType.salon,
      note: i === 0 ? 'Poprvé u vás, těším se' : undefined,
    });
  }

  for (let i = 0; i < 2; i++) {
    const svc = services[(i + 3) % services.length];
    bookingData.push({
      customer_id: customer2.id,
      provider_id: svc.provider_id,
      service_id: svc.id,
      status: BookingStatus.completed,
      booking_date: new Date('2026-03-18'),
      start_time: `${14 + i}:00`,
      end_time: `${14 + i}:${svc.duration_minutes}`,
      location_type: BookingLocationType.mobile,
      customer_address: 'Štefánikova 5, Praha 5',
    });
  }

  // Upcoming bookings
  bookingData.push({
    customer_id: customer1.id,
    provider_id: providerProfiles[0].id,
    service_id: services[0].id,
    status: BookingStatus.confirmed,
    booking_date: new Date('2026-04-05'),
    start_time: '10:00',
    end_time: '10:30',
    location_type: BookingLocationType.salon,
  });

  bookingData.push({
    customer_id: customer2.id,
    provider_id: providerProfiles[2].id,
    service_id: services[5 % services.length].id,
    status: BookingStatus.pending,
    booking_date: new Date('2026-04-10'),
    start_time: '15:00',
    end_time: '15:40',
    location_type: BookingLocationType.mobile,
    customer_address: 'Na Příkopě 22, Praha 1',
  });

  // Cancelled booking
  bookingData.push({
    customer_id: customer1.id,
    provider_id: providerProfiles[1].id,
    service_id: services[2 % services.length].id,
    status: BookingStatus.cancelled_by_customer,
    booking_date: new Date('2026-03-20'),
    start_time: '11:00',
    end_time: '11:30',
    location_type: BookingLocationType.salon,
  });

  const createdBookings = [];
  for (const b of bookingData) {
    createdBookings.push(await prisma.booking.create({ data: b }));
  }

  // --- REVIEWS ---
  const reviewTexts = [
    { rating: 5, comment: 'Skvělý střih, přesně co jsem chtěl. Určitě se vrátím!' },
    { rating: 4, comment: 'Velmi příjemná atmosféra a profesionální přístup. Drobná výtka k čekací době.' },
    { rating: 5, comment: 'Nejlepší barber v Praze! Vousy perfektní, střih taky.' },
    { rating: 4, comment: 'Solidní práce, fajn výsledek. Příště zkusím i hot towel shave.' },
    { rating: 3, comment: 'Dobrý střih, ale trochu spěchal. Celkově OK.' },
    { rating: 5, comment: 'Parádní fade, přesně podle fotky co jsem ukázal. Doporučuji!' },
    { rating: 5, comment: 'Přijel včas, vše měl připravené. Profi servis přímo doma.' },
    { rating: 4, comment: 'Konečně barber, co rozumí vousům. Skvělá práce s břitvou.' },
    { rating: 5, comment: 'Moc pohodový přístup, bavili jsme se celou dobu. A střih super!' },
    { rating: 4, comment: 'Čistý salon, příjemný personál. Střih přesně podle dohody.' },
    { rating: 5, comment: 'Chodím pravidelně, vždy spokojen. Kvalita konstantní.' },
    { rating: 3, comment: 'Střih byl fajn, ale salon by mohl být čistší.' },
    { rating: 5, comment: 'Fantazie! Manžel vypadá o 10 let mladší. Děkujeme!' },
    { rating: 4, comment: 'Rychle a kvalitně, co víc si přát. Příjemná cena.' },
    { rating: 5, comment: 'Hot towel shave byl zážitek! Jako v italském filmu.' },
  ];

  const completedBookings = createdBookings.filter((b) => b.status === 'completed');
  for (let i = 0; i < completedBookings.length; i++) {
    const booking = completedBookings[i];
    const review = reviewTexts[i % reviewTexts.length];
    await prisma.review.create({
      data: {
        booking_id: booking.id,
        customer_id: booking.customer_id,
        provider_id: booking.provider_id,
        rating: review.rating,
        comment: review.comment,
      },
    });
  }

  // Update avg_rating and review_count
  const allProfiles = await prisma.providerProfile.findMany();
  for (const profile of allProfiles) {
    const reviews = await prisma.review.findMany({
      where: { provider_id: profile.id },
    });
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          avg_rating: Math.round(avg * 10) / 10,
          review_count: reviews.length,
        },
      });
    }
  }

  console.log('✅ Seed complete!\n');
  console.log('📋 Přihlašovací údaje:');
  console.log('─'.repeat(50));
  console.log('🔑 Heslo pro všechny účty: heslo123\n');
  console.log('👤 Zákazníci:');
  console.log('   jan.zakaznik@test.cz');
  console.log('   petra.nova@test.cz\n');
  console.log('💈 Barbeři:');
  for (const p of providers) {
    console.log(`   ${p.email} (${p.full_name})`);
  }
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
