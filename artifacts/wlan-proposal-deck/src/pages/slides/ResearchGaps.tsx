export default function ResearchGaps() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-[8vh] right-[6vw] w-[3vw] h-[3vw] rounded-full bg-teal" />

      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[10vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-accent font-medium mb-[2.5vh]">
          Literature Review
        </p>
        <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-primary text-wrap-balance mb-[6vh] max-w-[50vw]">
          Research Gaps
        </h2>

        <div className="flex flex-col gap-[3.4vh] max-w-[62vw]">
          <div className="flex items-start gap-[1.6vw]">
            <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-accent mt-[1.1vw] shrink-0" />
            <p className="font-body text-[3vw] leading-snug text-primary">
              AP placement research optimizes coverage but rarely accounts for crowd density.
            </p>
          </div>
          <div className="flex items-start gap-[1.6vw]">
            <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-teal mt-[1.1vw] shrink-0" />
            <p className="font-body text-[3vw] leading-snug text-primary">
              Density estimation studies rarely connect back to network resource allocation.
            </p>
          </div>
          <div className="flex items-start gap-[1.6vw]">
            <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-primary mt-[1.1vw] shrink-0" />
            <p className="font-body text-[3vw] leading-snug text-primary">
              Few systems unify placement, density, and load balancing in one interactive model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
