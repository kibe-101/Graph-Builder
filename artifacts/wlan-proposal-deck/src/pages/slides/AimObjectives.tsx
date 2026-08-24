export default function AimObjectives() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
          Introduction
        </p>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[5vh] max-w-[52vw]">
          Aim and Objectives
        </h2>

        <p className="font-body text-[3vw] text-secondary font-medium mb-[4.5vh] max-w-[64vw] leading-snug">
          Design an intelligent system for WLAN planning and optimization.
        </p>

        <div className="grid grid-cols-3 gap-[2.4vw]">
          <div className="rounded-[0.8vw] bg-card border border-white/5 p-[2.2vw]">
            <p className="font-display font-bold text-[3.2vw] text-primary mb-[1.6vh]">01</p>
            <p className="font-body text-[2.6vw] leading-snug text-text/90">
              Model the venue as a graph and place APs efficiently.
            </p>
          </div>
          <div className="rounded-[0.8vw] bg-card border border-white/5 p-[2.2vw]">
            <p className="font-display font-bold text-[3.2vw] text-secondary mb-[1.6vh]">02</p>
            <p className="font-body text-[2.6vw] leading-snug text-text/90">
              Estimate density with K-Means clustering.
            </p>
          </div>
          <div className="rounded-[0.8vw] bg-card border border-white/5 p-[2.2vw]">
            <p className="font-display font-bold text-[3.2vw] text-accent mb-[1.6vh]">03</p>
            <p className="font-body text-[2.6vw] leading-snug text-text/90">
              Balance bandwidth as network load changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
