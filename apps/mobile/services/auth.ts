import api from './api';
import type { RegisterInput, LoginInput } from '@barber-go/shared';

export async function register(data: RegisterInput) {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function login(data: LoginInput) {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}
