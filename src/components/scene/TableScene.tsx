import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Backdrop } from './Backdrop';
import { TableForeground } from './TableForeground';
import styles from './TableScene.module.css';

const DRIFT_X = 14; // px of backdrop travel at the viewport edge
const DRIFT_Y = 9;

/** Desktop-only pointer parallax: the wall drifts against the nearer layers.
 * Touch can't sustain a hover position and reduced-motion asks for stillness,
 * so both get a static backdrop. */
function useBackdropParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const enabled = useRef(false);
  const frame = useRef(0);

  useEffect(() => {
    const query = window.matchMedia(
      '(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    const update = () => {
      enabled.current = query.matches;
      if (!query.matches) setOffset({ x: 0, y: 0 });
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
    frame.current = requestAnimationFrame(() => setOffset({ x: -nx * DRIFT_X, y: -ny * DRIFT_Y }));
  };

  return { offset, onPointerMove };
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
  const { offset, onPointerMove } = useBackdropParallax();

  return (
    <div className={styles.stage} data-testid="table-scene" onPointerMove={onPointerMove}>
      <Backdrop offsetX={offset.x} offsetY={offset.y} />
      <div className={styles.npcLayer}>{npc}</div>
      <TableForeground />
      <div className={styles.handLayer}>{hand}</div>
      <div className={styles.bubbleLayer}>{bubbles}</div>
      <div className={styles.hudLayer}>{hud}</div>
      {overlay}
    </div>
  );
}
