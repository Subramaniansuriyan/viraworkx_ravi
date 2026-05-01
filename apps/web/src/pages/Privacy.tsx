import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: April 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>ViraWorkx collects information you provide directly, including name, email address, resume, work history, and skills when you register as a candidate or employer. We also collect usage data such as pages visited and actions taken within the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p>We use collected information to match candidates with job opportunities, facilitate hiring workflows, send platform notifications, and improve our services. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Data Sharing</h2>
            <p>Candidate profiles are shared with client companies only as part of an active hiring process. Assessment results are shared with the employer who initiated the assessment. We use trusted third-party services (email delivery, cloud infrastructure) under strict data processing agreements.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at <a href="mailto:privacy@viraworkx.ai" className="text-indigo-600 hover:underline">privacy@viraworkx.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Security</h2>
            <p>We implement industry-standard security measures including encrypted data transmission (TLS), hashed passwords, and access controls. No method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, contact us at <a href="mailto:privacy@viraworkx.ai" className="text-indigo-600 hover:underline">privacy@viraworkx.ai</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
