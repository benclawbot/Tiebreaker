/** Shared, deterministic court movement and serve helpers (metres, seconds). */
export function landingPoint(ball, velocity, gravity) {
  const discriminant = velocity.y * velocity.y + 2 * gravity * Math.max(0, ball.y - .105);
  const time = Math.max(0, (velocity.y + Math.sqrt(discriminant)) / gravity);
  return { x: ball.x + velocity.x * time, z: ball.z + velocity.z * time };
}
export function moveToward(current, target, maxDistance) {
  return current + Math.max(-maxDistance, Math.min(maxDistance, target - current));
}
export function serveBallPosition(actor, server, elapsed) {
  const period = 1.6;
  const cycle = elapsed < .65 ? -1 : (elapsed - .65) % period;
  const height = cycle < 0 ? 1.04 : 1.04 + 1.35 * Math.sin(Math.PI * cycle / period);
  return {x: actor.x + .42 * server, y: height, z: actor.z - .12 * server, cycle};
}
