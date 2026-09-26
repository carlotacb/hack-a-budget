import { describe, expect, test } from "vitest";
import {
  departmentCodeBase,
  generateDepartmentCode,
} from "@/lib/department-code";

describe("departmentCodeBase", () => {
  test("uses the first 3 letters, lowercased", () => {
    expect(departmentCodeBase("Logistics")).toBe("log");
  });

  test("ignores spaces, punctuation, and accents", () => {
    expect(departmentCodeBase("  Diseño & Arte")).toBe("dis");
    expect(departmentCodeBase("R & D")).toBe("rd");
  });

  test("keeps short names as they are", () => {
    expect(departmentCodeBase("HX")).toBe("hx");
  });

  test("falls back to 'dep' when the name has no letters or digits", () => {
    expect(departmentCodeBase("!!!")).toBe("dep");
  });
});

describe("generateDepartmentCode", () => {
  test("returns the base when it's free", () => {
    expect(generateDepartmentCode("Marketing", ["log"])).toBe("mar");
  });

  test("appends 2, 3, ... when the base is taken", () => {
    expect(generateDepartmentCode("Marketing", ["mar"])).toBe("mar2");
    expect(generateDepartmentCode("Marketing", ["mar", "mar2"])).toBe("mar3");
  });

  test("fills the first free number rather than the highest", () => {
    expect(generateDepartmentCode("Marketing", ["mar", "mar3"])).toBe("mar2");
  });
});
