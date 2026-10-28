export type FlightPoint = { x: number; y: number };
export type SantaPath = { start: FlightPoint; end: FlightPoint; bend: number };

/** Choose a random entry point and an opposite exit, with the whole team off-screen. */
export function randomSantaPath(width: number, height: number, teamWidth: number, random = Math.random): SantaPath {
  const margin = teamWidth * 0.6 + 24;
  const edge = Math.min(3, Math.floor(random() * 4));
  const across = () => 0.12 + random() * 0.76;
  let start: FlightPoint, end: FlightPoint;
  if (edge < 2) {
    start = { x: edge === 0 ? -margin : width + margin, y: height * across() };
    end = { x: edge === 0 ? width + margin : -margin, y: height * across() };
  } else {
    start = { x: width * across(), y: edge === 2 ? -margin : height + margin };
    end = { x: width * across(), y: edge === 2 ? height + margin : -margin };
  }
  return { start, end, bend: (random() - 0.5) * Math.min(width, height) * 0.12 };
}

/** Curved flight position and tangent keep the team and its snow trail facing the route. */
export function santaFlightPose(path: SantaPath, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const dx = path.end.x - path.start.x, dy = path.end.y - path.start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = -dy / distance, ny = dx / distance;
  const bend = Math.sin(p * Math.PI) * path.bend;
  const tangent = Math.cos(p * Math.PI) * Math.PI * path.bend;
  const vx = dx + nx * tangent, vy = dy + ny * tangent;
  const speed = Math.hypot(vx, vy) || 1;
  const facing = vx < 0 ? -1 : 1;
  const angle = Math.atan2(vy * facing, vx * facing) * 180 / Math.PI;
  return {
    x: path.start.x + dx * p + nx * bend,
    y: path.start.y + dy * p + ny * bend,
    ux: vx / speed, uy: vy / speed,
    facing,
    angle,
    // Keep the team upright even when entering from above or below.
    tilt: Math.max(-25, Math.min(25, angle)),
  };
}
