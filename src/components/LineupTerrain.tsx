import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { BasketballCourt } from "./BasketballCourt";
import { FootballPitch } from "./FootballPitch";
import { pointerPosition, readPositions, type TerrainPosition } from "./terrain-position";

export function LineupTerrain({ sport, storageKey, players }: { sport: string; storageKey: string; players: { id: string; name: string; position: TerrainPosition; chip: ReactNode }[] }) {
  const terrain = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [positions, setPositions] = useState<Record<string, TerrainPosition>>({});
  const current = useRef(positions);
  useEffect(() => {
    let saved = {};
    try { saved = readPositions(localStorage.getItem(storageKey)); } catch { /* Storage may be unavailable. */ }
    current.current = saved;
    setPositions(saved);
  }, [storageKey]);

  function move(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    const board = terrain.current;
    if (!active || active.pointerId !== event.pointerId || !board) return;
    if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 6) return;
    active.moved = true;
    suppressClick.current = true;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    const rect = board.getBoundingClientRect();
    const chip = event.currentTarget.getBoundingClientRect();
    const point = pointerPosition(event.clientX - active.offsetX, event.clientY - active.offsetY, rect, { x: (chip.width / 2 + 4) / rect.width * 100, y: (chip.height / 2 + 4) / rect.height * 100 });
    current.current = { ...current.current, [active.id]: point };
    setPositions(current.current);
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (drag.current.moved) {
      try { localStorage.setItem(storageKey, JSON.stringify(current.current)); } catch { /* Keep dragging functional without storage. */ }
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div ref={terrain} className="relative w-full overflow-hidden rounded-2xl border" data-lineup-terrain={sport}>
      {sport === "basketball" ? <BasketballCourt /> : <FootballPitch />}
      {players.map((player) => {
        const point = positions[player.id] ?? player.position;
        return (
          <div key={player.id} data-terrain-player={player.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-none select-none cursor-grab active:cursor-grabbing active:z-20"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onDragStart={(e) => e.preventDefault()}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              const chip = event.currentTarget.getBoundingClientRect();
              suppressClick.current = false;
              drag.current = { id: player.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - (chip.left + chip.width / 2), offsetY: event.clientY - (chip.top + chip.height / 2), moved: false };
            }}
            onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
            onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}>
            {player.chip}
          </div>
        );
      })}
    </div>
  );
}