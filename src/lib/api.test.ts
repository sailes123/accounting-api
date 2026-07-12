import { describe, it, expect } from "vitest";
import { CreatePartyBody, ListPartiesQueryParams, CreateProductBody } from "./api";

describe("CreatePartyBody", () => {
  it("accepts a minimal valid customer", () => {
    const result = CreatePartyBody.safeParse({
      partyType: "customer",
      name: "Ram Bahadur",
      phone: "9800000000",
      address: "Kathmandu",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown partyType", () => {
    const result = CreatePartyBody.safeParse({
      partyType: "supplier",
      name: "Ram Bahadur",
      phone: "9800000000",
      address: "Kathmandu",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = CreatePartyBody.safeParse({
      partyType: "vendor",
      name: "",
      phone: "9800000000",
      address: "Kathmandu",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = CreatePartyBody.safeParse({
      partyType: "customer",
      name: "Ram Bahadur",
      email: "not-an-email",
      phone: "9800000000",
      address: "Kathmandu",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field (phone)", () => {
    const result = CreatePartyBody.safeParse({
      partyType: "customer",
      name: "Ram Bahadur",
      address: "Kathmandu",
    });
    expect(result.success).toBe(false);
  });
});

describe("ListPartiesQueryParams", () => {
  it("allows an omitted type filter", () => {
    expect(ListPartiesQueryParams.safeParse({}).success).toBe(true);
  });

  it("allows a valid type filter", () => {
    expect(ListPartiesQueryParams.safeParse({ type: "vendor" }).success).toBe(true);
  });

  it("rejects an invalid type filter", () => {
    expect(ListPartiesQueryParams.safeParse({ type: "not-a-type" }).success).toBe(false);
  });
});

describe("CreateProductBody", () => {
  const base = {
    name: "Old Durbar",
    stock: 10,
    sellingPrice: 100,
    purchasePrice: 80,
  };

  it("accepts a minimal valid product", () => {
    expect(CreateProductBody.safeParse(base).success).toBe(true);
  });

  it("accepts an optional batch field", () => {
    const result = CreateProductBody.safeParse({ ...base, batch: "B-2026-001" });
    expect(result.success).toBe(true);
  });

  it("omits batch cleanly when not provided", () => {
    const result = CreateProductBody.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batch).toBeUndefined();
    }
  });

  it("rejects a missing required field (sellingPrice)", () => {
    const { sellingPrice: _sellingPrice, ...withoutSellingPrice } = base;
    expect(CreateProductBody.safeParse(withoutSellingPrice).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(CreateProductBody.safeParse({ ...base, name: "" }).success).toBe(false);
  });
});
