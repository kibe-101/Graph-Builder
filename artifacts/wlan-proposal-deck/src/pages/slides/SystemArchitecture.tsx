export default function SystemArchitecture() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 right-0 w-[6vw] h-full bg-primary" />

      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[13vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-accent font-medium mb-[2.5vh]">
          Implementation
        </p>
        <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-primary text-wrap-balance mb-[6vh]">
          System Architecture
        </h2>

        <div className="flex flex-col gap-[2vh] max-w-[70vw]">
          <div className="flex items-center gap-[2vw] rounded-[1vw] bg-primary/5 px-[2.2vw] py-[2.4vh]">
            <div className="w-[1.3vw] h-[1.3vw] rounded-full bg-accent shrink-0" />
            <p className="font-body text-[2.8vw] leading-snug text-primary">
              <span className="font-medium">Python simulation engine</span> — graph modelling, placement, density, bandwidth logic
            </p>
          </div>
          <div className="flex items-center gap-[2vw] rounded-[1vw] bg-primary/5 px-[2.2vw] py-[2.4vh]">
            <div className="w-[1.3vw] h-[1.3vw] rounded-full bg-teal shrink-0" />
            <p className="font-body text-[2.8vw] leading-snug text-primary">
              <span className="font-medium">React and TypeScript</span> front end for interactive visualisation
            </p>
          </div>
          <div className="flex items-center gap-[2vw] rounded-[1vw] bg-primary/5 px-[2.2vw] py-[2.4vh]">
            <div className="w-[1.3vw] h-[1.3vw] rounded-full bg-primary shrink-0" />
            <p className="font-body text-[2.8vw] leading-snug text-primary">
              <span className="font-medium">Express and PostgreSQL</span> backend for persistence and API access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
