import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { providersRouter } from './routes/providers';
import { bookingsRouter } from './routes/bookings';
import { reviewsRouter } from './routes/reviews';
import { providerDashboardRouter } from './routes/providerDashboard';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/providers', providersRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/provider', providerDashboardRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 BarberGo API running on port ${PORT}`);
  });
}

export default app;
