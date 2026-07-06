const base = import.meta.env.BASE_URL;

export default function TheProblem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-[6vw] h-full bg-primary" />
      <div className="absolute top-[6vh] left-[6vw] w-[3vw] h-[3vw] rounded-full bg-accent" />

      <div className="relative h-full flex items-center pl-[13vw] pr-[4vw] gap-[4vw]">
        <div className="w-[46vw]">
          <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-accent font-medium mb-[2.5vh]">
            Introduction
          </p>
          <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-primary text-wrap-balance mb-[4vh]">
            The Problem
          </h2>

          <div className="flex flex-col gap-[2.6vh]">
            <p className="font-body text-[3vw] leading-snug text-primary">
              Dense public venues suffer poor Wi-Fi coverage and congestion.
            </p>
            <p className="font-body text-[3vw] leading-snug text-muted">
              Manual access point placement is slow, costly, and doesn't adapt to crowd movement.
            </p>
            <p className="font-body text-[3vw] leading-snug text-muted">
              Existing tools rarely combine coverage planning with real-time density and load awareness.
            </p>
          </div>
        </div>

        <div className="w-[36vw] h-[64vh] relative">
          <div className="absolute inset-0 rounded-[1.5vw] bg-primary/5" />
          <img
            src={`${base}hero-venue.png`}
            crossOrigin="anonymous"
            alt="Illustration of a crowded venue with varying Wi-Fi signal strength zones"
            className="relative w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
