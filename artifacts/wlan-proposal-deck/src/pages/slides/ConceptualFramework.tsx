export default function ConceptualFramework() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
          Design and Analysis
        </p>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[7vh]">
          Conceptual Framework
        </h2>

        <div className="flex items-center justify-between max-w-[82vw]">
          <div className="w-[23vw] rounded-[0.8vw] bg-card border border-primary/30 p-[2.2vw] flex flex-col items-center text-center">
            <p className="font-display font-bold text-[2.8vw] text-primary mb-[1.4vh]">AP Placement</p>
            <p className="font-body text-[2.2vw] text-muted leading-snug">
              Minimum Dominating Set on the venue graph
            </p>
          </div>

          <svg className="w-[6vw] h-[3vw]" viewBox="0 0 100 40" fill="none">
            <path d="M2 20H90" stroke="#3B82F6" strokeWidth="3" />
            <path d="M78 8L92 20L78 32" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="w-[23vw] rounded-[0.8vw] bg-card border border-secondary/30 p-[2.2vw] flex flex-col items-center text-center">
            <p className="font-display font-bold text-[2.8vw] text-secondary mb-[1.4vh]">Density Estimation</p>
            <p className="font-body text-[2.2vw] text-muted leading-snug">
              K-Means density classification
            </p>
          </div>

          <svg className="w-[6vw] h-[3vw]" viewBox="0 0 100 40" fill="none">
            <path d="M2 20H90" stroke="#8B5CF6" strokeWidth="3" />
            <path d="M78 8L92 20L78 32" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="w-[23vw] rounded-[0.8vw] bg-card border border-accent/30 p-[2.2vw] flex flex-col items-center text-center">
            <p className="font-display font-bold text-[2.8vw] text-accent mb-[1.4vh]">Load Balancing</p>
            <p className="font-body text-[2.2vw] text-muted leading-snug">
              Bandwidth adapts to changing demand
            </p>
          </div>
        </div>

        <p className="font-body text-[2.4vw] text-muted mt-[6vh] max-w-[72vw] leading-relaxed">
          Placement → density → load balancing
        </p>
      </div>
    </div>
  );
}
