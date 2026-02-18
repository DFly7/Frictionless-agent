import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 shadow-sm" />
            <span className="text-slate-900 font-semibold">SmoothStudy</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-ghost text-slate-700 px-3 py-2">Log in</Link>
            <Link href="/login" className="btn btn-primary px-4 py-2">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 surface" />
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1.5 ring-1 ring-blue-200">New • Smarter study flows</p>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-slate-900">
              Powerful tools to level up your study workflow
            </h1>
            <p className="mt-4 text-slate-600 text-base md:text-lg max-w-xl">
              Summarize notes, generate practice questions, and track progress — all in one beautifully simple app.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="btn btn-primary px-5 py-3 text-base">Start free</Link>
              <a href="#features" className="btn btn-ghost px-5 py-3 text-base">See features</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">No credit card required</p>
          </div>
          <div className="relative">
            <div className="card p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">Smart summaries</p>
                  <p className="text-xs text-slate-600 mt-1">Turn lectures into crisp study guides.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">Practice questions</p>
                  <p className="text-xs text-slate-600 mt-1">Quiz yourself on any topic.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">Progress tracking</p>
                  <p className="text-xs text-slate-600 mt-1">Stay accountable with goals.</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">Collaboration</p>
                  <p className="text-xs text-slate-600 mt-1">Share and study together.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-slate-900">Everything you need to learn faster</h2>
          <p className="mt-3 text-slate-600">Polished, purposeful features that feel effortless.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Smart summaries", desc: "Summarize lectures and notes in seconds." },
            { title: "Practice questions", desc: "Generate custom quizzes on any topic." },
            { title: "Progress tracking", desc: "Simple metrics that keep you motivated." },
          ].map((f) => (
            <div key={f.title} className="card p-6 transition hover:elevated">
              <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-700 grid place-items-center font-semibold">✓</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="card p-8 md:p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-semibold text-slate-900">Ready to study smarter?</h3>
          <p className="mt-2 text-slate-600">Join students who save hours every week.</p>
          <div className="mt-6">
            <Link href="/login" className="btn btn-primary px-6 py-3 text-base">Create your account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
