import { useEffect, useRef } from "react";
import type { SimulationResult, WlanSimulationConfig } from "@workspace/api-client-react";

interface Props {
  result: SimulationResult;
  config: WlanSimulationConfig;
  floor: number;
  floorPlanUrl: string | null;
}

const classColor: Record<string, string> = { LOW: "#6ac5a5", MEDIUM: "#e6b46d", HIGH: "#e77f77" };

export default function RunCanvas({ result, config, floor, floorPlanUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!floorPlanUrl) { imageRef.current = null; return; }
    const image = new Image();
    image.onload = () => { imageRef.current = image; draw(); };
    image.src = floorPlanUrl;
    imageRef.current = null;
    // Image remains a local browser object URL and is never sent with the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorPlanUrl]);

  useEffect(() => { draw(); }, [result, config, floor, floorPlanUrl]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = bounds.width * scale;
    canvas.height = bounds.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    const w = bounds.width, h = bounds.height;
    ctx.fillStyle = "#111a20";
    ctx.fillRect(0, 0, w, h);
    const pad = 36;
    const cell = Math.min((w - pad * 2) / config.gridWidth, (h - pad * 2) / config.gridHeight);
    const ox = (w - cell * config.gridWidth) / 2;
    const oy = (h - cell * config.gridHeight) / 2;
    const px = (x: number) => ox + (x + 0.5) * cell;
    const py = (y: number) => h - (oy + (y + 0.5) * cell);

    // The selected image is an uncalibrated visual reference, drawn entirely client-side.
    if (imageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.drawImage(imageRef.current, ox, oy, cell * config.gridWidth, cell * config.gridHeight);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(136,163,161,.16)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= config.gridWidth; x++) {
      ctx.beginPath(); ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + config.gridHeight * cell); ctx.stroke();
    }
    for (let y = 0; y <= config.gridHeight; y++) {
      ctx.beginPath(); ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + config.gridWidth * cell, oy + y * cell); ctx.stroke();
    }
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
    });
    ctx.fillStyle = "rgba(192,208,204,.5)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    for (let x = 0; x < config.gridWidth; x += 4) ctx.fillText(String(x), px(x), h - oy + 7);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [result, config, floor]);

  return <canvas ref={canvasRef} data-testid="canvas-run-map" className="block h-full min-h-[320px] w-full" aria-label={`WLAN planning map, floor ${floor + 1}`} />;
}
