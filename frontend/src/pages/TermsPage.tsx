import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="px-12 py-8 max-w-3xl mx-auto">
      <Link to="/explore" className="text-sm text-green-700 hover:text-green-800 mb-6 inline-block bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors">&larr; Back</Link>
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-black mb-6 text-center">Terms of Service</h1>

      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <p><strong className="text-black">Last updated:</strong> July 2026</p>

        <h2 className="text-lg font-semibold text-black mt-6">1. Acceptance of Terms</h2>
        <p className="pl-4">By creating an account and using NyumbaDirect, you agree to these terms of service. If you do not agree, please do not use the platform.</p>

        <h2 className="text-lg font-semibold text-black mt-6">2. User Responsibilities</h2>
        <p className="pl-4">You agree to provide accurate information, maintain the confidentiality of your account, and use the platform in compliance with all applicable laws. Fraudulent listings or misuse of contact information is strictly prohibited.</p>

        <h2 className="text-lg font-semibold text-black mt-6">3. Tenant Terms</h2>
        <p className="pl-4">Tenants may browse properties and unlock landlord contact information for a fee of KES 99 per unlock. Unlocks are non-refundable once the contact information has been revealed.</p>

        <h2 className="text-lg font-semibold text-black mt-6">4. Landlord Terms</h2>
        <p className="pl-4">Landlords may list properties for a activation fee of KES 299 per listing. Listings must be accurate and not misleading. NyumbaDirect reserves the right to remove listings that violate our policies.</p>

        <h2 className="text-lg font-semibold text-black mt-6">5. Payments</h2>
        <p className="pl-4">All payments are processed through Safaricom M-Pesa. Fees are non-refundable except where required by law. Subscription periods are defined at the time of purchase.</p>

        <h2 className="text-lg font-semibold text-black mt-6">6. Limitation of Liability</h2>
        <p className="pl-4">NyumbaDirect acts as a platform connecting tenants and landlords. We are not responsible for the accuracy of listings, the condition of properties, or disputes between users.</p>

        <h2 className="text-lg font-semibold text-black mt-6">7. Changes to Terms</h2>
        <p className="pl-4">We reserve the right to modify these terms at any time. Users will be notified of significant changes via email or platform notification.</p>

        <h2 className="text-lg font-semibold text-black mt-6">8. Contact</h2>
        <p className="pl-4">For questions about these terms, contact <a href="mailto:sospeterkinyanjui57@gmail.com" className="text-green-700 hover:text-green-800">sospeterkinyanjui57@gmail.com</a>.</p>
      </div>
    </div>
    </div>
  )
}
