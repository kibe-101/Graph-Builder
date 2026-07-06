export default function Title() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary dot-grid">
      <div className="absolute -top-[14vh] -right-[10vw] w-[42vw] h-[42vw] rounded-full bg-accent/20 blur-[6vw]" />
      <div className="absolute -bottom-[18vh] -left-[8vw] w-[36vw] h-[36vw] rounded-full bg-teal/20 blur-[6vw]" />

      <svg className="absolute right-[6vw] top-[10vh] w-[34vw] h-[34vw]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="30" fill="#FF6B47" />
        <circle cx="200" cy="200" r="90" stroke="#FF6B47" strokeOpacity="0.55" strokeWidth="3" />
        <circle cx="200" cy="200" r="150" stroke="#00B8B0" strokeOpacity="0.4" strokeWidth="3" />
        <circle cx="200" cy="200" r="195" stroke="#F7F4EC" strokeOpacity="0.18" strokeWidth="3" />
      </svg>

      <div className="relative z-10 h-full flex flex-col justify-center pl-[8vw] pr-[36vw]">
        <p className="font-body text-[2.4vw] tracking-[0.3em] uppercase text-teal font-medium mb-[3vh]">
          Proposal Presentation
        </p>
        <h1 className="font-display font-bold text-[6.2vw] leading-[1.02] text-bg text-wrap-balance">
          Graph-Theoretic WLAN Planning
        </h1>
        <p className="font-body text-[3vw] text-bg/80 mt-[4vh] max-w-[38vw] leading-relaxed">
          Crowd Density Estimation and Network Load Balancing
        </p>
      </div>
    </div>
  );
}
