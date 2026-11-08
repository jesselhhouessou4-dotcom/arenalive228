import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { BasketballCourt } from "./BasketballCourt";
import { FootballPitch } from "./FootballPitch";
import { pointerPosition, readPositions, type TerrainPosition } from "./terrain-position";
import { clampBasketballPosition, migrateBasketballPositions } from "./basketball-position";

export function LineupTerrain({ sport, storageKey, players, editable = false }: { sport: string; storageKey: string; editable?: boolean; players: { id: string; name: string; position: TerrainPosition; chip: ReactNode }[] }) {
  const terrain = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [positions, setPositions] = useState<Record<string, TerrainPosition>>({});
  const basketball = sport === "basketball";
  const positionKey = basketball ? `${storageKey}:half:v1` : storageKey;
  const [inset, setInset] = useState<TerrainPosition>({ x: 0, y: 0 });
  const current = useRef(positions);
  useEffect(() => {
    let saved = {};
    try {
      if (basketball) {
        saved = migrateBasketballPositions(localStorage.getItem(positionKey) ?? localStorage.getItem(storageKey), { x: 0, y: 0 });
        localStorage.setItem(positionKey, JSON.stringify(saved));
      } else {
        saved = readPositions(localStorage.getItem(storageKey));
      }
    } catch { /* Storage may be unavailable. */ }
    current.current = saved;
    setPositions(saved);
  }, [storageKey, positionKey, basketball]);

  useEffect(() => {
    const board = terrain.current;
    if (!basketball || !board) return;
    const measure = () => {
      const rect = board.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const chips = Array.from(board.querySelectorAll<HTMLElement>("[data-terrain-player]"));
      const margin = {
        x: Math.min(49, (Math.max(0, ...chips.map((chip) => chip.offsetWidth)) / 2 + 4) / rect.width * 100),
        y: Math.min(49, (Math.max(0, ...chips.map((chip) => chip.offsetHeight)) / 2 + 4) / rect.height * 100),
      };
      setInset(margin);
      current.current = Object.fromEntries(Object.entries(current.current).map(([id, point]) => [id, clampBasketballPosition(point, margin)]));
      setPositions(current.current);
      try { localStorage.setItem(positionKey, JSON.stringify(current.current)); } catch { /* Storage is optional. */ }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    board.querySelectorAll("[data-terrain-player]").forEach((chip) => observer.observe(chip));
    return () => observer.disconnect();
  }, [basketball, positionKey, players.length]);

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
      try { localStorage.setItem(positionKey, JSON.stringify(current.current)); } catch { /* Keep dragging functional without storage. */ }
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div ref={terrain} className="relative w-full overflow-hidden rounded-2xl border" data-lineup-terrain={sport}>
      {basketball ? <BasketballCourt half /> : <FootballPitch />}
      {players.map((player) => {
        const savedPoint = positions[player.id] ?? player.position;
        const point = basketball ? clampBasketballPosition(savedPoint, inset) : savedPoint;
        return (
          <div key={player.id} data-terrain-player={player.id} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${editable ? "touch-none select-none cursor-grab active:cursor-grabbing active:z-20" : ""}`}
            data-draggable={editable || undefined}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onDragStart={(e) => e.preventDefault()}
            onPointerDown={(event) => {
              if (!editable || !event.isPrimary || event.button !== 0) return;
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