export default function ConceptualFramework() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg dot-grid-dark">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-accent font-medium mb-[2.5vh]">
          Design and Analysis
        </p>
        <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-primary text-wrap-balance mb-[7vh]">
          Conceptual Framework
        </h2>

        <div className="flex items-center justify-between max-w-[80vw]">
          <div className="w-[22vw] rounded-[1.2vw] bg-primary p-[2.2vw] flex flex-col items-center text-center">
            <p className="font-display font-bold text-[3vw] text-bg mb-[1.4vh]">AP Placement</p>
            <p className="font-body text-[2.3vw] text-bg/75 leading-snug">
              Greedy Minimum Dominating Set over the venue grid graph
            </p>
          </div>

          <svg className="w-[6vw] h-[3vw]" viewBox="0 0 100 40" fill="none">
            <path d="M2 20H90" stroke="#FF6B47" strokeWidth="4" />
            <path d="M78 8L92 20L78 32" stroke="#FF6B47" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="w-[22vw] rounded-[1.2vw] bg-accent p-[2.2vw] flex flex-col items-center text-center">
            <p className="font-display font-bold text-[3vw] text-bg mb-[1.4vh]">Density Estimation</p>
            <p className="font-body text-[2.3vw] text-bg/85 leading-snug">
              Classifies crowd zones as Low, Medium, or High
            </p>
          </div>

          <svg className="w-[6vw] h-[3vw]" viewBox="0 0 100 40" fill="none">
            <path d="M2 20H90" stroke="#00B8B0" strokeWidth="4" />
            <path d="M78 8L92 20L78 32" stroke="#00B8B0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="w-[22vw] rounded-[1.2vw] bg-teal p-[2.2vw] flex flex-col items-center text-center">
            <p className="font-display font-bold text-[3vw] text-bg mb-[1.4vh]">Load Balancing</p>
            <p className="font-body text-[2.3vw] text-bg/90 leading-snug">
              Reallocates bandwidth across APs as density shifts
            </p>
          </div>
        </div>

        <p className="font-body text-[2.4vw] text-muted mt-[6vh] max-w-[70vw] leading-relaxed">
          Each layer feeds the next, forming a closed planning-to-optimization loop over the venue's grid graph.
        </p>
      </div>
    </div>
  );
}
