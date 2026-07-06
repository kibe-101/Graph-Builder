export default function Title() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="absolute -top-[16vh] -right-[8vw] w-[46vw] h-[46vw] rounded-full bg-primary/10 blur-[6vw]" />

      <svg className="absolute right-[5vw] top-[8vh] w-[38vw] h-[38vw]" viewBox="0 0 400 400" fill="none">
        <line x1="90" y1="90" x2="200" y2="200" stroke="#3B82F6" strokeOpacity="0.5" strokeWidth="1.5" />
        <line x1="310" y1="110" x2="200" y2="200" stroke="#38BDF8" strokeOpacity="0.5" strokeWidth="1.5" />
        <line x1="90" y1="310" x2="200" y2="200" stroke="#8B5CF6" strokeOpacity="0.5" strokeWidth="1.5" />
        <line x1="320" y1="300" x2="200" y2="200" stroke="#22C55E" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="10" fill="#3B82F6" />
        <circle cx="90" cy="90" r="6" fill="#38BDF8" />
        <circle cx="310" cy="110" r="6" fill="#38BDF8" />
        <circle cx="90" cy="310" r="6" fill="#8B5CF6" />
        <circle cx="320" cy="300" r="6" fill="#22C55E" />
        <circle cx="200" cy="200" r="60" stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="120" stroke="#38BDF8" strokeOpacity="0.2" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 h-full flex flex-col justify-center pl-[8vw] pr-[36vw]">
        <p className="font-body text-[2vw] tracking-[0.3em] uppercase text-secondary font-medium mb-[3vh]">
          Proposal Presentation
        </p>
        <h1 className="font-display font-bold text-[6vw] leading-[1.02] text-text text-wrap-balance">
          Graph-Theoretic WLAN Planning
        </h1>
        <p className="font-body text-[2.8vw] text-muted mt-[4vh] max-w-[38vw] leading-relaxed">
          Crowd Density Estimation and Network Load Balancing
        </p>
      </div>
    </div>
  );
}
