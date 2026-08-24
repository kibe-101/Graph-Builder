export default function TheProblem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="absolute top-0 left-0 w-[0.4vw] h-full bg-primary" />

      <div className="relative h-full flex items-center pl-[7vw] pr-[4vw] gap-[4vw]">
        <div className="w-[42vw]">
          <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
            Introduction
          </p>
          <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[4vh]">
            The Problem
          </h2>

          <div className="flex flex-col gap-[2.2vh]">
            <p className="font-body text-[2.3vw] leading-snug text-text">
              Crowded venues face weak coverage and congestion.
            </p>
            <p className="font-body text-[2.3vw] leading-snug text-muted">
              Manual AP placement is costly and static.
            </p>
            <p className="font-body text-[2.3vw] leading-snug text-muted">
              Existing tools rarely connect coverage, density, and load.
            </p>
          </div>
        </div>

        <div className="w-[40vw] h-[62vh] rounded-[0.8vw] bg-card border border-white/5 p-[2vw] flex items-center justify-center">
          <svg viewBox="0 0 400 300" className="w-full h-full">
            {Array.from({ length: 8 }).map((_, col) =>
              Array.from({ length: 6 }).map((_, row) => (
                <rect
                  key={`${col}-${row}`}
                  x={10 + col * 48}
                  y={10 + row * 48}
                  width="44"
                  height="44"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                />
              )),
            )}
            <circle cx="90" cy="90" r="70" fill="#3B82F6" fillOpacity="0.18" />
            <circle cx="90" cy="90" r="42" fill="#3B82F6" fillOpacity="0.3" />
            <circle cx="90" cy="90" r="8" fill="#38BDF8" />
            <circle cx="310" cy="90" r="70" fill="#22C55E" fillOpacity="0.18" />
            <circle cx="310" cy="90" r="42" fill="#22C55E" fillOpacity="0.3" />
            <circle cx="310" cy="90" r="8" fill="#22C55E" />
            <circle cx="200" cy="230" r="70" fill="#F59E0B" fillOpacity="0.18" />
            <circle cx="200" cy="230" r="42" fill="#F59E0B" fillOpacity="0.3" />
            <circle cx="200" cy="230" r="8" fill="#F59E0B" />
            {[
              [150, 210], [165, 245], [180, 200], [195, 250], [210, 215],
              [225, 240], [240, 205], [255, 235], [130, 235], [270, 220],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3.5" fill="#F8FAFC" fillOpacity="0.75" />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
