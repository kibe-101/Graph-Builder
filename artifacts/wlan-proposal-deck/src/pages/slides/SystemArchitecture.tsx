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

        <div className="flex flex-col items-center gap-[2vh] max-w-[80vw]">
          <div className="flex items-center gap-[2vw] w-full justify-center">
            <div className="w-[24vw] rounded-[0.8vw] bg-card border border-primary/30 p-[1.8vw] text-center">
              <p className="font-display font-bold text-[2.6vw] text-primary mb-[1vh]">Python Engine</p>
              <p className="font-body text-[2.1vw] text-muted leading-snug">
                Graph modelling, placement, density, bandwidth logic
              </p>
            </div>
            <svg className="w-[4vw] h-[2vw]" viewBox="0 0 100 40" fill="none">
              <path d="M2 20H90" stroke="#94A3B8" strokeWidth="2.5" />
              <path d="M78 10L92 20L78 30" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="w-[24vw] rounded-[0.8vw] bg-card border border-secondary/30 p-[1.8vw] text-center">
              <p className="font-display font-bold text-[2.6vw] text-secondary mb-[1vh]">API Layer</p>
              <p className="font-body text-[2.1vw] text-muted leading-snug">
                Express and PostgreSQL for persistence and API access
              </p>
            </div>
            <svg className="w-[4vw] h-[2vw]" viewBox="0 0 100 40" fill="none">
              <path d="M2 20H90" stroke="#94A3B8" strokeWidth="2.5" />
              <path d="M78 10L92 20L78 30" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="w-[24vw] rounded-[0.8vw] bg-card border border-accent/30 p-[1.8vw] text-center">
              <p className="font-display font-bold text-[2.6vw] text-accent mb-[1vh]">React Frontend</p>
              <p className="font-body text-[2.1vw] text-muted leading-snug">
                TypeScript UI for interactive visualisation
              </p>
            </div>
          </div>

          <svg className="w-[2vw] h-[3vh]" viewBox="0 0 20 40" fill="none">
            <path d="M10 2V32" stroke="#94A3B8" strokeWidth="2.5" />
            <path d="M2 24L10 34L18 24" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="w-[40vw] rounded-[0.8vw] bg-card border border-white/10 p-[1.6vw] text-center">
            <p className="font-body text-[2.3vw] text-text/85">
              PostgreSQL database
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
