const base = import.meta.env.BASE_URL;

export default function InteractiveSimulation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary dot-grid">
      <div className="relative h-full flex items-center pl-[8vw] pr-[4vw] gap-[3vw]">
        <div className="w-[42vw]">
          <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-teal font-medium mb-[2.5vh]">
            Implementation
          </p>
          <h2 className="font-display font-bold text-[4.2vw] leading-[1.05] text-bg text-wrap-balance mb-[4vh]">
            Interactive Simulation
          </h2>

          <div className="flex flex-col gap-[2.4vh]">
            <p className="font-body text-[2.8vw] leading-snug text-bg/90">
              Place a venue grid, generate simulated crowds, and view AP coverage live.
            </p>
            <p className="font-body text-[2.8vw] leading-snug text-bg/75">
              Heatmaps show signal strength and density zones.
            </p>
            <p className="font-body text-[2.8vw] leading-snug text-bg/75">
              Bandwidth allocation updates as density shifts across the grid.
            </p>
          </div>
        </div>

        <div className="w-[42vw] h-[60vh] relative">
          <img
            src={`${base}dashboard-mockup.png`}
            crossOrigin="anonymous"
            alt="Mockup of the interactive simulation dashboard with heatmap and coverage circles"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
