export default function ThankYou() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary dot-grid flex items-center justify-center">
      <div className="absolute -top-[14vh] -left-[10vw] w-[38vw] h-[38vw] rounded-full bg-accent/20 blur-[6vw]" />
      <div className="absolute -bottom-[16vh] -right-[8vw] w-[36vw] h-[36vw] rounded-full bg-teal/20 blur-[6vw]" />

      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] opacity-40" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="120" stroke="#FF6B47" strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="200" cy="200" r="170" stroke="#00B8B0" strokeOpacity="0.4" strokeWidth="2" />
      </svg>

      <div className="relative z-10 text-center">
        <h2 className="font-display font-bold text-[6vw] leading-[1.02] text-bg mb-[3vh]">
          Thank You
        </h2>
        <p className="font-body text-[3vw] text-teal tracking-[0.15em] uppercase">
          Questions and Discussion
        </p>
      </div>
    </div>
  );
}
