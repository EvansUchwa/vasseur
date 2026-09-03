"use client";

/**
 * Avant / après comparison slider — faithful port of the widget the design
 * tool placed in the homepage maquette (section « Trois chantiers récents »).
 *
 * The « après » photo fills the frame; the « avant » photo sits on top,
 * clipped from the right so only the left `pct`% shows. A divider handle and
 * an invisible <input type="range"> both drive that percentage:
 *  - drag the frame (pointer events, touch-action:none like the maquette) or
 *  - use the range input (keyboard accessible).
 * Initial position is 55 % avant / 45 % après, exactly like the mockup's
 * `componentDidMount() { this.poser(55); }`.
 */
import { useRef, useState } from "react";
import type { CSSProperties } from "react";

type AvantApresProps = {
  avant: string;
  apres: string;
  avantAlt?: string;
  apresAlt?: string;
};

const css = (o: Record<string, string>): CSSProperties =>
  o as unknown as CSSProperties;

const clamp = (p: number) => Math.max(0, Math.min(100, p));

export function AvantApres({
  avant,
  apres,
  avantAlt = "Avant",
  apresAlt = "Après",
}: AvantApresProps) {
  const [pct, setPct] = useState(55);
  const cadre = useRef<HTMLDivElement>(null);
  const glisse = useRef(false);

  const depuisClientX = (clientX: number) => {
    const c = cadre.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width <= 0) return;
    setPct(clamp(((clientX - r.left) / r.width) * 100));
  };

  return (
    <div
      ref={cadre}
      onPointerDown={(e) => {
        glisse.current = true;
        depuisClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (glisse.current) depuisClientX(e.clientX);
      }}
      onPointerUp={() => {
        glisse.current = false;
      }}
      onPointerLeave={() => {
        glisse.current = false;
      }}
      style={css({
        position: "relative",
        height: "min(62vh,560px)",
        userSelect: "none",
        touchAction: "none",
        cursor: "ew-resize",
        background: "#0C131C",
      })}
    >
      <img
        src={apres}
        alt={apresAlt}
        style={css({
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        })}
      />
      <div
        style={css({
          position: "absolute",
          inset: "0",
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
        })}
      >
        <img
          src={avant}
          alt={avantAlt}
          style={css({
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          })}
        />
      </div>
      <div
        style={css({
          position: "absolute",
          left: "20px",
          top: "20px",
          font: "600 11px/1 Archivo",
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "#F7F4EE",
          background: "#0C131CD9",
          padding: "9px 13px",
          pointerEvents: "none",
        })}
      >
        {"Avant"}
      </div>
      <div
        style={css({
          position: "absolute",
          right: "20px",
          top: "20px",
          font: "600 11px/1 Archivo",
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "#0C131C",
          background: "#F7F4EEE6",
          padding: "9px 13px",
          pointerEvents: "none",
        })}
      >
        {"Après"}
      </div>
      <div
        style={css({
          position: "absolute",
          top: "0",
          bottom: "0",
          left: `${pct}%`,
          width: "1px",
          background: "#F7F4EE",
          pointerEvents: "none",
        })}
      >
        <span
          style={css({
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: "54px",
            height: "54px",
            border: "1px solid #F7F4EE",
            background: "#0C131CB3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "400 20px/1 Archivo",
            color: "#F7F4EE",
            letterSpacing: ".08em",
          })}
        >
          {"↔"}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        aria-label="Comparer avant et après"
        value={pct}
        onChange={(e) => setPct(clamp(Number(e.target.value)))}
        style={css({
          position: "absolute",
          left: "0",
          right: "0",
          bottom: "-1px",
          width: "100%",
          height: "34px",
          opacity: "0",
          cursor: "ew-resize",
        })}
      />
    </div>
  );
}
