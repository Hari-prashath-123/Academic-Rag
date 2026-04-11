import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm tracking-wide">
          Academic RAG Portal
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
          Ask Better Questions, Get Better Academic Answers
        </h1>

        <p className="mt-6 max-w-2xl text-base text-slate-200 sm:text-lg">
          Centralize documents, assessments, and AI-powered insights for students, staff, and advisors in one modern workspace.
        </p>

        <div className="mt-10">
          <Link
            href="/auth/login"
            className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  )
}
