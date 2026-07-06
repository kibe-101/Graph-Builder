export default function EvaluationPlan() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-[8vh] left-[6vw] w-[3vw] h-[3vw] rounded-full bg-accent" />

      <div className="relative h-full flex flex-col justify-center pl-[8vw] pr-[8vw]">
        <p className="font-body text-[2vw] tracking-[0.25em] uppercase text-accent font-medium mb-[2.5vh]">
          Evaluation
        </p>
        <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] text-primary text-wrap-balance mb-[5.5vh] max-w-[52vw]">
          Evaluation Plan
        </h2>

        <p className="font-body text-[2.8vw] text-primary mb-[4.5vh] max-w-[70vw] leading-snug">
          <span className="font-medium">Design Thinking</span> methodology: Empathise, Define, Ideate, Prototype, Test.
        </p>

        <div className="grid grid-cols-3 gap-[2.4vw] max-w-[80vw]">
          <div className="border-t-[0.3vw] border-teal pt-[2.2vh]">
            <p className="font-body text-[2.5vw] leading-snug text-muted">
              Functional testing against defined requirements per objective
            </p>
          </div>
          <div className="border-t-[0.3vw] border-teal pt-[2.2vh]">
            <p className="font-body text-[2.5vw] leading-snug text-muted">
              Performance checks on placement quality, density accuracy, and load distribution
            </p>
          </div>
          <div className="border-t-[0.3vw] border-teal pt-[2.2vh]">
            <p className="font-body text-[2.5vw] leading-snug text-muted">
              Usability testing of the interactive visualisation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
