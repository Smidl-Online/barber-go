import api from './api';

export async function getProviders(params?: Record<string, string>) {
  const res = await api.get('/providers', { params });
  return res.data;
}

export async function getProvider(id: string) {
  const res = await api.get(`/providers/${id}`);
  return res.data;
}

export async function getProviderReviews(id: string, params?: Record<string, string>) {
  const res = await api.get(`/providers/${id}/reviews`, { params });
  return res.data;
}

export async function getProviderAvailability(
  id: string,
  date: string,
  serviceId?: string
) {
  const res = await api.get(`/providers/${id}/availability`, {
    params: { date, service_id: serviceId },
  });
  return res.data;
}
