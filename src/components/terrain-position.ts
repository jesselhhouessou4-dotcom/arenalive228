export type TerrainPosition = { x: number; y: number };

export function pointerPosition(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, inset: TerrainPosition): TerrainPosition {
  return {
    x: Math.max(inset.x, Math.min(100 - inset.x, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(inset.y, Math.min(100 - inset.y, ((clientY - rect.top) / rect.height) * 100)),
  };
}

export function readPositions(value: string | null): Record<string, TerrainPosition> {
  try {
    const parsed: unknown = JSON.parse(value ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, p]) => p && typeof p === "object" && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
  } catch { return {}; }
}