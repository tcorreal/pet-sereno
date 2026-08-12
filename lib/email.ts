import { env } from "cloudflare:workers";
import { supabaseRpc } from "./supabase";

export type CustomerNotification = {
  id: string;
  customer_id: string;
  pet_id: string;
  service_id: string;
  channel: "EMAIL";
  event: "SERVICE_ACTIVATED" | "SERVICE_CLOSED" | "RESERVATION_CONFIRMED";
  recipient: string;
  subject: string;
  body_text: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED";
  attempt_count: number;
  provider_message_id?: string | null;
  last_error?: string | null;
};

type EmailRuntime = {
  EMAIL_WEBHOOK_URL?: string;
  EMAIL_WEBHOOK_SECRET?: string;
  EMAIL_FROM_NAME?: string;
};

function emailRuntime(): EmailRuntime {
  const workerEnv = env as unknown as EmailRuntime;
  return {
    EMAIL_WEBHOOK_URL: workerEnv.EMAIL_WEBHOOK_URL
      ?? (typeof process !== "undefined" ? process.env.EMAIL_WEBHOOK_URL : undefined),
    EMAIL_WEBHOOK_SECRET: workerEnv.EMAIL_WEBHOOK_SECRET
      ?? (typeof process !== "undefined" ? process.env.EMAIL_WEBHOOK_SECRET : undefined),
    EMAIL_FROM_NAME: workerEnv.EMAIL_FROM_NAME
      ?? (typeof process !== "undefined" ? process.env.EMAIL_FROM_NAME : undefined),
  };
}

export function emailDeliveryConfigured() {
  return Boolean(emailRuntime().EMAIL_WEBHOOK_URL);
}

function markNotification(
  notificationId: string,
  status: CustomerNotification["status"],
  providerMessageId?: string,
  error?: string,
) {
  return supabaseRpc<CustomerNotification>("api_mark_notification", {
    p_notification_id: notificationId,
    p_status: status,
    p_provider_message_id: providerMessageId ?? null,
    p_error: error ?? null,
  });
}

export async function deliverCustomerNotification(notification: CustomerNotification) {
  if (notification.status === "SENT") return { configured: true, notification };

  const runtime = emailRuntime();
  if (!runtime.EMAIL_WEBHOOK_URL) return { configured: false, notification };

  await markNotification(notification.id, "SENDING");
  try {
    const response = await fetch(runtime.EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "SEND_EMAIL",
        secret: runtime.EMAIL_WEBHOOK_SECRET ?? "",
        fromName: runtime.EMAIL_FROM_NAME ?? "Pet Sereno",
        to: notification.recipient,
        subject: notification.subject,
        text: notification.body_text,
        idempotencyKey: notification.id,
      }),
    });
    if (!response.ok) throw new Error(`El servicio de correo respondió ${response.status}.`);
    const result = await response.json().catch(() => ({})) as { messageId?: string };
    const sent = await markNotification(notification.id, "SENT", result.messageId ?? notification.id);
    return { configured: true, notification: sent };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos enviar el correo.";
    const failed = await markNotification(notification.id, "FAILED", undefined, message);
    return { configured: true, notification: failed };
  }
}
