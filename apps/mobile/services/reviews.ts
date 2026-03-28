import api from './api';
import type { CreateReviewInput, UpdateReviewInput } from '@barber-go/shared';

export async function createReview(data: CreateReviewInput) {
  const res = await api.post('/reviews', data);
  return res.data;
}

export async function updateReview(id: string, data: UpdateReviewInput) {
  const res = await api.put(`/reviews/${id}`, data);
  return res.data;
}

export async function deleteReview(id: string) {
  const res = await api.delete(`/reviews/${id}`);
  return res.data;
}
