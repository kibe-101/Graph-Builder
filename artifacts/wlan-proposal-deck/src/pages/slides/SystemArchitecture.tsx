export default function SystemArchitecture() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
          Implementation
        </p>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[6vh]">
          System Architecture
        </h2>

        <div className="w-full max-w-[84vw] rounded-[0.8vw] overflow-hidden border border-white/10 bg-card">
          <div className="grid grid-cols-[1fr_1.1fr_2.5fr] bg-primary/20 px-[2vw] py-[1.4vh]">
            <p className="font-display font-bold text-[2vw] text-text">Layer</p>
            <p className="font-display font-bold text-[2vw] text-text">Technology</p>
            <p className="font-display font-bold text-[2vw] text-text">Responsibility</p>
          </div>

          <div className="grid grid-cols-[1fr_1.1fr_2.5fr] border-t border-white/10 px-[2vw] py-[1.5vh]">
            <p className="font-body text-[1.9vw] font-medium text-primary">Simulation Engine</p>
            <p className="font-body text-[1.9vw] text-muted">Python</p>
            <p className="font-body text-[1.9vw] leading-snug text-text/90">
              Graph modelling, AP placement, K-Means, RSSI, and bandwidth optimization
            </p>
          </div>

          <div className="grid grid-cols-[1fr_1.1fr_2.5fr] border-t border-white/10 px-[2vw] py-[1.5vh]">
            <p className="font-body text-[1.9vw] font-medium text-secondary">API Layer</p>
            <p className="font-body text-[1.9vw] text-muted">Express</p>
            <p className="font-body text-[1.9vw] leading-snug text-text/90">
              Connects the simulation engine to the frontend
            </p>
          </div>

          <div className="grid grid-cols-[1fr_1.1fr_2.5fr] border-t border-white/10 px-[2vw] py-[1.5vh]">
            <p className="font-body text-[1.9vw] font-medium text-accent">Frontend</p>
            <p className="font-body text-[1.9vw] text-muted">React + TypeScript</p>
            <p className="font-body text-[1.9vw] leading-snug text-text/90">
              Visualizes coverage, density, signal strength, and network load
            </p>
          </div>

          <div className="grid grid-cols-[1fr_1.1fr_2.5fr] border-t border-white/10 px-[2vw] py-[1.5vh]">
            <p className="font-body text-[1.9vw] font-medium text-warning">Database</p>
            <p className="font-body text-[1.9vw] text-muted">PostgreSQL</p>
            <p className="font-body text-[1.9vw] leading-snug text-text/90">
              Stores configurations and simulation results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
