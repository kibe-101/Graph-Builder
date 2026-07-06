export default function CoreAlgorithms() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary dot-grid">
      <div className="absolute -top-[10vh] -left-[8vw] w-[34vw] h-[34vw] rounded-full bg-accent/15 blur-[6vw]" />

      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-teal font-medium mb-[2.5vh]">
          Design and Analysis
        </p>
        <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-bg text-wrap-balance mb-[6vh] max-w-[50vw]">
          Core Algorithms
        </h2>

        <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[3.4vh] max-w-[78vw]">
          <div className="flex items-start gap-[1.4vw]">
            <p className="font-display font-bold text-[3vw] text-accent shrink-0">01</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/90">
              AP placement via Greedy Minimum Dominating Set over the grid graph
            </p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <p className="font-display font-bold text-[3vw] text-accent shrink-0">02</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/90">
              Signal strength modelled as RSSI via a log-distance path-loss model
            </p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <p className="font-display font-bold text-[3vw] text-teal shrink-0">03</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/90">
              User clustering with centroid-based K-Means for density estimation
            </p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <p className="font-display font-bold text-[3vw] text-teal shrink-0">04</p>
            <p className="font-body text-[2.7vw] leading-snug text-bg/90">
              Density classified as Low, Medium, or High to trigger load balancing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
