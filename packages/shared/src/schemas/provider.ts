import { z } from 'zod';

export const updateProviderProfileSchema = z.object({
  display_name: z.string().min(2).optional(),
  bio: z.string().optional(),
  category: z.string().optional(),
  experience_years: z.number().int().min(0).optional(),
  profile_photo_url: z.string().url().optional(),
  location_type: z.enum(['salon', 'mobile', 'both']).optional(),
  salon_address: z.string().optional(),
  salon_lat: z.number().optional(),
  salon_lng: z.number().optional(),
  service_radius_km: z.number().int().min(1).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(5),
  price: z.number().min(0),
  price_note: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createAvailabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  is_active: z.boolean().optional(),
});

export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
