import { z } from 'zod';

export const createBookingSchema = z.object({
  provider_id: z.string().uuid(),
  service_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formát: YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formát: HH:MM'),
  location_type: z.enum(['salon', 'mobile']),
  customer_address: z.string().optional(),
  customer_lat: z.number().optional(),
  customer_lng: z.number().optional(),
  note: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum([
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_provider',
    'completed',
    'no_show',
  ]),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
