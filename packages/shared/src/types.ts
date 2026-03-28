export type UserRole = 'customer' | 'provider';
export type LocationType = 'salon' | 'mobile' | 'both';
export type BookingLocationType = 'salon' | 'mobile';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_customer'
  | 'cancelled_by_provider'
  | 'completed'
  | 'no_show';

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
