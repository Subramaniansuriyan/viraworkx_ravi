import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: April 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using the ViraWorkx platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Platform Use</h2>
            <p>ViraWorkx provides a recruiting platform connecting US-based employers with technical talent. Candidates may create profiles and apply for positions. Employers may post jobs, review applications, and conduct hiring workflows. All use must comply with applicable laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. User Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree not to misrepresent your identity, qualifications, or any information submitted on the platform. Fraudulent or misleading submissions will result in immediate account termination.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Intellectual Property</h2>
            <p>Content you submit (resumes, job descriptions, feedback) remains your property. By submitting content, you grant ViraWorkx a limited license to use it to operate the platform and facilitate matches. ViraWorkx's proprietary software, branding, and platform design are owned by ViraWorkx and may not be copied or reproduced.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Limitation of Liability</h2>
            <p>ViraWorkx facilitates connections between employers and candidates but does not guarantee hiring outcomes. To the maximum extent permitted by law, ViraWorkx is not liable for any indirect, incidental, or consequential damages arising from platform use.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Termination</h2>
            <p>ViraWorkx reserves the right to suspend or terminate accounts that violate these Terms. You may cancel your account at any time by contacting <a href="mailto:support@viraworkx.ai" className="text-indigo-600 hover:underline">support@viraworkx.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Contact</h2>
            <p>Questions about these Terms? Email <a href="mailto:legal@viraworkx.ai" className="text-indigo-600 hover:underline">legal@viraworkx.ai</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
