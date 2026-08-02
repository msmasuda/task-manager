import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

export const getCurrentContext = cache(async () => {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const membership = await db.organizationMember.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: {
      organization: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/signup");

  return { session, membership, organization: membership.organization };
});

export async function requireOrganizationManager() {
  const context = await getCurrentContext();
  if (context.membership.role === "STAFF") {
    throw new Error("この操作を行う権限がありません。");
  }
  return context;
}
