export default function AimObjectives() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary dot-grid">
      <div className="absolute -bottom-[16vh] -right-[10vw] w-[40vw] h-[40vw] rounded-full bg-teal/15 blur-[6vw]" />

      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-teal font-medium mb-[2.5vh]">
          Introduction
        </p>
        <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-bg text-wrap-balance mb-[5vh] max-w-[46vw]">
          Aim and Objectives
        </h2>

        <p className="font-body text-[3.2vw] text-accent font-medium mb-[4.5vh] max-w-[52vw] leading-snug">
          Design a graph-theoretic system for AP placement, crowd density estimation, and load balancing.
        </p>

        <div className="grid grid-cols-3 gap-[2.4vw]">
          <div className="border-t-[0.3vw] border-teal pt-[2.4vh]">
            <p className="font-display font-bold text-[3.6vw] text-bg mb-[1.6vh]">01</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/85">
              Model the venue as a graph and place APs using Minimum Dominating Set.
            </p>
          </div>
          <div className="border-t-[0.3vw] border-teal pt-[2.4vh]">
            <p className="font-display font-bold text-[3.6vw] text-bg mb-[1.6vh]">02</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/85">
              Estimate crowd density from user distribution and classify it as Low, Medium, or High.
            </p>
          </div>
          <div className="border-t-[0.3vw] border-teal pt-[2.4vh]">
            <p className="font-display font-bold text-[3.6vw] text-bg mb-[1.6vh]">03</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/85">
              Balance bandwidth allocation across APs based on live load.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
