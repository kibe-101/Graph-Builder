import { useEffect, useRef, type PointerEvent } from "react";
import type { ObstructionCell, SimulationResult, WlanSimulationConfig } from "@workspace/api-client-react";

interface Props {
  result: SimulationResult | null;
  config: WlanSimulationConfig;
  floor: number;
  floorPlanUrl: string | null;
  obstructions: ObstructionCell[];
  editable?: boolean;
  onPaintCell?: (x: number, y: number, wall: boolean) => void;
}

const classColor: Record<string, string> = { LOW: "#6ac5a5", MEDIUM: "#e6b46d", HIGH: "#e77f77" };

export default function RunCanvas({ result, config, floor, floorPlanUrl, obstructions, editable = false, onPaintCell }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  // Whether the current drag adds or removes walls, decided by the first cell pressed.
  const paintRef = useRef<boolean | null>(null);
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!floorPlanUrl) { imageRef.current = null; return; }
    const image = new Image();
    image.onload = () => { imageRef.current = image; draw(); };
    image.src = floorPlanUrl;
    imageRef.current = null;
    // Image remains a local browser object URL and is never sent with the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorPlanUrl]);

  useEffect(() => { draw(); }, [result, config, floor, floorPlanUrl, obstructions, editable]);

  function layout() {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const w = bounds.width, h = bounds.height;
    const pad = 36;
    const cell = Math.min((w - pad * 2) / config.gridWidth, (h - pad * 2) / config.gridHeight);
    const ox = (w - cell * config.gridWidth) / 2;
    const oy = (h - cell * config.gridHeight) / 2;
    return { bounds, w, h, cell, ox, oy };
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { bounds, w, h, cell, ox, oy } = layout();
    if (!bounds.width || !bounds.height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = bounds.width * scale;
    canvas.height = bounds.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#111a20";
    ctx.fillRect(0, 0, w, h);
    const px = (x: number) => ox + (x + 0.5) * cell;
    const py = (y: number) => h - (oy + (y + 0.5) * cell);

    // The selected image is an uncalibrated visual reference, drawn entirely client-side.
    if (imageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.drawImage(imageRef.current, ox, oy, cell * config.gridWidth, cell * config.gridHeight);
      ctx.restore();
    }
    ctx.strokeStyle = editable ? "rgba(136,163,161,.32)" : "rgba(136,163,161,.16)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= config.gridWidth; x++) {
      ctx.beginPath(); ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + config.gridHeight * cell); ctx.stroke();
    }
    for (let y = 0; y <= config.gridHeight; y++) {
      ctx.beginPath(); ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + config.gridWidth * cell, oy + y * cell); ctx.stroke();
    }
    obstructions.filter(wall => wall.floor === floor && wall.x < config.gridWidth && wall.y < config.gridHeight).forEach(wall => {
      const left = ox + wall.x * cell, top = h - oy - (wall.y + 1) * cell;
      ctx.fillStyle = "rgba(176,140,108,.55)";
      ctx.fillRect(left + 1, top + 1, cell - 2, cell - 2);
      ctx.strokeStyle = "#c9a27f"; ctx.lineWidth = 1;
      ctx.strokeRect(left + 1, top + 1, cell - 2, cell - 2);
    });
    if (result) {
      result.users.filter(u => u.floor === floor).forEach(user => {
        const cluster = result.clusters.find(item => item.id === user.clusterId);
        ctx.fillStyle = cluster ? `${classColor[cluster.densityClass]}b8` : "#91b9bd";
        ctx.beginPath(); ctx.arc(px(user.x), py(user.y), Math.max(2.2, cell * 0.12), 0, Math.PI * 2); ctx.fill();
      });
      result.apNodes.filter(ap => ap.floor === floor).forEach(ap => {
        const x = px(ap.x), y = py(ap.y);
        ctx.beginPath(); ctx.arc(x, y, Math.max(8, cell * 0.36), 0, Math.PI * 2);
        ctx.fillStyle = ap.congested ? "rgba(231,127,119,.18)" : "rgba(106,197,165,.16)";
        ctx.fill(); ctx.strokeStyle = ap.congested ? "#e77f77" : "#6ac5a5"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = ap.congested ? "#f0a49c" : "#d4eee4";
        ctx.font = `600 ${Math.max(9, Math.min(12, cell * .3))}px 'DM Mono', monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ap.id, x, y);
        ctx.fillStyle = "rgba(212,238,228,.6)";
        ctx.font = `${Math.max(8, Math.min(10, cell * .24))}px 'DM Mono', monospace`;
        ctx.fillText(`ch ${ap.channel}`, x, y + Math.max(10, cell * 0.3));
      });
    }
    ctx.fillStyle = "rgba(192,208,204,.5)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    for (let x = 0; x < config.gridWidth; x += 4) ctx.fillText(String(x), px(x), h - oy + 7);
  }

  function cellAt(event: PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const { bounds, h, cell, ox, oy } = layout();
    const x = Math.floor((event.clientX - bounds.left - ox) / cell);
    const y = Math.floor((h - oy - (event.clientY - bounds.top)) / cell);
    if (x < 0 || y < 0 || x >= config.gridWidth || y >= config.gridHeight) return null;
    return { x, y };
  }

  function paint(event: PointerEvent<HTMLCanvasElement>) {
    if (!editable || !onPaintCell || paintRef.current === null) return;
    const target = cellAt(event);
    if (!target) return;
    const last = lastCellRef.current;
    if (last && last.x === target.x && last.y === target.y) return;
    // Pointer events can skip cells on a fast drag, so fill the line between samples.
    const from = last ?? target;
    const steps = Math.max(Math.abs(target.x - from.x), Math.abs(target.y - from.y));
    for (let step = last ? 1 : 0; step <= steps; step++) {
      const t = steps === 0 ? 0 : step / steps;
      onPaintCell(Math.round(from.x + (target.x - from.x) * t), Math.round(from.y + (target.y - from.y) * t), paintRef.current);
    }
    lastCellRef.current = target;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [result, config, floor, obstructions, editable]);

  return <canvas
    ref={canvasRef}
    data-testid="canvas-run-map"
    className={`block h-full min-h-[320px] w-full ${editable ? "cursor-crosshair touch-none" : ""}`}
    aria-label={editable ? `Wall editor, floor ${floor + 1}. Click or drag across cells to add or remove walls.` : `WLAN planning map, floor ${floor + 1}`}
    onPointerDown={event => {
      if (!editable) return;
      const target = cellAt(event);
      if (!target) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      paintRef.current = !obstructions.some(wall => wall.x === target.x && wall.y === target.y && wall.floor === floor);
      lastCellRef.current = null;
      paint(event);
    }}
    onPointerMove={paint}
    onPointerUp={() => { paintRef.current = null; }}
    onPointerCancel={() => { paintRef.current = null; }}
  />;
}
