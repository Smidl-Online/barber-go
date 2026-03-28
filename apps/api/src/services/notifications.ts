import { prisma } from '../utils/prisma';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushToUser(userId: string, payload: NotificationPayload) {
  const tokens = await prisma.pushToken.findMany({
    where: { user_id: userId },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await response.json();

    // Clean up invalid tokens
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].status === 'error' && result.data[i].details?.error === 'DeviceNotRegistered') {
          await prisma.pushToken.delete({ where: { id: tokens[i].id } }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Push notification failed:', err);
  }
}

export async function notifyBookingStatusChange(
  bookingId: string,
  newStatus: string,
  actorRole: 'customer' | 'provider',
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      customer: true,
      provider: { include: { user: true } },
    },
  });

  if (!booking) return;

  const statusMessages: Record<string, { toCustomer?: NotificationPayload; toProvider?: NotificationPayload }> = {
    confirmed: {
      toCustomer: {
        title: 'Rezervace potvrzena ✓',
        body: `${booking.provider.display_name} potvrdil vaši rezervaci (${booking.service.name})`,
        data: { bookingId, type: 'booking_confirmed' },
      },
    },
    cancelled_by_customer: {
      toProvider: {
        title: 'Rezervace zrušena',
        body: `${booking.customer.full_name} zrušil rezervaci (${booking.service.name})`,
        data: { bookingId, type: 'booking_cancelled' },
      },
    },
    cancelled_by_provider: {
      toCustomer: {
        title: 'Rezervace zrušena',
        body: `${booking.provider.display_name} zrušil vaši rezervaci (${booking.service.name})`,
        data: { bookingId, type: 'booking_cancelled' },
      },
    },
    completed: {
      toCustomer: {
        title: 'Služba dokončena',
        body: `Ohodnoťte ${booking.provider.display_name} — jak jste byli spokojeni?`,
        data: { bookingId, type: 'booking_completed' },
      },
    },
    pending: {
      toProvider: {
        title: 'Nová rezervace! 📅',
        body: `${booking.customer.full_name} — ${booking.service.name} (${booking.start_time})`,
        data: { bookingId, type: 'new_booking' },
      },
    },
  };

  const msgs = statusMessages[newStatus];
  if (!msgs) return;

  if (msgs.toCustomer && actorRole !== 'customer') {
    await sendPushToUser(booking.customer_id, msgs.toCustomer);
  }
  if (msgs.toProvider && actorRole !== 'provider') {
    await sendPushToUser(booking.provider.user_id, msgs.toProvider);
  }
}

export async function notifyNewReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      customer: true,
      provider: { include: { user: true } },
    },
  });

  if (!review) return;

  await sendPushToUser(review.provider.user_id, {
    title: `Nové hodnocení ⭐ ${'★'.repeat(review.rating)}`,
    body: review.comment
      ? `${review.customer.full_name}: "${review.comment}"`
      : `${review.customer.full_name} vás ohodnotil`,
    data: { reviewId, type: 'new_review' },
  });
}
