import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Backdrop } from './Backdrop';
import { TableForeground } from './TableForeground';
import styles from './TableScene.module.css';

/** Rough distances from the player's eye, in metres: their own hands rest at
 * the near edge, the opponent sits across the table, the wall is back in the
 * room. Only the ratios matter — they set how much each layer drifts. */
const DISTANCE = { hand: 0.4, table: 0.7, npc: 1.6, wall: 3.2 } as const;

// Travel at the viewport edge for the furthest layer; nearer ones get a
// proportional share, so the wall sweeps while the table barely stirs.
const DRIFT_X = 14;
const DRIFT_Y = 9;

export interface Drift {
  x: number;
  y: number;
}

/** Desktop-only pointer parallax: the room shears with depth as the pointer
 * moves. Touch can't sustain a hover position and reduced-motion asks for
 * stillness, so both get a still scene. */
function useSceneParallax() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const enabled = useRef(false);
  const frame = useRef(0);

  useEffect(() => {
    const query = window.matchMedia(
      '(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    const update = () => {
      enabled.current = query.matches;
      if (!query.matches) setPointer({ x: 0, y: 0 });
    };
    update();
    query.addEventListener('change', update);
    return () => {
      query.removeEventListener('change', update);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const onPointerMove = (event: PointerEvent) => {
    if (!enabled.current) return;
    const nx = (event.clientX / window.innerWidth - 0.5) * 2;
    const ny = (event.clientY / window.innerHeight - 0.5) * 2;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setPointer({ x: -nx, y: -ny }));
  };

  /* Drift scales with a layer's distance from the player, measured against
   * their own hands — the one thing that moves with them, and so the one
   * thing that never shifts on screen. */
  const driftAt = (distance: number): Drift => {
    const depth = (distance - DISTANCE.hand) / (DISTANCE.wall - DISTANCE.hand);
    return { x: pointer.x * DRIFT_X * depth, y: pointer.y * DRIFT_Y * depth };
  };

  return { driftAt, onPointerMove };
}

interface TableSceneProps {
  hud: ReactNode;
  npc: ReactNode;
  hand: ReactNode;
  bubbles: ReactNode;
  overlay?: ReactNode;
}

/** The stage: fixed full-viewport layers, composed mobile-first and spread
 * out for desktop entirely in CSS. Interactive content mounts into the
 * bubble layer; everything else is scenery. */
export function TableScene({ hud, npc, hand, bubbles, overlay }: TableSceneProps) {
  const { driftAt, onPointerMove } = useSceneParallax();
  const wall = driftAt(DISTANCE.wall);
  const opponent = driftAt(DISTANCE.npc);
  const table = driftAt(DISTANCE.table);

  return (
    <div className={styles.stage} data-testid="table-scene" onPointerMove={onPointerMove}>
      <Backdrop offsetX={wall.x} offsetY={wall.y} />
      {/* Custom properties, not a transform: the layer's CSS composes the
       * drift with the sink that seats the figure's arms on the table.
       * Horizontal only — any vertical travel would lift the forearms off
       * the felt or bury them in it. */}
      <div className={styles.npcLayer} style={{ '--drift-x': `${opponent.x}px` } as CSSProperties}>
        {npc}
      </div>
      <TableForeground offsetX={table.x} offsetY={table.y} />
      <div className={styles.handLayer}>{hand}</div>
      <div className={styles.bubbleLayer}>{bubbles}</div>
      <div className={styles.hudLayer}>{hud}</div>
      {overlay}
    </div>
  );
}
