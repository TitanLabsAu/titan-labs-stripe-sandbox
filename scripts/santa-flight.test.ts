import { describe, expect, test } from "bun:test";
import { randomSantaPath, santaFlightPose } from "../src/lib/santa-flight";

describe("random Santa routes", () => {
  for (const [edge, name] of ["left", "right", "top", "bottom"].entries()) {
    test(`flies into and out of opposite edges from ${name}`, () => {
      const values = [(edge + 0.1) / 4, 0.2, 0.8, 0.7];
      const path = randomSantaPath(1000, 700, 300, () => values.shift()!);
      if (edge === 0) { expect(path.start.x).toBeLessThan(-180); expect(path.end.x).toBeGreaterThan(1180); }
      if (edge === 1) { expect(path.start.x).toBeGreaterThan(1180); expect(path.end.x).toBeLessThan(-180); }
      if (edge === 2) { expect(path.start.y).toBeLessThan(-180); expect(path.end.y).toBeGreaterThan(880); }
      if (edge === 3) { expect(path.start.y).toBeGreaterThan(880); expect(path.end.y).toBeLessThan(-180); }
      const start = santaFlightPose(path, 0), end = santaFlightPose(path, 1), mid = santaFlightPose(path, .5);
      expect(start.x).toBeCloseTo(path.start.x); expect(start.y).toBeCloseTo(path.start.y);
      expect(end.x).toBeCloseTo(path.end.x); expect(end.y).toBeCloseTo(path.end.y);
      expect(mid.x).toBeGreaterThan(0); expect(mid.x).toBeLessThan(1000);
      expect(mid.y).toBeGreaterThan(0); expect(mid.y).toBeLessThan(700);
      for (const pose of [start, mid, end]) {
        expect(Math.hypot(pose.ux, pose.uy)).toBeCloseTo(1);
        expect(Math.abs(pose.tilt)).toBeLessThanOrEqual(25);
        expect(pose.angle).toBeGreaterThanOrEqual(-90); expect(pose.angle).toBeLessThanOrEqual(90);
        // Rotating a right-facing sprite and reflecting left-facing flights must follow the tangent.
        expect(Math.cos(pose.angle * Math.PI / 180) * pose.facing).toBeCloseTo(pose.ux);
        expect(Math.sin(pose.angle * Math.PI / 180) * pose.facing).toBeCloseTo(pose.uy);
      }
    });
  }
  test("fresh choices vary entry positions and curve", () => {
    const a = randomSantaPath(390, 800, 230, () => .1);
    const b = randomSantaPath(390, 800, 230, () => .2);
    expect(a.start.y).not.toBe(b.start.y); expect(a.bend).not.toBe(b.bend);
    expect(santaFlightPose(a, -1).x).toBe(a.start.x);
    expect(santaFlightPose(a, 2).x).toBeCloseTo(a.end.x);
  });
});
