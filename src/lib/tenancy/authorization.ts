export type TenantMembership = {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  isActive: boolean;
  locationIds: readonly string[];
};

export function canAccessOrganization(
  membership: TenantMembership | null,
  organizationId: string,
) {
  return Boolean(
    membership?.isActive && membership.organizationId === organizationId,
  );
}

export function canAccessLocation(
  membership: TenantMembership | null,
  organizationId: string,
  locationId: string,
) {
  if (!canAccessOrganization(membership, organizationId)) {
    return false;
  }

  return (
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.locationIds.includes(locationId) === true
  );
}

export function assertLocationAccess(
  membership: TenantMembership | null,
  organizationId: string,
  locationId: string,
) {
  if (!canAccessLocation(membership, organizationId, locationId)) {
    throw new Error("この店舗へアクセスする権限がありません。");
  }
}
