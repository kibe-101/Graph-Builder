export default function CoreAlgorithms() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
          Design and Analysis
        </p>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[6vh] max-w-[52vw]">
          Core Algorithms
        </h2>

        <div className="grid grid-cols-2 gap-[2vw] max-w-[80vw]">
          <div className="flex items-start gap-[1.4vw] rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <p className="font-display font-bold text-[2.8vw] text-primary shrink-0">01</p>
            <p className="font-body text-[2.5vw] leading-snug text-text/90">
              AP placement with Greedy Minimum Dominating Set
            </p>
          </div>
          <div className="flex items-start gap-[1.4vw] rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <p className="font-display font-bold text-[2.8vw] text-secondary shrink-0">02</p>
            <p className="font-body text-[2.5vw] leading-snug text-text/90">
              RSSI from a log-distance path-loss model
            </p>
          </div>
          <div className="flex items-start gap-[1.4vw] rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <p className="font-display font-bold text-[2.8vw] text-accent shrink-0">03</p>
            <p className="font-body text-[2.5vw] leading-snug text-text/90">
              K-Means clustering for density estimation
            </p>
          </div>
          <div className="flex items-start gap-[1.4vw] rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <p className="font-display font-bold text-[2.8vw] text-warning shrink-0">04</p>
            <p className="font-body text-[2.5vw] leading-snug text-text/90">
              Density classes trigger load balancing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
