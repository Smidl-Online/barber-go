import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
  full_name: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  role: z.enum(['customer', 'provider']),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(1, 'Heslo je povinné'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
