import { execSync } from 'child_process';

export default function () {
  const testDbUrl = 'postgresql://postgres:barbergo@localhost:5433/barbergo_test?schema=public';
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: testDbUrl },
  });
}
