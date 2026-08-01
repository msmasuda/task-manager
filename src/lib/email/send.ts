import { Resend } from "resend";
import { db } from "@/lib/db/client";

type EmailInput = {
  organizationId?: string;
  idempotencyKey: string;
  recipient: string;
  subject: string;
  html: string;
  template: string;
};

export async function sendEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false as const, reason: "not_configured" as const };

  const delivery = await db.emailDelivery.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey, recipient: input.recipient, template: input.template },
    update: {},
  });
  if (delivery.status === "SENT") return { sent: true as const };

  try {
    const result = await new Resend(apiKey).emails.send({ from, to: input.recipient, subject: input.subject, html: input.html });
    if (result.error) throw new Error(result.error.message);
    await db.emailDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", attempts: { increment: 1 }, sentAt: new Date(), lastError: null } });
    return { sent: true as const };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 500) : "メール送信に失敗しました。";
    await db.emailDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", attempts: { increment: 1 }, lastError: message } });
    return { sent: false as const, reason: "failed" as const };
  }
}
