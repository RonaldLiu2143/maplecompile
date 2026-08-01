export default function CubingCalculatorPage() {
  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-8rem)] flex-col sm:-mx-4">
      <div className="border-b border-border/40 bg-surface/80 px-4 py-3">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          Cubing Calculator
        </h1>
        <p className="mt-1 text-sm opacity-75">
          Estimate cubes and mesos needed to hit your desired potential lines.
        </p>
      </div>
      <iframe
        title="Cubing Calculator"
        src="/cubingCalculator/index.html"
        className="w-full flex-1 border-0 bg-white"
        style={{ minHeight: "70vh" }}
      />
    </div>
  );
}
