import { Link } from 'react-router-dom'
import { CheckCircle, Users, Award, Clock, Briefcase, Globe, ArrowRight, Zap, Shield, Target } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-heading tracking-tight text-primary">ViraWorkX</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors cursor-pointer">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors cursor-pointer">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors cursor-pointer">For Candidates</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors hidden sm:inline-block">
              Sign In
            </Link>
            <Link to="/register" className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary/25">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8 animate-slide-left">
              <span className="inline-flex px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                AI-Powered Recruiting Platform
              </span>

              <h1 className="text-5xl md:text-6xl font-bold font-heading leading-[1.1] tracking-tight text-gray-900">
                Connecting Top{' '}
                <span className="text-primary">Indian Engineers</span>
                {' '}with US Startups
              </h1>

              <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
                Pre-vetted candidates, technical assessments, and seamless onboarding.
                <span className="block mt-2 font-medium text-gray-700">
                  Hire exceptional talent in days, not months.
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 h-12 px-8 text-base font-medium bg-primary text-white rounded-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary-700 transition-all">
                  Start Hiring <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/register?type=candidate" className="inline-flex items-center justify-center h-12 px-8 text-base font-medium bg-white/50 backdrop-blur-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-white hover:border-gray-300 transition-all">
                  Join as Candidate
                </Link>
              </div>

              <div className="pt-8 flex items-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>iMocha Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Assessment Certified</span>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image with Floating Cards */}
            <div className="relative animate-slide-right">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 glass-card">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80"
                  alt="Team collaboration"
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Floating Card - Bottom Left */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-fade-zoom delay-500 animate-float">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Screening Score</p>
                    <p className="text-lg font-bold text-gray-900">94%</p>
                  </div>
                </div>
              </div>

              {/* Floating Card - Top Right */}
              <div className="absolute top-12 -right-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-fade-zoom delay-700 animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Talent Pool</p>
                    <p className="text-lg font-bold text-gray-900">12K+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-10 border-y border-gray-200/40 bg-gray-50/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
            Trusted by innovative companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {['InnovateX', 'TechFlow', 'CloudScale', 'DataStream', 'NextGen'].map((company) => (
              <span key={company} className="text-xl font-bold font-heading text-gray-400">{company}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold font-heading mb-4 text-gray-900">Why Choose ViraWorkX?</h2>
            <p className="text-gray-500 text-lg">
              Our AI-powered platform streamlines the entire hiring process from sourcing to onboarding.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-2 text-gray-900">Skill Assessments</h3>
              <p className="text-gray-500">
                iMocha-powered technical assessments verify candidate skills with industry-standard tests and proctoring.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-primary mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-2 text-gray-900">AI Screening</h3>
              <p className="text-gray-500">
                Our AI agents automatically screen, rank, and shortlist candidates based on your job requirements.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600 mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-2 text-gray-900">Fast Onboarding</h3>
              <p className="text-gray-500">
                Streamlined onboarding process with automated scheduling, document collection, and compliance checks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-gray-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold font-heading mb-4 text-gray-900">How It Works</h2>
            <p className="text-gray-500 text-lg">
              Get started in minutes and find your perfect match
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Post a Job', desc: 'Create detailed job listings with skill requirements', icon: Briefcase },
              { step: '02', title: 'AI Matching', desc: 'Our AI finds and ranks the best candidates', icon: Target },
              { step: '03', title: 'Assess Skills', desc: 'Candidates complete verified assessments', icon: Award },
              { step: '04', title: 'Hire & Onboard', desc: 'Make offers and onboard seamlessly', icon: Users },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="relative mb-6">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold font-heading mb-2 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: '12,000+', label: 'Verified Engineers' },
              { value: '500+', label: 'Companies Hiring' },
              { value: '94%', label: 'Placement Rate' },
              { value: '18 Days', label: 'Avg. Time to Hire' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-bold font-heading text-white mb-2">{stat.value}</p>
                <p className="text-blue-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6 text-gray-900">
            Ready to Build Your Dream Team?
          </h2>
          <p className="text-xl text-gray-500 mb-8">
            Join hundreds of startups already hiring top Indian talent through ViraWorkX.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 h-14 px-10 text-lg font-medium bg-primary text-white rounded-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary-700 transition-all">
              Start Hiring Today <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register?type=candidate" className="inline-flex items-center justify-center h-14 px-10 text-lg font-medium border-2 border-gray-200 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-all">
              I'm a Candidate
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-heading text-white">ViraWorkX</span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>

            <p className="text-sm">
              © 2026 ViraWorkX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
