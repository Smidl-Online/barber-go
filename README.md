# BarberGo

Mobilní aplikace pro rezervaci profesionálních barberů s možností „barber přijede k tobě" i „ty přijedeš k barberovi".

## Tech Stack

- **Backend:** Node.js + Express, PostgreSQL, Prisma ORM
- **Mobile:** React Native (Expo), Expo Router, TanStack Query, Zustand
- **Shared:** Zod validační schémata, TypeScript strict mode
- **Auth:** JWT (access + refresh tokens)

## Struktura projektu

```
barber-go/
├── apps/
│   ├── api/          # Backend (Express + Prisma)
│   └── mobile/       # React Native (Expo)
├── packages/
│   └── shared/       # Sdílené typy a Zod schémata
└── package.json      # Workspace root
```

## Spuštění

### 1. Instalace závislostí

```bash
npm install --legacy-peer-deps
```

### 2. PostgreSQL (Docker)

```bash
docker run -d --name barbergo-db \
  -e POSTGRES_PASSWORD=barbergo \
  -e POSTGRES_DB=barbergo \
  -p 5432:5432 \
  postgres:16
```

### 3. Backend

```bash
cd apps/api
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### 4. Mobilní aplikace

```bash
cd apps/mobile
npx expo start
```

## Seed Data — přihlašovací údaje

Heslo pro všechny účty: `heslo123`

**Zákazníci:**
- jan.zakaznik@test.cz
- petra.nova@test.cz

**Barbeři:**
- jakub.novak@barbergo.cz (Jakub Novák)
- martin.dvorak@barbergo.cz (Martin Dvořák)
- tomas.svoboda@barbergo.cz (Tomáš Svoboda)
- petr.kral@barbergo.cz (Petr Král)
- ondrej.horak@barbergo.cz (Ondřej Horák)

## API Endpointy

| Skupina | Endpointy |
|---------|-----------|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `GET /me` |
| Providers | `GET /api/providers`, `/:id`, `/:id/reviews`, `/:id/availability` |
| Bookings | `POST /api/bookings`, `GET /api/bookings`, `PATCH /:id/status` |
| Reviews | `POST /api/reviews`, `PUT /:id`, `DELETE /:id` |
| Provider Dashboard | `PUT /api/provider/profile`, CRUD `/services`, `/availability`, `/portfolio` |

## Rozšiřitelnost

Architektura je domain-agnostic — `ProviderProfile.category` je dynamický string.
Pro přidání masáží nebo kosmetiky stačí přidat seed data s `category: 'massage'`.
