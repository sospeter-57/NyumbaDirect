import { Link } from 'react-router-dom'

const faqs = [
  {
    q: 'How do I create an account?',
    a: 'Click "Sign Up" in the top navigation, choose your role (Tenant or Landlord), enter your phone number and a password. You\'ll be logged in immediately after registration.',
  },
  {
    q: 'How do I find a property to rent?',
    a: 'Browse available properties on the Explore page. You can view details, check the market fairness analysis, and see standard repair rates for each listing.',
  },
  {
    q: 'How do I contact a landlord?',
    a: 'Click "Unlock Contact" on a property page. If you have an active unlock subscription, the landlord\'s phone number and a WhatsApp link will be revealed instantly.',
  },
  {
    q: 'How does the unlock payment work?',
    a: 'Select "Pay with M-Pesa" to purchase an unlock subscription (KES 99). Once payment is confirmed, you can unlock the landlord\'s contact information.',
  },
  {
    q: 'How do I list my property as a landlord?',
    a: 'After signing up as a landlord, go to "Post Listing" in the navigation. Fill in the property details, amenities, and repair rates. The listing will appear on the Explore page after activation.',
  },
  {
    q: 'How do I activate my listing?',
    a: 'New listings start in "Pending Pay" status. Go to your Dashboard and click "Pay KES 299 to Activate" to make your property visible to tenants.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We currently accept payments via M-Pesa (Safaricom). All transactions are processed securely through the Daraja API.',
  },
  {
    q: 'How do I update my profile picture?',
    a: 'Go to your Profile page and hover over the avatar circle. Click "Change" to upload a new picture from your device.',
  },
  {
    q: 'Is my personal information safe?',
    a: 'Yes. Passwords are hashed using bcrypt, all API requests are authenticated with JWT tokens, and your contact information is only shared when you explicitly unlock it.',
  },
  {
    q: 'How do I submit a review for a property?',
    a: 'After unlocking a property\'s contact, you can submit a review including whether the listing is fraudulent, occupied, or has extra fees.',
  },
]

export default function FAQPage() {
  return (
    <div className="px-12 py-8 max-w-3xl mx-auto">
      <Link to="/explore" className="text-sm text-green-700 hover:text-green-800 mb-6 inline-block bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors">&larr; Back</Link>
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-black mb-8 text-center">Frequently Asked Questions</h1>

      <div className="space-y-5">
        {faqs.map((faq, i) => (
          <details key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden group">
            <summary className="text-base font-semibold text-green-700 cursor-pointer list-none flex items-center justify-between px-6 py-5 hover:bg-green-50 transition-colors">
              {faq.q}
              <span className="text-black text-2xl font-light transition-transform group-open:rotate-45 shrink-0 ml-4">+</span>
            </summary>
            <div className="px-6 pb-6">
              <div className="bg-green-50 rounded-xl p-5">
                <p className="text-sm text-slate-700 leading-relaxed" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {faq.a}
                </p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
    </div>
  )
}
