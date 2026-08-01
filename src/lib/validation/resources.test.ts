import { describe, expect, it } from "vitest";
import { resourceSchema, resourceTypeSchema, serviceRequirementSchema } from "./resources";

describe("設備設定", () => {
  it("空の設備種別名を拒否する", () => {
    expect(resourceTypeSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("設備の企業内参照に必要な入力を受け付ける", () => {
    expect(resourceSchema.safeParse({ locationId: "location-1", resourceTypeId: "type-1", name: "診察室A", isActive: true }).success).toBe(true);
  });

  it("設備必要数0を拒否する", () => {
    expect(serviceRequirementSchema.safeParse({ serviceId: "service-1", resourceTypeId: "type-1", quantity: 0 }).success).toBe(false);
  });
});
