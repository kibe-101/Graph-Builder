import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, ArrowDownToLine, Check, ChevronDown, CircleHelp,
  FileImage, FileSpreadsheet, Layers3, MapPinned, Play, Radio, RotateCcw,
  Settings2, ShieldCheck, Signal, Upload, Wifi,
} from "lucide-react";
import {
  getListSimulationRunsQueryKey, useCreateSimulationRun, useListSimulationRuns,
} from "@workspace/api-client-react";
import type {
  SimulationRun, SimulationRunInput, UserMeasurement, WlanSimulationConfig,
} from "@workspace/api-client-react";
import RunCanvas from "./RunCanvas";

const DEFAULT_CONFIG: WlanSimulationConfig = {
  gridWidth: 20, gridHeight: 20, signalRadius: 3, numUsers: 100,
  apBandwidthMbps: 100, congestionThreshold: 0.8, minBandwidthPerUser: 1,
  randomSeed: 42, numFloors: 1, cellSizeMeters: 5, transmitPowerDbm: 20,
  referencePathLossDb: 40, pathLossExponent: 3, floorPenaltyDb: 15, minimumRssiDbm: -75,
  wallLossDbPerObstruction: 5,
};

const CONFIG_FIELDS: Array<{ key: keyof WlanSimulationConfig; label: string; min: number; max: number; step: number; unit?: string }> = [
  { key: "gridWidth", label: "Grid width", min: 5, max: 30, step: 1, unit: " cells" },
  { key: "gridHeight", label: "Grid height", min: 5, max: 30, step: 1, unit: " cells" },
  { key: "signalRadius", label: "Signal radius", min: 1, max: 8, step: 0.5, unit: " cells" },
  { key: "numFloors", label: "Floors", min: 1, max: 5, step: 1 },
  { key: "numUsers", label: "Simulated users", min: 10, max: 500, step: 10 },
  { key: "randomSeed", label: "Random seed", min: 1, max: 999, step: 1 },
  { key: "cellSizeMeters", label: "Cell size", min: 0.5, max: 50, step: 0.5, unit: " m" },
  { key: "apBandwidthMbps", label: "AP capacity", min: 10, max: 1000, step: 10, unit: " Mbps" },
  { key: "minBandwidthPerUser", label: "Target per user", min: 0.5, max: 20, step: 0.5, unit: " Mbps" },
  { key: "congestionThreshold", label: "Congestion threshold", min: 50, max: 100, step: 5, unit: " %" },
  { key: "transmitPowerDbm", label: "Transmit power", min: 0, max: 30, step: 1, unit: " dBm" },
  { key: "referencePathLossDb", label: "Reference path loss", min: 20, max: 80, step: 1, unit: " dB" },
  { key: "pathLossExponent", label: "Path-loss exponent", min: 1, max: 6, step: 0.1 },
  { key: "floorPenaltyDb", label: "Floor penetration", min: 0, max: 40, step: 1, unit: " dB" },
  { key: "minimumRssiDbm", label: "Minimum RSSI", min: -100, max: -30, step: 1, unit: " dBm" },
];

const REQUIRED_COLUMNS = ["apId", "apX", "apY", "x", "y", "floor"];
const OPTIONAL_COLUMNS = ["rssiDbm", "throughputMbps", "channelUtilizationPercent", "packetLossPercent"];
const ALLOWED_COLUMNS = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
const classColor: Record<string, string> = { LOW: "#6ac5a5", MEDIUM: "#e6b46d", HIGH: "#e77f77" };
type ViewTab = "map" | "aps" | "clusters" | "recommendations";

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let value = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("A CSV row contains an unclosed quote.");
  values.push(value.trim());
  return values;
}

function parseTelemetryCsv(text: string, config: WlanSimulationConfig): UserMeasurement[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) throw new Error("Add a header and at least one measurement row.");
  const headers = parseCsvRow(lines[0]);
  if (new Set(headers).size !== headers.length) throw new Error("CSV column names must be unique.");
  const unsupported = headers.filter(header => !ALLOWED_COLUMNS.has(header));
  if (unsupported.length) throw new Error(`Unsupported column "${unsupported[0]}". Only approved non-identifying measurement columns are accepted.`);
  const missing = REQUIRED_COLUMNS.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`Required column${missing.length > 1 ? "s" : ""} missing: ${missing.join(", ")}.`);
  if (headers.length > ALLOWED_COLUMNS.size) throw new Error("The CSV contains too many columns.");
  const rows = lines.slice(1);
  if (rows.length > 5000) throw new Error("A telemetry import is limited to 5,000 measurement rows.");
  const measurements = rows.map((line, index) => {
    const values = parseCsvRow(line);
    if (values.length !== headers.length) throw new Error(`Row ${index + 2} has a different number of values than the header.`);
    const record: Record<string, string> = {};
    headers.forEach((header, column) => { record[header] = values[column]; });
    const number = (key: string, optional = false): number | null => {
      const raw = record[key];
      if (optional && (raw === undefined || raw === "")) return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) throw new Error(`Row ${index + 2}: ${key} must be numeric.`);
      return parsed;
    };
    const apId = record.apId.trim();
    if (!apId || apId.length > 80) throw new Error(`Row ${index + 2}: apId must contain 1–80 characters.`);
    const apX = number("apX")!, apY = number("apY")!, x = number("x")!, y = number("y")!, floor = number("floor")!;
    const coordMaxX = Math.min(29, config.gridWidth - 1), coordMaxY = Math.min(29, config.gridHeight - 1);
    if (![apX, x].every(value => Number.isInteger(value) && value >= 0 && value <= coordMaxX)) throw new Error(`Row ${index + 2}: apX and x must be whole grid coordinates from 0 to ${coordMaxX}.`);
    if (![apY, y].every(value => Number.isInteger(value) && value >= 0 && value <= coordMaxY)) throw new Error(`Row ${index + 2}: apY and y must be whole grid coordinates from 0 to ${coordMaxY}.`);
    if (!Number.isInteger(floor) || floor < 0 || floor >= config.numFloors || floor > 4) throw new Error(`Row ${index + 2}: floor must be from 0 to ${config.numFloors - 1}.`);
    const rssiDbm = number("rssiDbm", true), throughputMbps = number("throughputMbps", true);
    const channelUtilizationPercent = number("channelUtilizationPercent", true), packetLossPercent = number("packetLossPercent", true);
    if (rssiDbm !== null && (rssiDbm < -120 || rssiDbm > 0)) throw new Error(`Row ${index + 2}: rssiDbm must be between -120 and 0.`);
    if (throughputMbps !== null && (throughputMbps < 0 || throughputMbps > 10000)) throw new Error(`Row ${index + 2}: throughputMbps must be between 0 and 10,000.`);
    if (channelUtilizationPercent !== null && (channelUtilizationPercent < 0 || channelUtilizationPercent > 100)) throw new Error(`Row ${index + 2}: channelUtilizationPercent must be 0–100.`);
    if (packetLossPercent !== null && (packetLossPercent < 0 || packetLossPercent > 100)) throw new Error(`Row ${index + 2}: packetLossPercent must be 0–100.`);
    return { apId, apX, apY, x, y, floor, ...(rssiDbm === null ? {} : { rssiDbm }), ...(throughputMbps === null ? {} : { throughputMbps }), ...(channelUtilizationPercent === null ? {} : { channelUtilizationPercent }), ...(packetLossPercent === null ? {} : { packetLossPercent }) };
  });
  return measurements;
}

function formatMetric(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function Metric({ label, value, detail, accent = false, testId }: { label: string; value: string; detail: string; accent?: boolean; testId: string }) {
  return <div data-testid={testId} className="min-w-0 border-l border-[#2b393d] py-1 pl-4 first:border-l-0 first:pl-0">
    <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#849492]">{label}</div>
    <div className={`mt-1 font-mono text-[22px] font-medium tracking-tight ${accent ? "text-[#7dd2b1]" : "text-[#e4eae5]"}`}>{value}</div>
    <div className="mt-0.5 text-[10px] text-[#75817f]">{detail}</div>
  </div>;
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-lg border border-[#2b383c] bg-[#172126] px-3 py-2"><div className="font-mono text-sm text-[#dce5df]">{value}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#74817f]">{label}</div></div>;
}

function App() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<WlanSimulationConfig>(DEFAULT_CONFIG);
  const [sourceMode, setSourceMode] = useState<"simulation" | "telemetry">("simulation");
  const [measurements, setMeasurements] = useState<UserMeasurement[]>([]);
  const [csvName, setCsvName] = useState("");
  const [csvError, setCsvError] = useState("");
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [tab, setTab] = useState<ViewTab>("map");
  const [floor, setFloor] = useState(0);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [floorPlanName, setFloorPlanName] = useState("");
  const [formError, setFormError] = useState("");
  const createRun = useCreateSimulationRun();
  const recentRuns = useListSimulationRuns();

  useEffect(() => () => { if (floorPlanUrl) URL.revokeObjectURL(floorPlanUrl); }, [floorPlanUrl]);
  const result = run?.result ?? null;
  const visibleAps = useMemo(() => result?.apNodes.filter(ap => ap.floor === floor) ?? [], [result, floor]);
  const recommendations = result?.loadSuggestions ?? [];

  const setNumeric = (field: keyof WlanSimulationConfig, value: number) => {
    setConfig(current => ({ ...current, [field]: field === "congestionThreshold" ? value / 100 : value }));
  };
  const setValueForField = (field: keyof WlanSimulationConfig, value: number) => setConfig(current => ({ ...current, [field]: value }));

  const onCsvChange = async (file?: File) => {
    if (!file) return;
    setCsvError("");
    setMeasurements([]);
    setCsvName(file.name);
    try {
      const parsed = parseTelemetryCsv(await file.text(), config);
      setMeasurements(parsed);
    } catch (error) {
      setCsvName("");
      setCsvError(error instanceof Error ? error.message : "Unable to read this CSV file.");
    }
  };

  const validateConfig = (): string => {
    for (const field of CONFIG_FIELDS) {
      const value = field.key === "congestionThreshold"
        ? config.congestionThreshold * 100
        : config[field.key];
      if (!Number.isFinite(value) || value < field.min || value > field.max) return `${field.label} must be between ${field.min} and ${field.max}${field.unit ?? ""}.`;
    }
    if (sourceMode === "telemetry" && measurements.length === 0) return "Import a valid telemetry CSV before running an analysis.";
    if (sourceMode === "telemetry" && measurements.some(point =>
      point.apX >= config.gridWidth || point.x >= config.gridWidth ||
      point.apY >= config.gridHeight || point.y >= config.gridHeight ||
      point.floor >= config.numFloors
    )) return "Telemetry coordinates exceed the current venue grid or floor count. Adjust the venue or import the CSV again.";
    return "";
  };

  const runAnalysis = () => {
    const validation = validateConfig();
    setFormError(validation);
    if (validation) return;
    const payload: SimulationRunInput = {
      sourceMode,
      config,
      ...(sourceMode === "telemetry" ? { measurements } : {}),
    };
    createRun.mutate({ data: payload }, {
      onSuccess: (savedRun) => {
        setRun(savedRun);
        setFloor(0);
        setFormError("");
        void queryClient.invalidateQueries({ queryKey: getListSimulationRunsQueryKey() });
      },
      onError: (error) => {
        setFormError(error instanceof Error ? error.message : "The analysis could not be saved. Try again.");
      },
    });
  };

  const downloadTemplate = () => {
    const content = "apId,apX,apY,x,y,floor,rssiDbm,throughputMbps,channelUtilizationPercent,packetLossPercent\nAP-01,4,5,6,7,0,-61.5,84,38,0.5\n";
    const href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href; link.download = "wlan-telemetry-template.csv"; link.click();
    URL.revokeObjectURL(href);
  };

  const onFloorPlan = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setFormError("Choose a supported image file for the floor-plan overlay."); return; }
    if (floorPlanUrl) URL.revokeObjectURL(floorPlanUrl);
    setFloorPlanUrl(URL.createObjectURL(file));
    setFloorPlanName(file.name);
    setFormError("");
  };

  const metrics = result?.metrics;
  const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const queryError = recentRuns.isError ? "Recent run summaries could not be loaded." : "";

  return <div className="min-h-[100dvh] bg-[#11181c] text-[#e4eae5]">
    <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-4 border-b border-[#293438] bg-[#141d21]/95 px-4 backdrop-blur-md md:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#398b77]/50 bg-[#1b4039] text-[#87d5b6]"><Radio size={19} strokeWidth={1.8} /></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-sm font-extrabold tracking-tight text-[#eff4ed]">WLAN Planning Simulator</h1><span className="hidden rounded border border-[#39504b] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#88b6a8] sm:inline">Planning console</span></div>
          <p className="mt-0.5 hidden text-[10px] text-[#82908e] sm:block">Venue modelling · anonymous telemetry analysis</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border border-[#2b393d] bg-[#192328] px-2.5 py-1.5 text-[10px] text-[#9db1a9] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#70c5a2]" /> LOCAL MODEL</div>
        <button type="button" onClick={runAnalysis} disabled={createRun.isPending} data-testid="button-run-analysis" className="inline-flex items-center gap-2 rounded-md bg-[#6ac5a5] px-3.5 py-2 text-xs font-extrabold text-[#10211c] transition hover:bg-[#83d4b6] disabled:cursor-wait disabled:opacity-60">
          {createRun.isPending ? <Activity size={14} className="animate-pulse" /> : <Play size={13} fill="currentColor" />}<span>{createRun.isPending ? "Analysing…" : "Run analysis"}</span>
        </button>
      </div>
    </header>

    <div className="grid min-h-[calc(100dvh-68px)] grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="border-b border-[#293438] bg-[#151e22] lg:border-b-0 lg:border-r">
        <div className="space-y-5 p-4 md:p-5">
          <section>
            <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Settings2 size={14} className="text-[#75c7a7]" /><h2 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#aab7b2]">Analysis source</h2></div>
              <span className="font-mono text-[9px] text-[#6f807d]">01 / 02</span></div>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#2c393d] bg-[#11191d] p-1">
              {(["simulation", "telemetry"] as const).map(mode => <button key={mode} type="button" onClick={() => { setSourceMode(mode); setFormError(""); }} data-testid={`button-source-${mode}`} className={`rounded-md px-2 py-2 text-[10px] font-bold capitalize transition ${sourceMode === mode ? "bg-[#29433d] text-[#a4e0c5] shadow-sm" : "text-[#83918e] hover:text-[#d0dbd5]"}`}>{mode === "simulation" ? "Simulated venue" : "CSV telemetry"}</button>)}
            </div>
            {sourceMode === "telemetry" && <div className="mt-3 rounded-lg border border-[#344047] bg-[#1a252a] p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[#d9e1dc]"><FileSpreadsheet size={13} className="text-[#78c7a7]" /> Import survey points</div>
              <p className="mb-3 text-[10px] leading-relaxed text-[#8f9d99]">Only approved coordinate and radio-measurement columns are accepted. No client names or device identifiers.</p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#486159] bg-[#1e302d] px-3 py-2 text-[10px] font-bold text-[#b6dfcb] hover:bg-[#27403a]">
                <Upload size={13} /> {csvName || "Choose a CSV file"}
                <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="input-telemetry-csv" onChange={event => void onCsvChange(event.target.files?.[0])} />
              </label>
              <button type="button" onClick={downloadTemplate} data-testid="button-download-csv-template" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#8eb9aa] hover:text-[#c6ead8]"><ArrowDownToLine size={12} /> Download CSV template</button>
              {measurements.length > 0 && <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#7ed1a7]" data-testid="status-telemetry-ready"><Check size={12} /> {measurements.length} measurements ready</div>}
              {csvError && <p role="alert" data-testid="text-csv-validation-error" className="mt-2 text-[10px] leading-relaxed text-[#f09b91]">{csvError}</p>}
            </div>}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Layers3 size={14} className="text-[#75c7a7]" /><h2 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#aab7b2]">Venue parameters</h2></div><span className="font-mono text-[9px] text-[#6f807d]">02 / 02</span></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              {CONFIG_FIELDS.slice(0, 6).map(field => <label key={field.key} className="min-w-0" data-testid={`control-${field.key}`}>
                <span className="mb-1 flex min-h-7 items-end justify-between gap-1 text-[9px] font-semibold leading-tight text-[#9ba9a5]"><span>{field.label}</span><span className="shrink-0 font-mono text-[9px] text-[#d5e0da]">{config[field.key]}{field.key === "congestionThreshold" ? "%" : field.unit ?? ""}</span></span>
                <input type="range" min={field.min} max={field.max} step={field.step} value={field.key === "congestionThreshold" ? config.congestionThreshold * 100 : config[field.key]} onChange={event => setNumeric(field.key, Number(event.target.value))} data-testid={`input-${field.key}`} aria-label={field.label} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#354347] accent-[#6ac5a5]" />
              </label>)}
            </div>
          </section>
          <details className="group rounded-lg border border-[#2a393d] bg-[#172126]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[10px] font-bold text-[#aab8b2]"><span className="flex items-center gap-2"><Signal size={13} className="text-[#80b8a7]" /> Radio model tuning</span><ChevronDown size={13} className="text-[#72817e] transition group-open:rotate-180" /></summary>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[#2b393d] px-3 py-3">
              {CONFIG_FIELDS.slice(6).map(field => <label key={field.key} className="min-w-0" data-testid={`control-${field.key}`}>
                <span className="mb-1 flex min-h-7 items-end justify-between gap-1 text-[9px] font-semibold leading-tight text-[#9ba9a5]"><span>{field.label}</span><span className="shrink-0 font-mono text-[9px] text-[#d5e0da]">{config[field.key]}{field.unit ?? ""}</span></span>
                <input type="range" min={field.min} max={field.max} step={field.step} value={config[field.key]} onChange={event => setValueForField(field.key, Number(event.target.value))} data-testid={`input-${field.key}`} aria-label={field.label} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#354347] accent-[#6ac5a5]" />
              </label>)}
            </div>
            <div className="px-3 pb-3 text-[9px] leading-relaxed text-[#768582]">Path-loss parameters calibrate the simulated link budget. Imported measurements are analysed as supplied.</div>
          </details>
          <section className="border-t border-[#29373b] pt-4">
            <div className="mb-2 flex items-center gap-2"><FileImage size={13} className="text-[#7bb7a5]" /><h2 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#aab7b2]">Floor-plan reference</h2></div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#303f43] bg-[#192328] px-3 py-2 text-[10px] font-semibold text-[#9caeaa] hover:border-[#52766b]">
              <Upload size={12} />{floorPlanName || "Add image overlay"}
              <input type="file" accept="image/*" className="sr-only" data-testid="input-floor-plan" onChange={event => onFloorPlan(event.target.files?.[0])} />
            </label>
            <div className="mt-2 flex gap-1.5 text-[9px] leading-relaxed text-[#7c8a86]"><CircleHelp size={12} className="mt-0.5 shrink-0 text-[#78a995]" /><span>Image-to-grid calibration is manual. The image stays in this browser and is never uploaded with a run.</span></div>
            {floorPlanName && <button type="button" data-testid="button-remove-floor-plan" onClick={() => { if (floorPlanUrl) URL.revokeObjectURL(floorPlanUrl); setFloorPlanUrl(null); setFloorPlanName(""); }} className="mt-2 text-[9px] font-bold text-[#de988e] hover:text-[#f2b7af]">Remove reference image</button>}
          </section>
          <div className="flex items-start gap-2 border-t border-[#29373b] pt-3 text-[9px] leading-relaxed text-[#7f8f8b]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#71b99a]" /><p>Planning suggestions are advisory only. This console does not modify real APs or WLAN clients.</p></div>
        </div>
      </aside>

      <main className="min-w-0 p-3 md:p-5 lg:p-6">
        {(formError || createRun.isError) && <div role="alert" data-testid="status-run-error" className="mb-4 flex items-start gap-2 rounded-md border border-[#754841] bg-[#352522] px-3 py-2.5 text-xs leading-relaxed text-[#f0aca0]"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{formError || (createRun.error instanceof Error ? createRun.error.message : "Analysis failed. Please retry.")}</div>}

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rise-in">
          <div><div className="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#82918d]"><MapPinned size={12} className="text-[#71c7a5]" /> Venue analysis / {sourceMode === "simulation" ? "synthetic model" : "survey telemetry"}</div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#edf2eb] md:text-[25px]">{run ? "Analysis overview" : "Planning workspace"}</h2>
            <p className="mt-1 text-[11px] text-[#82908d]">{run ? `${run.sourceMode === "simulation" ? "Simulated venue" : "Imported telemetry"} · Run #${run.id} · ${formatDate(run.createdAt)}` : "Configure a venue or import anonymous survey measurements to begin."}</p>
          </div>
          {run && <button type="button" data-testid="button-reset-view" onClick={() => { setRun(null); setFormError(""); }} className="inline-flex items-center gap-1.5 rounded-md border border-[#354348] px-2.5 py-1.5 text-[10px] font-bold text-[#9caaa6] hover:bg-[#1b272b]"><RotateCcw size={12} /> New analysis</button>}
        </div>

        {metrics ? <section data-testid="section-analysis-metrics" className="mb-4 grid grid-cols-2 gap-y-3 rounded-lg border border-[#2c393d] bg-[#172126] p-4 sm:grid-cols-3 lg:grid-cols-6 rise-in delay-1">
          <Metric label="Coverage" value={`${formatMetric(metrics.coveragePercent)}%`} detail={`${metrics.userCount} measured users`} accent testId="metric-coverage" />
          <Metric label="Average RSSI" value={`${formatMetric(metrics.avgRssiDbm)} dBm`} detail={`Minimum ${formatMetric(metrics.minRssiDbm)} dBm`} testId="metric-average-rssi" />
          <Metric label="Bandwidth / user" value={`${formatMetric(metrics.avgBandwidthPerUserMbps)} Mbps`} detail="Mean assigned capacity" testId="metric-bandwidth-user" />
          <Metric label="Congested APs" value={String(metrics.congestedApCount)} detail={`of ${metrics.apCount} access points`} testId="metric-congested-aps" />
          <Metric label="Load variation" value={formatMetric(metrics.loadCoefficientOfVariation, 2)} detail="Coefficient of variation" testId="metric-load-cv" />
          <Metric label="K-means clusters" value={String(metrics.clusterCount)} detail="Across venue floors" testId="metric-cluster-count" />
        </section> : null}

        <section className="overflow-hidden rounded-lg border border-[#2c393d] bg-[#151e22] rise-in delay-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a373b] px-3 py-2.5 md:px-4">
            <div className="flex items-center gap-1">
              {([["map", "Venue map"], ["aps", "AP details"], ["clusters", "User clusters"], ["recommendations", "Recommendations"]] as Array<[ViewTab, string]>).map(([id, label]) => <button type="button" key={id} onClick={() => setTab(id)} data-testid={`tab-${id}`} className={`rounded px-2.5 py-1.5 text-[10px] font-bold transition ${tab === id ? "bg-[#294039] text-[#a3dfc2]" : "text-[#84928e] hover:text-[#d5dfd9]"}`}>{label}</button>)}
            </div>
            <div className="flex items-center gap-2">
              {result && <label className="flex items-center gap-1.5 text-[10px] text-[#879591]">Floor <select value={floor} onChange={event => setFloor(Number(event.target.value))} data-testid="select-floor" className="rounded border border-[#344247] bg-[#192328] px-2 py-1 font-mono text-[10px] text-[#d2ded7]">{Array.from({ length: result.numFloors }, (_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label>}
              {run && <span className="hidden items-center gap-1 font-mono text-[9px] text-[#71807c] sm:flex"><Wifi size={12} /> {result?.edgeCount ?? 0} graph edges</span>}
            </div>
          </div>
          {!result ? <div className="flex min-h-[390px] flex-col items-center justify-center px-5 py-12 text-center" data-testid="empty-analysis">
            {createRun.isPending ? <><div className="mb-4 h-8 w-8 animate-pulse rounded-full border border-[#477366] bg-[#274039]" /><p className="text-sm font-bold text-[#dbe5de]">Calculating venue model</p><p className="mt-1 text-[10px] text-[#81908c]">The saved analysis will appear here shortly.</p></> : <><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#345047] bg-[#1c312b] text-[#83cdb0]"><MapPinned size={21} /></div><p className="text-sm font-bold text-[#dce5df]">Ready when you are</p><p className="mt-1 max-w-sm text-[10px] leading-relaxed text-[#83918e]">Set a venue profile or import non-identifying survey points. Run analysis to view coverage, clustering and access-point load.</p><button type="button" onClick={runAnalysis} disabled={createRun.isPending} data-testid="button-start-analysis" className="mt-4 rounded-md bg-[#6ac5a5] px-4 py-2 text-[10px] font-extrabold text-[#10211c] hover:bg-[#83d4b6] disabled:opacity-50">Run analysis</button></>}
          </div> : <>
            {tab === "map" && <div className="relative h-[390px] min-h-[320px] md:h-[490px]" data-testid="panel-venue-map"><RunCanvas result={result} config={run?.config ?? config} floor={floor} floorPlanUrl={floorPlanUrl} />
              <div className="absolute left-3 top-3 rounded-md border border-[#364348]/90 bg-[#131d21]/90 px-2.5 py-2 backdrop-blur"><div className="mb-1 text-[8px] font-bold uppercase tracking-[.15em] text-[#82918d]">Floor {floor + 1} / {result.numFloors}</div><div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-[#aab8b3]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#7dd2b1]" /> User point</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full border border-[#76c9a5]" /> Access point</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#e6b46d]" /> Cluster density</span></div></div>
              {floorPlanName && <div className="absolute bottom-3 left-3 rounded bg-[#141e22]/90 px-2 py-1 text-[9px] text-[#b1c0ba]" data-testid="status-floor-plan-overlay">Reference overlay · manually aligned</div>}
            </div>}
            {tab === "aps" && <div className="max-h-[490px] min-h-[320px] overflow-auto p-3 md:p-4" data-testid="panel-ap-details"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-extrabold text-[#dce5df]">Access-point inventory</h3><span className="font-mono text-[9px] text-[#80908b]">{visibleAps.length} on floor {floor + 1}</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[10px]"><thead><tr className="border-b border-[#2c393d] text-[9px] uppercase tracking-wider text-[#768681]">{["AP", "Position", "Users", "Mean RSSI", "Mbps / user", "Density", "Health"].map(label => <th key={label} className="pb-2 pr-4 font-bold">{label}</th>)}</tr></thead><tbody>{visibleAps.map(ap => <tr key={ap.id} data-testid={`row-ap-${ap.id}`} className="border-b border-[#283438] text-[#c5d0ca] hover:bg-[#1a262a]"><td className="py-2.5 pr-4 font-mono font-bold text-[#a9dec4]">{ap.id}</td><td className="py-2.5 pr-4 font-mono">({ap.x}, {ap.y})</td><td className="py-2.5 pr-4">{ap.userCount}</td><td className="py-2.5 pr-4 font-mono">{formatMetric(ap.avgRssiDbm)} dBm</td><td className="py-2.5 pr-4 font-mono">{formatMetric(ap.bandwidthPerUserMbps)} Mbps</td><td className="py-2.5 pr-4"><span className="rounded px-1.5 py-1 text-[8px] font-extrabold" style={{ color: classColor[ap.densityClass], backgroundColor: `${classColor[ap.densityClass]}1e` }}>{ap.densityClass}</span></td><td className={`py-2.5 pr-4 font-bold ${ap.congested ? "text-[#e99186]" : "text-[#7fc7a6]"}`}>{ap.congested ? "Congested" : "Within target"}</td></tr>)}</tbody></table>{visibleAps.length === 0 && <p className="py-10 text-center text-xs text-[#899792]">No access points on this floor.</p>}</div>
            </div>}
            {tab === "clusters" && <div className="max-h-[490px] min-h-[320px] overflow-auto p-3 md:p-4" data-testid="panel-user-clusters"><div className="mb-3"><h3 className="text-xs font-extrabold text-[#dce5df]">K-means user clusters</h3><p className="mt-1 text-[10px] text-[#84928e]">Spatial groupings of anonymous user points. Density classes reflect relative cluster population.</p></div>
              {result.clusters.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{result.clusters.filter(cluster => cluster.floor === floor).map(cluster => <article key={cluster.id} data-testid={`card-cluster-${cluster.id}`} className="rounded-lg border border-[#2b393d] bg-[#182327] p-3"><div className="flex items-start justify-between"><div><div className="font-mono text-[10px] font-bold text-[#a9d9c3]">Cluster {cluster.id}</div><div className="mt-1 text-[9px] text-[#83918c]">Center ({formatMetric(cluster.centerX, 1)}, {formatMetric(cluster.centerY, 1)})</div></div><span className="rounded px-1.5 py-1 text-[8px] font-extrabold" style={{ color: classColor[cluster.densityClass], backgroundColor: `${classColor[cluster.densityClass]}1e` }}>{cluster.densityClass} DENSITY</span></div><div className="mt-3 flex items-end justify-between border-t border-[#2a383c] pt-2"><span className="text-[9px] uppercase tracking-wider text-[#75847f]">User points</span><span className="font-mono text-sm text-[#e1e9e3]">{cluster.userCount}</span></div></article>)}</div> : <p className="py-10 text-center text-xs text-[#899792]">No cluster data was returned.</p>}
            </div>}
            {tab === "recommendations" && <div className="max-h-[490px] min-h-[320px] overflow-auto p-4 md:p-5" data-testid="panel-recommendations"><div className="mb-4 flex items-start gap-3"><div className="rounded-lg border border-[#574c38] bg-[#352f23] p-2 text-[#dfbd7f]"><AlertTriangle size={15} /></div><div><h3 className="text-xs font-extrabold text-[#e0e7e0]">Planning recommendations</h3><p className="mt-1 text-[10px] leading-relaxed text-[#8b9892]">Review these as planning options only. Nothing here changes live WLAN configuration.</p></div></div>
              <div className="space-y-2">{recommendations.length ? recommendations.map((suggestion, index) => <div key={`${index}-${suggestion}`} data-testid={`recommendation-${index}`} className="flex gap-3 rounded-lg border border-[#343c39] bg-[#1a2426] p-3"><span className="font-mono text-[10px] text-[#d5b774]">{String(index + 1).padStart(2, "0")}</span><p className="text-[11px] leading-relaxed text-[#c6d0ca]">{suggestion}</p></div>) : <div className="rounded-lg border border-[#2c393d] p-4 text-[11px] text-[#899792]">No recommendations were returned for this run.</div>}</div>
              <div className="mt-4 rounded-md border border-[#335347] bg-[#1a2d27] px-3 py-2.5 text-[10px] text-[#a4c8b7]">Suggestions are advisory. No client reassociation or access-point modification controls are provided.</div>
            </div>}
          </>}
        </section>

        <section className="mt-4 rounded-lg border border-[#2c393d] bg-[#151e22] p-3 md:p-4" data-testid="section-recent-runs">
          <div className="mb-3 flex items-center justify-between"><div><h3 className="text-[11px] font-extrabold text-[#dbe4de]">Recent saved analyses</h3><p className="mt-1 text-[9px] text-[#7f8e89]">Summary metrics only · latest saved venue runs</p></div><span className="font-mono text-[9px] text-[#75837e]">{recentRuns.data?.length ?? 0} records</span></div>
          {recentRuns.isLoading ? <div className="space-y-2" data-testid="loading-recent-runs">{[0, 1].map(i => <div key={i} className="h-9 animate-pulse rounded bg-[#202b2f]" />)}</div>
            : queryError ? <div role="alert" className="flex items-center justify-between rounded border border-[#6b443d] bg-[#332421] px-3 py-2 text-[10px] text-[#e9a69a]" data-testid="status-recent-runs-error"><span>{queryError}</span><button type="button" onClick={() => void recentRuns.refetch()} data-testid="button-retry-recent-runs" className="underline underline-offset-2">Retry</button></div>
            : recentRuns.data?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[9px]"><thead><tr className="border-b border-[#29373b] uppercase tracking-wider text-[#72817d]">{["Run", "Created", "Source", "APs", "Users", "Coverage", "Avg RSSI", "Congested"].map(item => <th key={item} className="pb-2 pr-3 font-bold">{item}</th>)}</tr></thead><tbody>{recentRuns.data.map(summary => <tr key={summary.id} data-testid={`row-recent-run-${summary.id}`} className="border-b border-[#283438] text-[#aebbb5]"><td className="py-2.5 pr-3 font-mono text-[#a5d7c0]">#{summary.id}</td><td className="py-2.5 pr-3">{formatDate(summary.createdAt)}</td><td className="py-2.5 pr-3 capitalize">{summary.sourceMode}</td><td className="py-2.5 pr-3">{summary.apCount}</td><td className="py-2.5 pr-3">{summary.userCount}</td><td className="py-2.5 pr-3 font-mono">{formatMetric(summary.coveragePercent)}%</td><td className="py-2.5 pr-3 font-mono">{formatMetric(summary.avgRssiDbm)} dBm</td><td className="py-2.5 pr-3">{summary.congestedApCount}</td></tr>)}</tbody></table></div>
            : <div className="rounded-md border border-dashed border-[#344247] px-3 py-5 text-center" data-testid="empty-recent-runs"><p className="text-[10px] font-semibold text-[#aab6b1]">No saved analyses yet</p><p className="mt-1 text-[9px] text-[#788681]">Run an analysis to keep its summary here.</p></div>}
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 py-4 text-[9px] text-[#6e7d78]"><span className="flex items-center gap-1.5"><ShieldCheck size={11} /> Non-identifying planning data only</span><span>Suggestions are not live network actions</span></footer>
      </main>
    </div>
  </div>;
}

export default App;
