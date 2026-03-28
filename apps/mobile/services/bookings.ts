import api from './api';
import type { CreateBookingInput, UpdateBookingStatusInput } from '@barber-go/shared';

export async function createBooking(data: CreateBookingInput) {
  const res = await api.post('/bookings', data);
  return res.data;
}

export async function getBookings(filter?: string) {
  const res = await api.get('/bookings', { params: { filter } });
  return res.data;
}

export async function getBooking(id: string) {
  const res = await api.get(`/bookings/${id}`);
  return res.data;
}

export async function updateBookingStatus(id: string, data: UpdateBookingStatusInput) {
  const res = await api.patch(`/bookings/${id}/status`, data);
  return res.data;
}
