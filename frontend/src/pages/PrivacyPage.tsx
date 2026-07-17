import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="px-12 py-8 max-w-3xl mx-auto">
      <Link to="/explore" className="text-sm text-green-700 dark:text-green-400 hover:text-green-800 mb-6 inline-block bg-white/80 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-xl transition-colors">&larr; Back</Link>
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-black dark:text-white mb-6 text-center">Privacy Policy</h1>

      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p><strong className="text-black dark:text-white">Last updated:</strong> July 2026</p>

        <h2 className="text-lg font-semibold text-black dark:text-white mt-6">1. Information We Collect</h2>
        <p className="pl-4">When you create an account on NyumbaDirect, we collect your phone number, name, and any profile information you provide. Landlords may also provide business details and property information.</p>

        <h2 className="text-lg font-semibold text-black dark:text-white mt-6">2. How We Use Your Information</h2>
        <p className="pl-4">We use your information to facilitate connections between tenants and landlords, process payments through M-Pesa, improve our platform, and send service-related communications.</p>

        <h2 className="text-lg font-semibold text-black dark:text-white mt-6">3. Data Sharing</h2>
        <p className="pl-4">We share contact information between tenants and landlords only after a successful unlock payment. We do not sell your personal data to third parties. Payment processing is handled securely through Safaricom's M-Pesa API.</p>

        <h2 className="text-lg font-semibold text-black dark:text-white mt-6">4. Data Security</h2>
        <p className="pl-4">We implement industry-standard security measures including encrypted passwords (bcrypt), JWT authentication, and secure API endpoints to protect your personal information.</p>

        <h2 className="text-lg font-semibold text-black dark:text-white mt-6">5. Your Rights</h2>
        <p className="pl-4">You have the right to access, correct, or delete your personal data at any time. Contact us at sospeterkinyanjui57@gmail.com to exercise these rights.</p>

        <h2 className="text-lg font-semibold text-black dark:text-white mt-6">6. Contact</h2>
        <p className="pl-4">For privacy-related inquiries, reach out to <a href="mailto:sospeterkinyanjui57@gmail.com" className="text-green-700 dark:text-green-400 hover:text-green-800">sospeterkinyanjui57@gmail.com</a>.</p>
      </div>
    </div>
    </div>
  )
}
