export default function InteractiveSimulation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex items-center pl-[8vw] pr-[4vw] gap-[3vw]">
        <div className="w-[38vw]">
          <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
            Implementation
          </p>
          <h2 className="font-display font-bold text-[4vw] leading-[1.05] text-text text-wrap-balance mb-[4vh]">
            Interactive Simulation
          </h2>

          <div className="flex flex-col gap-[2.4vh]">
            <p className="font-body text-[2.7vw] leading-snug text-text/90">
              Place a venue grid, generate simulated crowds, and view AP coverage live.
            </p>
            <p className="font-body text-[2.7vw] leading-snug text-muted">
              Heatmaps show signal strength and density zones.
            </p>
            <p className="font-body text-[2.7vw] leading-snug text-muted">
              Bandwidth allocation updates as density shifts across the grid.
            </p>
          </div>
        </div>

        <div className="w-[46vw] h-[62vh] rounded-[0.8vw] bg-card border border-white/5 p-[2vw]">
          <svg viewBox="0 0 460 340" className="w-full h-full">
            {Array.from({ length: 9 }).map((_, col) =>
              Array.from({ length: 7 }).map((_, row) => (
                <rect
                  key={`${col}-${row}`}
                  x={6 + col * 50}
                  y={6 + row * 46}
                  width="46"
                  height="42"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                />
              )),
            )}
            <circle cx="110" cy="90" r="78" fill="#22C55E" fillOpacity="0.16" />
            <circle cx="110" cy="90" r="46" fill="#22C55E" fillOpacity="0.28" />
            <circle cx="110" cy="90" r="7" fill="#22C55E" />
            <circle cx="340" cy="110" r="78" fill="#F59E0B" fillOpacity="0.16" />
            <circle cx="340" cy="110" r="46" fill="#F59E0B" fillOpacity="0.28" />
            <circle cx="340" cy="110" r="7" fill="#F59E0B" />
            <circle cx="220" cy="260" r="78" fill="#3B82F6" fillOpacity="0.16" />
            <circle cx="220" cy="260" r="46" fill="#3B82F6" fillOpacity="0.28" />
            <circle cx="220" cy="260" r="7" fill="#38BDF8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
