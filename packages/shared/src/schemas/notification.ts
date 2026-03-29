import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  token: z.string().regex(/^ExponentPushToken\[.+\]$/, 'Neplatný formát push tokenu'),
  platform: z.enum(['expo', 'ios', 'android']).default('expo'),
});

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
