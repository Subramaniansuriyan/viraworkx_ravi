import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight, Menu, X, Zap, CheckCircle, XCircle, ChevronDown,
  Code2, Server, Layout, Cloud, Brain, Smartphone,
} from 'lucide-react'

// ── Hardcoded content ──────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    id: 1,
    step: 'Step 01',
    title: 'Define Your Ideal Engineer',
    description:
      'Tell us the role, tech stack, and team culture. Our intake process is designed to capture signal fast — no lengthy forms, no account setup required.',
  },
  {
    id: 2,
    step: 'Step 02',
    title: 'We Match in 24 Hours',
    description:
      'Our vetting engine surfaces the top 3–5 pre-screened engineers based on your requirements. Every candidate has passed technical assessment and communication screening.',
  },
  {
    id: 3,
    step: 'Step 03',
    title: '1-Week Paid Trial',
    description:
      "Work with the engineer for one week before committing. Not the right fit? We replace them within 48 hours at no extra cost. Zero risk, maximum velocity.",
  },
  {
    id: 4,
    step: 'Step 04',
    title: 'Deploy with Confidence',
    description:
      "Once you've found your match, we handle contracts, compliance, IP agreements, and full onboarding. Your new engineer is ready to ship on Day 1.",
  },
]

const VALUE_PROPS = [
  {
    title: '48-Hour Turnaround',
    description:
      'First engineer introductions in under 48 hours. No endless sourcing cycles, no waiting weeks for a recruiter to call back.',
    benefit: 'First match in 48 hours',
  },
  {
    title: 'Pre-Vetted Only',
    description:
      'Every engineer passes a rigorous technical assessment before joining our network. You only meet candidates who are ready to perform.',
    benefit: '~3% of applicants pass vetting',
  },
  {
    title: 'Zero Risk Trial',
    description:
      "Start with a 1-week paid trial. If the engineer isn't the right fit, we replace them within 48 hours — no questions asked.",
    benefit: 'Guaranteed replacement',
  },
  {
    title: 'US Time Zone Overlap',
    description:
      'All engineers in our network maintain 4–8 hours of overlap with US working hours. Real-time collaboration, not async-only.',
    benefit: '4–8 hrs daily overlap',
  },
  {
    title: 'Full Compliance Handled',
    description:
      'Employment contracts, IP agreements, background checks, and compliance — all handled by our team so you can focus on building.',
    benefit: 'Zero legal overhead',
  },
  {
    title: 'Dedicated Support',
    description:
      'A dedicated account manager monitors every engagement. Fast escalation paths and ongoing support throughout the entire placement.',
    benefit: 'Named account manager',
  },
]

const COMPARISONS = [
  { metric: 'Time to First Interview', traditional: '4–6 weeks minimum', viraworkx: 'Under 48 hours' },
  { metric: 'Candidate Quality', traditional: 'Unverified, self-reported', viraworkx: 'Technical assessment + trial' },
  { metric: 'Hiring Risk', traditional: 'High upfront cost, no guarantees', viraworkx: '1-week trial, free replacement' },
  { metric: 'Time Zone', traditional: 'Complex coordination required', viraworkx: 'US overlap guaranteed' },
  { metric: 'Compliance & Contracts', traditional: 'DIY or expensive legal fees', viraworkx: 'Fully handled by ViraWorkx' },
  { metric: 'Recruiter Fees', traditional: '15–25% of first-year salary', viraworkx: 'Transparent flat pricing' },
]

const ROLES = [
  { Icon: Code2, title: 'Full Stack Engineers', desc: 'React, Node.js, TypeScript, Python', seniority: 'Senior to Staff · 5–10 yrs' },
  { Icon: Server, title: 'Backend Engineers', desc: 'Go, Java, Python, Node.js, PostgreSQL', seniority: 'Mid to Staff · 4–10 yrs' },
  { Icon: Layout, title: 'Frontend Engineers', desc: 'React, Vue, Next.js, Tailwind CSS', seniority: 'Senior to Staff · 5–9 yrs' },
  { Icon: Cloud, title: 'DevOps / Cloud', desc: 'AWS, GCP, Kubernetes, Terraform', seniority: 'Senior to Principal · 5–12 yrs' },
  { Icon: Brain, title: 'ML / AI Engineers', desc: 'PyTorch, LangChain, LLMs, RAG', seniority: 'Senior to Staff · 4–8 yrs' },
  { Icon: Smartphone, title: 'Mobile Engineers', desc: 'React Native, Flutter, Swift, Kotlin', seniority: 'Senior to Staff · 5–9 yrs' },
]

const FAQS = [
  {
    id: 1,
    question: 'How quickly can I hire an engineer?',
    answer:
      'We deliver your first engineer introductions within 48 hours of receiving your brief. Most clients complete their trial and make a hiring decision within 2 weeks total.',
  },
  {
    id: 2,
    question: 'How does the 1-week paid trial work?',
    answer:
      "You pay a fixed weekly rate to work with the engineer on real tasks. If at any point during the first week you decide it's not the right fit, we replace the engineer within 48 hours at no additional cost.",
  },
  {
    id: 3,
    question: "What if the engineer isn't the right fit after the trial?",
    answer:
      'We offer ongoing replacement support. If an engineer leaves or the engagement is not working, we find a replacement quickly. Our goal is a long-term successful placement.',
  },
  {
    id: 4,
    question: 'How do you vet engineers before placing them?',
    answer:
      'Every engineer completes a technical assessment covering their primary skill set, a live coding evaluation, a communication and English proficiency test, and a background verification. Roughly 3% of applicants make it through.',
  },
  {
    id: 5,
    question: 'What roles and technologies do you specialize in?',
    answer:
      'We place full stack, backend, frontend, DevOps/cloud, ML/AI, and mobile engineers. Our network includes experts in React, Node.js, Python, Go, AWS, GCP, Kubernetes, PyTorch, and more.',
  },
  {
    id: 6,
    question: 'Do you handle contracts and compliance?',
    answer:
      'Yes — ViraWorkx manages employment agreements, IP assignment, NDAs, and all compliance requirements. You get a clean, legally sound engagement from day one.',
  },
]

const OPERATIONAL_STATS = [
  { value: '~3%', label: 'of applicants pass vetting' },
  { value: '<48hr', label: 'median time to first match' },
  { value: '4–8hr', label: 'daily US timezone overlap' },
  { value: '7-day', label: 'trial built into every engagement' },
]

const NAV_LINKS = [
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Why ViraWorkx', id: 'why-viraworkx' },
  { label: 'Roles', id: 'roles' },
  { label: 'For Talent', id: 'for-talent' },
  { label: 'FAQ', id: 'faq' },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, -120])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.4])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1A0F2E] overflow-x-hidden">

      {/* ── HEADER ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#FAFAF9] shadow-lg' : 'bg-[#FAFAF9]/95'
        }`}
      >
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="ViraWorkX" className="h-12 w-auto mix-blend-multiply" />
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="font-paragraph text-sm font-medium text-[#1A0F2E] hover:text-primary transition-colors"
                >
                  {label}
                </button>
              ))}
              <Link
                to="/login"
                className="font-paragraph text-sm font-medium text-[#1A0F2E] hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              {/* TODO: replace /register with your Calendly link */}
              <Link
                to="/register"
                className="font-paragraph text-sm font-semibold py-3 px-6 bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Book a 20-min Call
              </Link>
            </nav>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-[#1A0F2E] hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden mt-4 pb-4 space-y-3 overflow-hidden border-t border-[#1A0F2E]/10 pt-4"
              >
                {NAV_LINKS.map(({ label, id }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="block w-full text-left font-paragraph text-sm font-medium text-[#1A0F2E] hover:text-primary py-2"
                  >
                    {label}
                  </button>
                ))}
                <Link
                  to="/login"
                  className="block font-paragraph text-sm font-medium text-[#1A0F2E] hover:text-primary py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block text-center font-paragraph text-sm font-semibold py-3 px-6 bg-primary text-white hover:bg-primary/90 transition-colors mt-2"
                >
                  Book a 20-min Call
                </Link>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative w-full min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAF9] via-[#FAFAF9] to-primary/8" />
          <div className="absolute top-0 right-0 w-[32rem] h-[32rem] bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025] z-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, #9D4EDD 1px, transparent 1px), linear-gradient(to bottom, #9D4EDD 1px, transparent 1px)',
            backgroundSize: '4rem 4rem',
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
        >
          {/* Left: headline */}
          <div className="lg:col-span-8 flex flex-col items-start">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D1B4E] text-[#F5F3FF] rounded-full mb-8 border border-primary/30"
            >
              <span className="font-paragraph text-xs uppercase tracking-widest font-semibold">
                Now placing senior engineers · Q2 2026
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight mb-8 text-[#1A0F2E]"
            >
              HIRE PRE-VETTED
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                INDIAN ENGINEERS
              </span>
              <br />
              IN{' '}
              <span className="text-primary relative inline-block">
                48 HOURS
                <svg
                  className="absolute -bottom-2 left-0 w-full h-4 text-primary"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <path d="M0,10 Q50,20 100,10" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-paragraph text-lg md:text-xl text-[#1A0F2E]/70 max-w-2xl mb-12 leading-relaxed border-l-4 border-primary pl-6"
            >
              Pre-vetted Indian software engineers for US startups. Start with a 1-week paid trial. Not
              satisfied? We replace within 48 hours. Zero risk.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {/* TODO: replace /register with your Calendly link */}
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center px-8 py-5 font-paragraph text-base font-semibold bg-primary text-white overflow-hidden transition-all hover:scale-[1.02] shadow-lg"
              >
                <span className="absolute inset-0 w-full h-full bg-[#1A0F2E] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                  Book a 20-min Call <ArrowUpRight className="w-5 h-5" />
                </span>
              </Link>
              <Link
                to="/register?type=candidate"
                className="inline-flex items-center justify-center px-8 py-5 font-paragraph text-sm font-semibold border-2 border-[#1A0F2E]/30 text-[#1A0F2E] hover:border-primary hover:text-primary transition-colors"
              >
                Apply to Network
              </Link>
            </motion.div>
          </div>

          {/* Right: "What you get" card — flat, no tilt */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
            <div className="relative bg-[#2D1B4E] p-8 border border-primary/30 shadow-2xl">
              <div className="mb-8 pb-8 border-b border-primary/20">
                <span className="font-paragraph text-xs text-[#F5F3FF]/50 uppercase tracking-widest">
                  What you get
                </span>
              </div>
              <div className="space-y-8">
                {/* Primary stat — largest */}
                <div className="flex flex-col">
                  <span className="font-display text-5xl font-black text-primary leading-none mb-1">48 hrs</span>
                  <span className="font-paragraph text-sm text-[#F5F3FF]/60">to your first engineer match</span>
                </div>
                {/* Secondary stats — visibly smaller */}
                <div className="flex flex-col gap-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-paragraph text-sm text-[#F5F3FF]/60">Trial period</span>
                    <span className="font-display text-base font-bold text-[#F5F3FF]">1 week</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-paragraph text-sm text-[#F5F3FF]/60">Replacement</span>
                    <span className="font-display text-base font-bold text-[#F5F3FF]">Guaranteed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-paragraph text-sm text-[#F5F3FF]/60">Vetting pass rate</span>
                    <span className="font-display text-base font-bold text-[#F5F3FF]">~3%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── PROOF STRIP ── replaces scrolling marquee */}
      <div className="w-full bg-[#2D1B4E] border-y border-primary/30 py-5">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <p className="font-paragraph text-sm text-[#F5F3FF]/80">
            Currently placing engineers across US-based SaaS startups in fintech, devtools, and AI.
          </p>
          <Link
            to="/register"
            className="font-paragraph text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap underline underline-offset-4"
          >
            Request a reference →
          </Link>
        </div>
      </div>

      {/* ── COMPARISON — moved up, highest converting section ── */}
      <section className="w-full py-24 md:py-32 bg-[#FAFAF9]">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#1A0F2E] mb-4">
              THE OLD WAY VS{' '}
              <span className="text-primary">VIRAWORKX</span>
            </h2>
            <p className="font-paragraph text-lg text-[#1A0F2E]/60 max-w-xl mx-auto">
              The case for switching — built for the conversation with your co-founder or CFO.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3">
            <div className="hidden md:grid grid-cols-12 gap-3 mb-2 px-6">
              <div className="col-span-4 font-paragraph text-xs font-bold uppercase tracking-widest text-[#1A0F2E]/40">Metric</div>
              <div className="col-span-4 font-paragraph text-xs font-bold uppercase tracking-widest text-red-500 text-center">Traditional Hiring</div>
              <div className="col-span-4 font-paragraph text-xs font-bold uppercase tracking-widest text-primary text-center">ViraWorkx</div>
            </div>

            {COMPARISONS.map((row, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-3"
              >
                {/* Metric label — light bg for legibility */}
                <div className="md:col-span-4 bg-[#F5F3FF] border border-primary/20 p-5 md:p-7 flex items-center">
                  <h4 className="font-display text-base font-bold text-[#1A0F2E]">{row.metric}</h4>
                </div>
                <div className="md:col-span-4 bg-red-50 p-5 md:p-7 flex flex-col justify-center items-center text-center border border-red-100 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-red-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <XCircle className="w-5 h-5 text-red-400 mb-2 relative z-10" />
                  <p className="font-paragraph text-sm text-[#1A0F2E]/70 relative z-10">{row.traditional}</p>
                </div>
                <div className="md:col-span-4 bg-primary/5 p-5 md:p-7 flex flex-col justify-center items-center text-center border border-primary/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <CheckCircle className="w-5 h-5 text-primary mb-2 relative z-10" />
                  <p className="font-paragraph text-base font-semibold text-[#1A0F2E] relative z-10">{row.viraworkx}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── (formerly "Velocity Protocol") */}
      <section id="how-it-works" className="w-full bg-[#2D1B4E] py-24 md:py-32">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

            {/* Sticky left — collapses to tight intro on mobile */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#F5F3FF] mb-6 leading-tight">
                    HOW IT
                    <br />
                    <span className="text-primary">WORKS</span>
                  </h2>
                  <p className="font-paragraph text-base text-[#F5F3FF]/70 mb-8 max-w-md hidden md:block">
                    A straightforward process from brief to deployed engineer — faster than most agencies
                    can schedule a kickoff call.
                  </p>
                  <div className="p-5 bg-[#FAFAF9] border-l-4 border-primary hidden md:block">
                    <p className="font-display text-base font-bold text-[#1A0F2E]">
                      Not satisfied? We replace within 48 hours — no questions asked.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Scrolling steps */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {PROCESS_STEPS.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="group relative bg-[#FAFAF9] p-8 md:p-10 border border-primary/20 hover:border-primary transition-colors duration-300"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
                    <span className="font-display text-7xl font-black text-primary">{step.id}</span>
                  </div>
                  <div className="relative z-10">
                    <div className="font-paragraph text-xs text-primary font-bold uppercase tracking-widest mb-3">
                      {step.step}
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-[#1A0F2E] mb-4">
                      {step.title}
                    </h3>
                    <p className="font-paragraph text-base text-[#1A0F2E]/70 max-w-xl">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY VIRAWORKX — typography-led, no icons ── */}
      <section id="why-viraworkx" className="w-full py-24 md:py-32 bg-[#FAFAF9]">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-primary/20 pb-12"
          >
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#1A0F2E] leading-tight">
              ENGINEERED FOR
              <br />
              <span className="text-primary">FOUNDERS</span>
            </h2>
            <p className="font-paragraph text-base text-[#1A0F2E]/60 max-w-sm">
              We eliminated the friction, risk, and delays of traditional hiring to build a system that
              scales at the speed of your startup.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-primary/10 border border-primary/20">
            {VALUE_PROPS.map(({ title, description, benefit }, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="bg-[#FAFAF9] p-8 md:p-10 group hover:bg-[#2D1B4E] transition-colors duration-500 flex flex-col"
              >
                <h3 className="font-display text-xl font-bold text-[#1A0F2E] group-hover:text-[#F5F3FF] mb-3 transition-colors duration-500">
                  {title}
                </h3>
                <p className="font-paragraph text-sm text-[#1A0F2E]/60 group-hover:text-[#F5F3FF]/60 mb-8 flex-grow leading-relaxed transition-colors duration-500">
                  {description}
                </p>
                <div className="mt-auto pt-5 border-t border-primary/20 group-hover:border-[#F5F3FF]/20 transition-colors duration-500">
                  <p className="font-paragraph text-xs font-bold text-primary uppercase tracking-widest">
                    {benefit}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES WE PLACE ── (formerly "Talent Vectors") */}
      <section id="roles" className="w-full py-24 md:py-32 bg-[#2D1B4E]">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-primary/20 pb-12"
          >
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#F5F3FF] leading-tight">
              ROLES WE
              <br />
              <span className="text-primary">PLACE</span>
            </h2>
            <p className="font-paragraph text-base text-[#F5F3FF]/60 max-w-sm">
              Senior-to-staff engineers across the modern stack. All placements include a 7-day paid trial.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-primary/20 border border-primary/20">
            {ROLES.map(({ Icon, title, desc, seniority }, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className="group bg-[#2D1B4E] p-8 hover:bg-[#FAFAF9] transition-colors duration-500 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/20 group-hover:bg-primary transition-colors duration-500 shrink-0">
                    <Icon className="w-5 h-5 text-primary group-hover:text-white" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#F5F3FF] group-hover:text-[#1A0F2E] transition-colors duration-500">
                    {title}
                  </h3>
                </div>
                <p className="font-paragraph text-sm text-[#F5F3FF]/60 group-hover:text-[#1A0F2E]/60 transition-colors duration-500">
                  {desc}
                </p>
                <div className="mt-auto pt-4 border-t border-primary/20 group-hover:border-[#1A0F2E]/10 transition-colors duration-500 flex items-center justify-between">
                  <span className="font-paragraph text-xs text-[#F5F3FF]/50 group-hover:text-[#1A0F2E]/50 transition-colors duration-500">
                    {seniority}
                  </span>
                  <Link
                    to="/register"
                    className="font-paragraph text-xs font-semibold text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View rates →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR TALENT ── */}
      <section id="for-talent" className="w-full bg-[#2D1B4E] border-y border-primary/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
          <div className="p-12 md:p-24 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="font-paragraph text-xs text-primary font-bold uppercase tracking-widest mb-6">
                For Engineers
              </div>
              <h2 className="font-display text-4xl md:text-6xl font-black text-[#F5F3FF] mb-8 leading-tight">
                ACCESS GLOBAL
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50">
                  OPPORTUNITIES
                </span>
              </h2>
              <div className="space-y-5 mb-12">
                {[
                  'Get matched with top US startups',
                  'Work remotely on your terms',
                  'Accelerate your global career trajectory',
                  'Transparent process from assessment to offer',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                    <p className="font-paragraph text-base text-[#F5F3FF]/80">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/register?type=candidate"
                className="inline-flex items-center justify-center px-8 py-4 font-paragraph text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Apply to Network
              </Link>
            </motion.div>
          </div>

          {/* Operational stats — replaces vanity numbers */}
          <div className="bg-[#FAFAF9] p-12 md:p-24 flex flex-col justify-center border-l border-primary/20">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-10"
            >
              {OPERATIONAL_STATS.map((stat, i) => (
                <div key={i}>
                  <div className="font-display text-5xl md:text-6xl font-black text-primary mb-2 leading-none">
                    {stat.value}
                  </div>
                  <div className="h-px w-10 bg-primary mb-3" />
                  <p className="font-paragraph text-xs uppercase tracking-widest text-[#1A0F2E]/60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── (formerly "System Queries") */}
      <section id="faq" className="w-full py-24 md:py-32 bg-[#2D1B4E] border-t border-primary/20">
        <div className="max-w-[80rem] mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-6xl font-black text-[#F5F3FF] mb-4">
              FREQUENTLY ASKED
              <br />
              <span className="text-primary">QUESTIONS</span>
            </h2>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="border border-primary/20 bg-[#FAFAF9] overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none group"
                >
                  <span className="font-display text-lg md:text-xl font-bold text-[#1A0F2E] group-hover:text-primary transition-colors pr-8">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: activeFaq === faq.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0 text-primary"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {activeFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="p-6 md:p-8 pt-0 border-t border-primary/10">
                        <p className="font-paragraph text-base text-[#1A0F2E]/70 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full py-24 md:py-32 bg-primary">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              READY TO HIRE?
            </h2>
            <p className="font-paragraph text-lg text-white/80 max-w-xl mx-auto mb-10">
              Book a 20-minute call. We'll scope your role, confirm fit, and make your first intro within
              48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* TODO: replace /register with your Calendly link */}
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center px-10 py-5 font-paragraph text-base font-semibold bg-white text-primary overflow-hidden transition-all hover:scale-[1.02] shadow-lg"
              >
                <span className="absolute inset-0 w-full h-full bg-[#1A0F2E] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                  Book a 20-min Call <ArrowUpRight className="w-5 h-5" />
                </span>
              </Link>
              <Link
                to="/register?type=candidate"
                className="inline-flex items-center justify-center px-10 py-5 font-paragraph text-sm font-semibold border-2 border-white text-white hover:bg-white hover:text-primary transition-colors"
              >
                Apply to Network
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full py-16 bg-[#1A0F2E]">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16 pb-16 border-b border-white/10">
            <div className="max-w-xs">
              <div className="mb-6">
                <img src="/logo.png" alt="ViraWorkX" className="h-14 w-auto" />
              </div>
              <p className="font-paragraph text-sm text-white/50 leading-relaxed">
                Connecting US startups with pre-vetted Indian engineering talent. 48-hour matching,
                7-day paid trial, guaranteed replacement.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
              <div>
                <h4 className="font-display text-sm font-bold uppercase tracking-widest text-white mb-6">
                  Platform
                </h4>
                <div className="space-y-3">
                  <button onClick={() => scrollTo('how-it-works')} className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">How It Works</button>
                  <button onClick={() => scrollTo('why-viraworkx')} className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">Why ViraWorkx</button>
                  <button onClick={() => scrollTo('roles')} className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">Roles We Place</button>
                </div>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase tracking-widest text-white mb-6">
                  For Talent
                </h4>
                <div className="space-y-3">
                  <Link to="/register?type=candidate" className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">Apply to Network</Link>
                  <button onClick={() => scrollTo('faq')} className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">FAQ</button>
                </div>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase tracking-widest text-white mb-6">
                  Company
                </h4>
                <div className="space-y-3">
                  <Link to="/login" className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">Sign In</Link>
                  <Link to="/register" className="block font-paragraph text-sm text-white/50 hover:text-white transition-colors">Book a Call</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-paragraph text-sm text-white/40">© 2026 ViraWorkx. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="font-paragraph text-sm text-white/40 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="font-paragraph text-sm text-white/40 hover:text-white transition-colors">Terms</a>
              <a href="#" className="font-paragraph text-sm text-white/40 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
