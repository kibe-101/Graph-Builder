export default function EvaluationPlan() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-topology">
      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-secondary font-medium mb-[2.5vh]">
          Evaluation
        </p>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] text-text text-wrap-balance mb-[5.5vh] max-w-[56vw]">
          Evaluation Plan
        </h2>

        <p className="font-body text-[2.7vw] text-text/90 mb-[4.5vh] max-w-[72vw] leading-snug">
          <span className="font-medium text-secondary">Design Thinking</span> methodology: Empathise, Define, Ideate, Prototype, Test.
        </p>

        <div className="grid grid-cols-3 gap-[2vw] max-w-[82vw]">
          <div className="rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <div className="w-[0.4vw] h-[2.2vw] bg-primary mb-[1.4vh]" />
            <p className="font-body text-[2.3vw] leading-snug text-muted">
              Functional testing against defined requirements per objective
            </p>
          </div>
          <div className="rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <div className="w-[0.4vw] h-[2.2vw] bg-secondary mb-[1.4vh]" />
            <p className="font-body text-[2.3vw] leading-snug text-muted">
              Performance checks on placement quality, density accuracy, and load distribution
            </p>
          </div>
          <div className="rounded-[0.7vw] bg-card border border-white/5 p-[1.8vw]">
            <div className="w-[0.4vw] h-[2.2vw] bg-accent mb-[1.4vh]" />
            <p className="font-body text-[2.3vw] leading-snug text-muted">
              Usability testing of the interactive visualisation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
