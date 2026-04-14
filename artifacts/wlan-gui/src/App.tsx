import { useState, useCallback, useEffect } from "react";
import SimCanvas from "./SimCanvas";
import { runSimulation, SimConfig, SimResults, DEFAULT_CONFIG } from "./simulation";

function nodeKey(n: [number, number]) { return `${n[0]},${n[1]}`; }

const DENSITY_BADGE: Record<string, string> = {
  LOW: "bg-green-500/20 text-green-400 border border-green-500/30",
  MEDIUM: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  HIGH: "bg-red-500/20 text-red-400 border border-red-500/30",
};

function Slider({
  label, value, min, max, step, onChange, unit,
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono font-semibold">
          {value}{unit ?? ""}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-slate-700 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-500
          [&::-webkit-slider-thumb]:cursor-pointer
          accent-blue-500"
      />
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<SimResults | null>(null);
  const [highlightedAp, setHighlightedAp] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "aps" | "tips">("map");
  const [isRunning, setIsRunning] = useState(false);

  const runSim = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(runSimulation(config));
      setIsRunning(false);
    }, 30);
  }, [config]);

  // Run on mount
  useEffect(() => { runSim(); }, []);

  const update = (key: keyof SimConfig) => (v: number) =>
    setConfig(c => ({ ...c, [key]: v }));

  const congestionCount = results
    ? [...results.congestion.values()].filter(Boolean).length
    : 0;

  const overallAvgRssi = results
    ? (() => {
        const vals = [...results.avgRssi.values()].filter(v => v !== null) as number[];
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "–";
      })()
    : "–";

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="white" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
              WLAN Planning Simulator
            </h1>
            <p className="text-[11px] text-slate-500">Graph-Based AP Placement &amp; Crowd Density</p>
          </div>
        </div>
        <button
          onClick={runSim}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold
            transition-colors shadow-lg shadow-blue-900/30"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Run Simulation
            </>
          )}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <aside className="w-64 shrink-0 border-r border-slate-800 p-4 overflow-y-auto flex flex-col gap-5">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Grid
            </p>
            <div className="flex flex-col gap-4">
              <Slider label="Width" value={config.gridWidth} min={5} max={30} step={1}
                onChange={update("gridWidth")} />
              <Slider label="Height" value={config.gridHeight} min={5} max={30} step={1}
                onChange={update("gridHeight")} />
              <Slider label="Signal Radius" value={config.signalRadius} min={1} max={8} step={0.5}
                onChange={update("signalRadius")} unit=" units" />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Users
            </p>
            <div className="flex flex-col gap-4">
              <Slider label="Number of Users" value={config.numUsers} min={10} max={500} step={10}
                onChange={update("numUsers")} />
              <Slider label="Random Seed" value={config.randomSeed} min={1} max={999} step={1}
                onChange={update("randomSeed")} />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Bandwidth
            </p>
            <div className="flex flex-col gap-4">
              <Slider label="AP Bandwidth" value={config.apBandwidthMbps} min={10} max={1000} step={10}
                onChange={update("apBandwidthMbps")} unit=" Mbps" />
              <Slider label="Min BW / User" value={config.minBandwidthPerUser} min={0.5} max={20} step={0.5}
                onChange={update("minBandwidthPerUser")} unit=" Mbps" />
              <Slider label="Congestion Threshold" value={Math.round(config.congestionThreshold * 100)}
                min={50} max={100} step={5}
                onChange={v => update("congestionThreshold")(v / 100)} unit="%" />
            </div>
          </div>

          {/* Quick stats */}
          {results && (
            <div className="mt-auto pt-4 border-t border-slate-800 grid grid-cols-2 gap-2">
              {[
                { label: "APs", value: results.apNodes.length },
                { label: "Users", value: results.users.length },
                { label: "Congested", value: congestionCount },
                { label: "Avg RSSI", value: `${overallAvgRssi}` },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-slate-800/60 p-2.5 text-center">
                  <div className="text-[11px] text-slate-500">{s.label}</div>
                  <div className="text-base font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tabs */}
          <div className="shrink-0 flex gap-1 px-4 pt-3 border-b border-slate-800">
            {(["map", "aps", "tips"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors capitalize
                  ${activeTab === tab
                    ? "bg-slate-800 text-white border border-b-0 border-slate-700"
                    : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                {tab === "map" ? "Grid Map" : tab === "aps" ? "AP Details" : "Load Balancing"}
              </button>
            ))}
          </div>

          {activeTab === "map" && (
            <div className="flex-1 p-3 overflow-hidden relative">
              {!results ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  Press Run Simulation to start
                </div>
              ) : (
                <>
                  <SimCanvas
                    results={results}
                    config={config}
                    highlightedAp={highlightedAp}
                    onApHover={setHighlightedAp}
                  />
                  {/* Hover tooltip */}
                  {highlightedAp && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700
                      rounded-lg px-4 py-2 text-xs shadow-xl pointer-events-none flex gap-4">
                      {(() => {
                        const count = results.userCounts.get(highlightedAp) ?? 0;
                        const bw = results.allocation.get(highlightedAp);
                        const cls = results.densityClass.get(highlightedAp) ?? "LOW";
                        const cong = results.congestion.get(highlightedAp);
                        const rssi = results.avgRssi.get(highlightedAp);
                        return (
                          <>
                            <span className="text-slate-400">AP ({highlightedAp})</span>
                            <span className="text-white font-semibold">{count} users</span>
                            <span className="text-slate-300">{bw !== null && bw !== undefined ? `${bw.toFixed(1)} Mbps/user` : "Idle"}</span>
                            <span className={`font-semibold ${cls === "HIGH" ? "text-red-400" : cls === "MEDIUM" ? "text-orange-400" : "text-green-400"}`}>
                              {cls}
                            </span>
                            {cong && <span className="text-red-400 font-bold">CONGESTED</span>}
                            {rssi !== null && rssi !== undefined && (
                              <span className="text-slate-400">RSSI: {rssi.toFixed(2)} dBm</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {/* Legend */}
                  <div className="absolute top-5 right-5 bg-slate-900/80 backdrop-blur border border-slate-700
                    rounded-lg p-3 text-[11px] flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">★</span>
                      <span className="text-slate-300">Access Point</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-300/80 inline-block" />
                      <span className="text-slate-300">User</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border border-dashed border-blue-400 inline-block" />
                      <span className="text-slate-300">Coverage</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="w-8 h-2.5 rounded bg-gradient-to-r from-[#1e3a2f] to-[#dc2626]" />
                      <span className="text-slate-300">Density</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-[11px]">★</span>
                      <span className="text-slate-300">Congested AP</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "aps" && results && (
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    {["AP Location", "Users", "BW/User", "RSSI (avg)", "Density", "Status"].map(h => (
                      <th key={h} className="text-left pb-2 pr-4 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.apNodes.map(ap => {
                    const k = nodeKey(ap);
                    const count = results.userCounts.get(k) ?? 0;
                    const bw = results.allocation.get(k);
                    const cls = results.densityClass.get(k) ?? "LOW";
                    const cong = results.congestion.get(k);
                    const rssi = results.avgRssi.get(k);
                    return (
                      <tr
                        key={k}
                        onMouseEnter={() => setHighlightedAp(k)}
                        onMouseLeave={() => setHighlightedAp(null)}
                        className={`border-b border-slate-800/50 transition-colors cursor-pointer
                          ${highlightedAp === k ? "bg-slate-800/60" : "hover:bg-slate-800/30"}`}
                      >
                        <td className="py-2 pr-4 font-mono text-slate-300">({k})</td>
                        <td className="py-2 pr-4 text-white font-semibold">{count}</td>
                        <td className="py-2 pr-4 text-slate-300">
                          {bw !== null && bw !== undefined ? `${bw.toFixed(1)} Mbps` : "–"}
                        </td>
                        <td className="py-2 pr-4 text-slate-400 font-mono">
                          {rssi !== null && rssi !== undefined ? `${rssi.toFixed(2)}` : "–"}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${DENSITY_BADGE[cls]}`}>
                            {cls}
                          </span>
                        </td>
                        <td className="py-2">
                          {cong ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              CONGESTED
                            </span>
                          ) : count === 0 ? (
                            <span className="text-slate-600">Idle</span>
                          ) : (
                            <span className="text-green-400">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "tips" && results && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-1">Load Balancing Suggestions</h3>
                <p className="text-xs text-slate-500 mb-4">
                  APs with more than 20% above average load are flagged. Moving users to nearby
                  underloaded APs can improve bandwidth and reduce congestion.
                </p>
                <div className="flex flex-col gap-2">
                  {results.loadSuggestions.map((s, i) => (
                    <div key={i} className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3 text-xs text-slate-300">
                      {s.startsWith("Load") || s.startsWith("All") ? (
                        <span className="text-green-400">{s}</span>
                      ) : (
                        <>
                          <span className="mr-2 text-orange-400">→</span>
                          {s}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3">Density Breakdown</h3>
                <div className="flex flex-col gap-2">
                  {results.apNodes.map(ap => {
                    const k = nodeKey(ap);
                    const count = results.userCounts.get(k) ?? 0;
                    const maxCount = Math.max(...[...results.userCounts.values()]);
                    const cls = results.densityClass.get(k) ?? "LOW";
                    const barColor = cls === "HIGH" ? "bg-red-500" : cls === "MEDIUM" ? "bg-orange-500" : "bg-green-500";
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-500 w-16 shrink-0">({k})</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-2.5">
                          <div
                            className={`${barColor} h-2.5 rounded-full transition-all`}
                            style={{ width: `${(count / (maxCount || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-300 w-8 text-right">{count}</span>
                        <span className={`text-[10px] w-14 text-right font-semibold ${cls === "HIGH" ? "text-red-400" : cls === "MEDIUM" ? "text-orange-400" : "text-green-400"}`}>
                          {cls}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
