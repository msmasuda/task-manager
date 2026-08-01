"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomerAccess } from "@/lib/customers/access";
import { db } from "@/lib/db/client";
import { customerNoteSchema } from "@/lib/validation/customer";

export async function updateCustomerNote(formData: FormData) {
  const parsed = customerNoteSchema.safeParse(Object.fromEntries(formData));
  const id = String(formData.get("customerId") ?? "");
  if (!parsed.success) redirect(`/app/customers/${encodeURIComponent(id)}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "入力内容を確認してください。")}`);
  const { customer, membership, organization } = await requireCustomerAccess(parsed.data.customerId);
  await db.$transaction([
    db.customer.update({ where: { id: customer.id }, data: { note: parsed.data.note || null } }),
    db.auditLog.create({ data: { organizationId: organization.id, actorId: membership.userId, action: "customer.note_updated", entityType: "Customer", entityId: customer.id } }),
  ]);
  revalidatePath(`/app/customers/${customer.id}`);
  redirect(`/app/customers/${customer.id}?saved=1`);
}
