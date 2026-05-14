import { useEffect, useRef } from "react";
import { SimResults, SimConfig } from "./simulation";

interface Props {
  results: SimResults;
  config: SimConfig;
  highlightedAp: string | null;
  onApHover: (key: string | null) => void;
}

const DENSITY_COLORS = {
  LOW: "#4ade80",
  MEDIUM: "#fb923c",
  HIGH: "#f87171",
};

export default function SimCanvas({ results, config, highlightedAp, onApHover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;

    const PAD = 36;
    const cellW = (W - PAD * 2) / config.gridWidth;
    const cellH = (H - PAD * 2) / config.gridHeight;
    const cell = Math.min(cellW, cellH);
    const offsetX = (W - cell * config.gridWidth) / 2;
    const offsetY = (H - cell * config.gridHeight) / 2;

    const toCanvas = (gx: number, gy: number): [number, number] => [
      offsetX + gx * cell + cell / 2,
      H - (offsetY + gy * cell + cell / 2),
    ];

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Density heatmap
    const densityGrid = new Float32Array(config.gridWidth * config.gridHeight);
    for (const ap of results.apNodes) {
      const count = results.userCounts.get(`${ap[0]},${ap[1]}`) ?? 0;
      if (count === 0) continue;
      for (let gx = 0; gx < config.gridWidth; gx++) {
        for (let gy = 0; gy < config.gridHeight; gy++) {
          const d = Math.sqrt((gx - ap[0]) ** 2 + (gy - ap[1]) ** 2);
          if (d <= config.signalRadius) {
            densityGrid[gy * config.gridWidth + gx] += count / (d + 1);
          }
        }
      }
    }
    const maxDensity = Math.max(...densityGrid);
    for (let gx = 0; gx < config.gridWidth; gx++) {
      for (let gy = 0; gy < config.gridHeight; gy++) {
        const v = densityGrid[gy * config.gridWidth + gx] / (maxDensity || 1);
        if (v < 0.01) continue;
        const [cx, cy] = toCanvas(gx, gy);
        const alpha = v * 0.55;
        const r = Math.round(v * 220);
        const g = Math.round((1 - v) * 120);
        ctx.fillStyle = `rgba(${r},${g},30,${alpha})`;
        ctx.fillRect(cx - cell / 2, cy - cell / 2, cell, cell);
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(100,120,160,0.18)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= config.gridWidth; x++) {
      const [cx] = toCanvas(x, 0);
      const [, cy0] = toCanvas(x, 0);
      const [, cy1] = toCanvas(x, config.gridHeight);
      ctx.beginPath();
      ctx.moveTo(cx - cell / 2, cy0 + cell / 2);
      ctx.lineTo(cx - cell / 2, cy1 - cell / 2 + cell);
      ctx.stroke();
    }
    for (let y = 0; y <= config.gridHeight; y++) {
      const [, cy] = toCanvas(0, y);
      const [cx0] = toCanvas(0, y);
      const [cx1] = toCanvas(config.gridWidth, y);
      ctx.beginPath();
      ctx.moveTo(cx0 - cell / 2, cy + cell / 2);
      ctx.lineTo(cx1 - cell / 2 + cell, cy + cell / 2);
      ctx.stroke();
    }

    // Coverage circles
    for (const ap of results.apNodes) {
      const [cx, cy] = toCanvas(ap[0], ap[1]);
      const apKey = `${ap[0]},${ap[1]}`;
      const isHighlighted = highlightedAp === apKey;
      const r = config.signalRadius * cell;
      const isCongested = results.congestion.get(apKey);

      if (r <= 0) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isHighlighted
        ? "rgba(96,165,250,0.18)"
        : isCongested
        ? "rgba(239,68,68,0.07)"
        : "rgba(59,130,246,0.06)";
      ctx.fill();
      ctx.strokeStyle = isHighlighted
        ? "rgba(96,165,250,0.7)"
        : isCongested
        ? "rgba(239,68,68,0.4)"
        : "rgba(59,130,246,0.3)";
      ctx.lineWidth = isHighlighted ? 1.5 : 1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Users
    ctx.fillStyle = "rgba(147,197,253,0.8)";
    for (const user of results.users) {
      const [cx, cy] = toCanvas(user[0], user[1]);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, cell * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }

    // APs
    for (const ap of results.apNodes) {
      const [cx, cy] = toCanvas(ap[0], ap[1]);
      const apKey = `${ap[0]},${ap[1]}`;
      const isCongested = results.congestion.get(apKey);
      const isHighlighted = highlightedAp === apKey;
      const count = results.userCounts.get(apKey) ?? 0;
      const cls = results.densityClass.get(apKey) ?? "LOW";

      const starSize = isHighlighted ? cell * 0.48 : cell * 0.36;

      // Glow
      if (isCongested || isHighlighted) {
        ctx.shadowColor = isCongested ? "#ef4444" : "#60a5fa";
        ctx.shadowBlur = 14;
      }

      // Draw star
      drawStar(ctx, cx, cy, 5, starSize, starSize * 0.42);

      ctx.fillStyle = isCongested ? "#ef4444" : "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = isCongested ? "#fca5a5" : DENSITY_COLORS[cls];
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // User count label
      const labelR = starSize * 0.62;
      ctx.fillStyle = isCongested ? "#fca5a5" : "#bfdbfe";
      ctx.font = `bold ${Math.max(8, cell * 0.26)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), cx + labelR, cy - labelR);
    }

    // Axis labels
    ctx.fillStyle = "rgba(148,163,184,0.55)";
    ctx.font = `${Math.max(9, cell * 0.3)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = 0; x < config.gridWidth; x += 4) {
      const [cx] = toCanvas(x, 0);
      const [, cy] = toCanvas(x, 0);
      ctx.fillText(String(x), cx, cy + cell / 2 + 2);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = 0; y < config.gridHeight; y += 4) {
      const [cx, cy] = toCanvas(0, y);
      ctx.fillText(String(y), cx - cell / 2 - 2, cy);
    }
  }, [results, config, highlightedAp]);

  // Mouse hover to detect AP
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const cell = Math.min(
      (W - 72) / config.gridWidth,
      (H - 72) / config.gridHeight
    );
    const offsetX = (W - cell * config.gridWidth) / 2;
    const offsetY = (H - cell * config.gridHeight) / 2;

    let found: string | null = null;
    for (const ap of results.apNodes) {
      const cx = offsetX + ap[0] * cell + cell / 2;
      const cy = H - (offsetY + ap[1] * cell + cell / 2);
      if (Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) < cell * 0.5) {
        found = `${ap[0]},${ap[1]}`;
        break;
      }
    }
    onApHover(found);
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onApHover(null)}
      />
    </div>
  );
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}
