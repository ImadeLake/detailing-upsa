"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw } from "lucide-react";
import { AdvCard } from "./AdvCard";

const STORAGE_KEY = "advOrder.v1";

type AdvData = {
  adv: string;
  pages: { page: string; total_duration: number; events: number }[];
};

function readSavedOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function applySavedOrder(items: AdvData[], saved: string[]): AdvData[] {
  if (saved.length === 0) return items;
  const map = new Map(items.map((i) => [i.adv, i]));
  const ordered: AdvData[] = [];
  for (const adv of saved) {
    const found = map.get(adv);
    if (found) {
      ordered.push(found);
      map.delete(adv);
    }
  }
  // Append items not in saved order (new ADVs) at the end.
  for (const remaining of map.values()) ordered.push(remaining);
  return ordered;
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Glisser pour réordonner"
        className="absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 hover:bg-[var(--surface-2)] transition-all"
        style={{ color: "var(--ink-mute)" }}
        onClick={(e) => e.preventDefault()}
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}

export function AdvGrid({ items }: { items: AdvData[] }) {
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.adv));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readSavedOrder();
    setOrder(applySavedOrder(items, saved).map((i) => i.adv));
    setHydrated(true);
    // re-run if the set of ADVs changes
  }, [items]);

  const itemsByAdv = useMemo(() => new Map(items.map((i) => [i.adv, i])), [items]);
  const ordered = useMemo(
    () => order.map((adv) => itemsByAdv.get(adv)).filter((x): x is AdvData => Boolean(x)),
    [order, itemsByAdv],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = (next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIdx = prev.indexOf(String(active.id));
      const newIdx = prev.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = arrayMove(prev, oldIdx, newIdx);
      persist(next);
      return next;
    });
  };
  const reset = () => {
    const def = items.map((i) => i.adv);
    setOrder(def);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  // Avoid flash of "default order" before localStorage hydration
  if (!hydrated) {
    return (
      <div className="grid md:grid-cols-2 gap-4 items-start">
        {items.map((it) => (
          <AdvCard key={it.adv} adv={it.adv} pages={it.pages} />
        ))}
      </div>
    );
  }

  const activeItem = activeId ? itemsByAdv.get(activeId) : null;

  return (
    <>
      <div className="flex justify-end -mt-1 mb-3">
        <button
          type="button"
          onClick={reset}
          className="text-[12px] inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--surface-2)]"
          style={{ color: "var(--ink-dim)" }}
        >
          <RotateCcw size={12} /> Réinitialiser l&apos;ordre
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {ordered.map((it) => (
              <SortableItem key={it.adv} id={it.adv}>
                <AdvCard adv={it.adv} pages={it.pages} />
              </SortableItem>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeItem ? (
            <div className="opacity-90 shadow-2xl">
              <AdvCard adv={activeItem.adv} pages={activeItem.pages} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
