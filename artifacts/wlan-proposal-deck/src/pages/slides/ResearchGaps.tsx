export default function ResearchGaps() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[10vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
          Literature Review
        </p>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[6vh] max-w-[52vw]">
          Research Gaps
        </h2>

        <div className="flex flex-col gap-[2.4vh] max-w-[68vw]">
          <div className="flex items-center gap-[1.8vw] rounded-[0.7vw] bg-card border border-white/5 px-[2.2vw] py-[2.4vh]">
            <div className="w-[2.6vw] h-[2.6vw] rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <div className="w-[1vw] h-[1vw] rounded-full bg-primary" />
            </div>
            <p className="font-body text-[2.8vw] leading-snug text-text">
              AP placement research optimizes coverage but rarely accounts for crowd density.
            </p>
          </div>
          <div className="flex items-center gap-[1.8vw] rounded-[0.7vw] bg-card border border-white/5 px-[2.2vw] py-[2.4vh]">
            <div className="w-[2.6vw] h-[2.6vw] rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
              <div className="w-[1vw] h-[1vw] rounded-full bg-secondary" />
            </div>
            <p className="font-body text-[2.8vw] leading-snug text-text">
              Density estimation studies rarely connect back to network resource allocation.
            </p>
          </div>
          <div className="flex items-center gap-[1.8vw] rounded-[0.7vw] bg-card border border-white/5 px-[2.2vw] py-[2.4vh]">
            <div className="w-[2.6vw] h-[2.6vw] rounded-full bg-accent/15 flex items-center justify-center shrink-0">
              <div className="w-[1vw] h-[1vw] rounded-full bg-accent" />
            </div>
            <p className="font-body text-[2.8vw] leading-snug text-text">
              Few systems unify placement, density, and load balancing in one interactive model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
