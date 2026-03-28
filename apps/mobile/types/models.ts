export interface Provider {
  id: string;
  display_name: string;
  bio: string;
  category: string;
  profile_photo_url: string | null;
  location_type: 'salon' | 'mobile' | 'both';
  salon_address: string | null;
  avg_rating: number;
  review_count: number;
  min_price: number | null;
  distance_km: number | null;
}

export interface ProviderDetail extends Provider {
  user_id: string;
  experience_years: number | null;
  salon_lat: number | null;
  salon_lng: number | null;
  service_radius_km: number | null;
  is_active: boolean;
  services: Service[];
  portfolio_images: PortfolioImage[];
  availability: AvailabilitySlot[];
  reviews: ReviewWithCustomer[];
  user: { full_name: string; email: string };
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  price_note: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PortfolioImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  location_type: 'salon' | 'mobile';
  customer_address: string | null;
  note: string | null;
  service: { name: string; duration_minutes: number; price: number };
  provider: { display_name: string; profile_photo_url: string | null };
  customer?: { full_name: string };
  review?: { id: string } | null;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewWithCustomer extends Review {
  customer: { full_name: string; avatar_url: string | null };
}
