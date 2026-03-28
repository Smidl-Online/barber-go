import { prisma } from '../utils/prisma';

interface NewBookingParams {
  provider_id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  start_time: string;
}

interface StatusChangeParams {
  customer_id: string;
  provider_name: string;
  service_name: string;
  status: string;
}

export async function notifyNewBooking(params: NewBookingParams) {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: params.provider_id },
  });
  if (!provider) return;

  await sendPushToUser(provider.user_id, {
    title: 'Nová rezervace! 📅',
    body: `${params.customer_name} — ${params.service_name} (${params.start_time})`,
    data: { type: 'new_booking' },
  });
}

export function notifyBookingStatusChange(params: StatusChangeParams) {
  const statusMessages: Record<string, NotificationPayload> = {
    confirmed: {
      title: 'Rezervace potvrzena ✓',
      body: `${params.provider_name} potvrdil vaši rezervaci (${params.service_name})`,
      data: { type: 'booking_confirmed' },
    },
    cancelled_by_provider: {
      title: 'Rezervace zrušena',
      body: `${params.provider_name} zrušil vaši rezervaci (${params.service_name})`,
      data: { type: 'booking_cancelled' },
    },
    completed: {
      title: 'Služba dokončena',
      body: `Ohodnoťte ${params.provider_name} — jak jste byli spokojeni?`,
      data: { type: 'booking_completed' },
    },
  };

  const msg = statusMessages[params.status];
  if (msg) {
    sendPushToUser(params.customer_id, msg).catch(() => {});
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a user via Expo Push API
 */
export async function sendPushNotification(userId: string, payload: NotificationPayload) {
  const tokens = await prisma.pushToken.findMany({
    where: { user_id: userId },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Clean up invalid tokens
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          await prisma.pushToken.deleteMany({
            where: { token: tokens[i].token },
          });
        }
      }
    }
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

/**
 * Notify provider about new booking
 */
export async function notifyNewBooking(booking: {
  provider_id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  start_time: string;
}) {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: booking.provider_id },
    select: { user_id: true },
  });
  if (!provider) return;

  await sendPushNotification(provider.user_id, {
    title: 'Nová rezervace',
    body: `${booking.customer_name} — ${booking.service_name}, ${booking.booking_date} v ${booking.start_time}`,
    data: { type: 'new_booking' },
  });
}

/**
 * Notify customer about booking status change
 */
export async function notifyBookingStatusChange(booking: {
  customer_id: string;
  provider_name: string;
  service_name: string;
  status: string;
}) {
  const statusMessages: Record<string, string> = {
    confirmed: `${booking.provider_name} potvrdil/a vaši rezervaci (${booking.service_name})`,
    cancelled_by_provider: `${booking.provider_name} zrušil/a vaši rezervaci (${booking.service_name})`,
    completed: `Rezervace u ${booking.provider_name} dokončena. Zanechte hodnocení!`,
  };

  const message = statusMessages[booking.status];
  if (!message) return;

  await sendPushNotification(booking.customer_id, {
    title: booking.status === 'completed' ? 'Rezervace dokončena' : 'Změna rezervace',
    body: message,
    data: { type: 'booking_status', status: booking.status },
  });
}

/**
 * Notify provider about new review
 */
export async function notifyNewReview(review: {
  provider_id: string;
  customer_name: string;
  rating: number;
}) {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: review.provider_id },
    select: { user_id: true },
  });
  if (!provider) return;

  const stars = '⭐'.repeat(review.rating);
  await sendPushNotification(provider.user_id, {
    title: 'Nové hodnocení',
    body: `${review.customer_name} vám dal/a ${stars}`,
    data: { type: 'new_review' },
  });
}
