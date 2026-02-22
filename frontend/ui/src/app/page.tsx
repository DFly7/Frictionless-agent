"use client";

import Link from "next/link";
import { MessageSquare, FileText, Zap, Shield, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background grain">
      {/* Top nav */}
      <header
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60"
        style={{ animationDelay: "0ms" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-normal text-foreground">
              Frictionless Tutor
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="btn btn-primary px-5 py-2.5 text-sm"
            >
              Get Your Tutor
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/20 -z-10" />
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <p
              className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 ring-1 ring-primary/20 animate-fade-up"
              style={{ animationDelay: "0ms" }}
            >
              One tutor per student. It never forgets.
            </p>
            <h1
              className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground leading-[1.1] animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              Your AI tutor that actually remembers you.
            </h1>
            <p
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              One dedicated tutor per student. It knows your weak spots, your
              pace, and what you studied last week—because it never forgets.
            </p>
            <p
              className="mt-2 text-sm text-muted-foreground animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              For students who want a personalized AI tutor that remembers,
              plans, and nudges—across web, mobile, and messaging.
            </p>
            <div
              className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/login"
                className="btn btn-primary px-6 py-3.5 text-base"
              >
                Start Free
              </Link>
              <a
                href="#how"
                className="btn btn-ghost px-6 py-3.5 text-base border border-border"
              >
                See how it works
              </a>
            </div>
            <p
              className="mt-4 text-xs text-muted-foreground animate-fade-up"
              style={{ animationDelay: "280ms" }}
            >
              No credit card required
            </p>
          </div>

          {/* Hero visual — asymmetric feature cards */}
          <div
            className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl animate-fade-up opacity-0"
            style={{
              animation: "fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) 320ms forwards",
            }}
          >
            <div className="card p-6 border border-border/60 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Reads your PDFs and notes
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload your lecture slides—your tutor answers from{" "}
                    <em>your</em> materials
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-border/60 hover:shadow-lg transition-shadow md:translate-y-8">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Quizzes in your DMs
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your tutor knows exactly when you&apos;re about to forget a
                    concept and drops a quiz in your WhatsApp right then
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <h2 className="font-display text-2xl md:text-4xl font-normal text-foreground leading-tight">
                Generic AI tutors forget.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                They don&apos;t know your syllabus, your deadlines, or what you
                struggled with last week.
              </p>
            </div>
            <div className="card p-8 border-l-4 border-l-primary">
              <h3 className="font-display text-xl md:text-2xl font-normal text-foreground">
                Frictionless Tutor gives you one persistent AI.
              </h3>
              <p className="mt-3 text-muted-foreground">
                It reads your materials, tracks your progress, and reaches out
                when you need a nudge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-2xl md:text-4xl font-normal text-foreground">
              How it works
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three steps to a tutor that actually knows you.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload",
                desc: "Add your notes, PDFs, and syllabi. Your tutor learns your curriculum.",
                icon: FileText,
              },
              {
                step: "02",
                title: "Chat",
                desc: "Ask questions, get explanations, practice with quizzes. It remembers every conversation.",
                icon: MessageSquare,
              },
              {
                step: "03",
                title: "Stay on track",
                desc: "Get scheduled quizzes on WhatsApp, reminders, and a learning plan that adapts to you.",
                icon: Zap,
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative group"
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div className="card p-8 h-full border border-border/60 hover:border-primary/30 transition-colors">
                  <span className="text-4xl font-display font-normal text-primary/30">
                    {item.step}
                  </span>
                  <div className="mt-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-2xl md:text-4xl font-normal text-foreground">
              A second brain for your degree
            </h2>
            <p className="mt-3 text-muted-foreground">
              Features that feel like they were built for you—because they were.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Persistent Memory",
                feature: "Long-term memory per student",
                benefit:
                  "It knows you struggled with derivatives last week—and will review them first",
                icon: MessageSquare,
              },
              {
                title: "Proactive Quizzes",
                feature: "Scheduled quizzes via WhatsApp",
                benefit:
                  "Your tutor knows exactly when you're about to forget a concept and drops a quiz in your DMs right then. Science-backed retention, zero effort.",
                icon: Zap,
              },
              {
                title: "Knowledge Engine",
                feature: "Reads your PDFs and notes",
                benefit:
                  "Upload your lecture slides—your tutor answers from your materials",
                icon: FileText,
              },
              {
                title: "Multi-Platform",
                feature: "Web, iOS, WhatsApp",
                benefit:
                  "Start on your laptop, continue on your phone, get nudges in your DMs",
                icon: Smartphone,
              },
            ].map((f) => (
              <div
                key={f.title}
                className="card p-6 border border-border/60 hover:shadow-lg hover:border-primary/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-1 text-sm text-primary font-medium">
                      {f.feature}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {f.benefit}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Science-backed */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="card p-10 md:p-14 border border-primary/20 bg-primary/5">
            <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="font-display text-2xl md:text-3xl font-normal text-foreground">
              Spaced repetition, built in.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              No flashcards to manage—your tutor handles the timing. Science-backed
              retention, zero effort.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 bg-muted/30">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-2xl md:text-4xl font-normal text-foreground text-center">
            Questions we hear a lot
          </h2>
          <div className="mt-12 space-y-6">
            {[
              {
                q: "Is my data private?",
                a: "Your learning data lives in your own space. We don't train models on your content.",
              },
              {
                q: "How is this different from ChatGPT?",
                a: "ChatGPT doesn't remember you. It doesn't read your notes. It doesn't send you quizzes. Your tutor does all three.",
              },
              {
                q: "What if I'm inactive?",
                a: "Your tutor stays dormant until you return. No cost while you're away.",
              },
              {
                q: "Is this just a cheating tool?",
                a: "No. Your tutor is designed to help you understand the 'Why.' It's a coach, not a shortcut. It helps you prepare so you don't need to cheat.",
              },
              {
                q: "Why isn't it free like basic ChatGPT?",
                a: "Because you aren't sharing a brain with millions of others. You have a dedicated, private server instance that lives only for your progress.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="card p-6 border border-border/60"
              >
                <h3 className="font-semibold text-foreground">{faq.q}</h3>
                <p className="mt-2 text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="card p-12 md:p-16 text-center border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/20">
            <h2 className="font-display text-2xl md:text-4xl font-normal text-foreground">
              Ready for a tutor that remembers?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Join students who save hours every week. Your tutor is waiting.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="btn btn-primary px-8 py-4 text-base"
              >
                Get Your Tutor
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-sm text-foreground">
              Frictionless Tutor
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your notes. Your memory. Your tutor.
          </p>
        </div>
      </footer>
    </main>
  );
}
