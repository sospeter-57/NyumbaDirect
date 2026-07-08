import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import type { HouseType, ListingFormData } from '../types'

const HOUSE_TYPES: HouseType[] = [
  'Single',
  'Bedsitter',
  '1-Bed',
  '2-Bed',
  '3-Bed',
  'Mansion',
]

export default function NewListingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const [form, setForm] = useState<ListingFormData>({
    house_type: '1-Bed',
    rent: 0,
    deposit: 0,
    latitude: -1.286389,
    longitude: 36.817223,
    title: '',
    description: '',
    location_desc: '',
    has_borehole: false,
    is_tokens_meter: false,
    has_hot_shower: false,
    has_wifi: false,
    gate_curfew_enabled: false,
    water_rationing_active: false,
    pets_allowed: false,
    agreement_doc: '',
    repair_rates: [],
  })

  const [repairItem, setRepairItem] = useState({ item_name: '', cost: 0 })

  const update = <K extends keyof ListingFormData>(
    key: K,
    value: ListingFormData[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const addRepairRate = () => {
    if (!repairItem.item_name || repairItem.cost <= 0) return
    update('repair_rates', [...form.repair_rates, { ...repairItem }])
    setRepairItem({ item_name: '', cost: 0 })
  }

  const removeRepairRate = (idx: number) => {
    update(
      'repair_rates',
      form.repair_rates.filter((_, i) => i !== idx)
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const prop = await api.properties.create(form)
      if (mediaFiles.length > 0) {
        setUploadingMedia(true)
        await api.upload.propertyMedia(prop.id, mediaFiles)
      }
      navigate(`/properties/${prop.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing')
    } finally {
      setSubmitting(false)
      setUploadingMedia(false)
    }
  }

  return (
    <div className="px-12 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-black mb-1">Post a New Listing</h1>
      <p className="text-slate-500 text-sm mb-6">List your property and find the perfect tenant</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-green-700 text-white'
                  : step > s
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s}
            </div>
            <span
              className={`text-xs ${step === s ? 'text-black font-medium' : 'text-slate-500'}`}
            >
              {s === 1 ? 'Details' : s === 2 ? 'Amenities' : s === 3 ? 'Repair Rates' : 'Photos'}
            </span>
            {s < 4 && <span className="text-slate-300">|</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              House Type
            </label>
            <select
              value={form.house_type}
              onChange={(e) => update('house_type', e.target.value as HouseType)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            >
              {HOUSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Monthly Rent (KES)
              </label>
              <input
                type="number"
                value={form.rent || ''}
                onChange={(e) => update('rent', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Deposit (KES)
              </label>
              <input
                type="number"
                value={form.deposit || ''}
                onChange={(e) => update('deposit', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
              placeholder="e.g., Modern 1-Bedroom in Kilimani"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm h-24"
              placeholder="Describe the property..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Location Description
            </label>
            <input
              type="text"
              value={form.location_desc}
              onChange={(e) => update('location_desc', e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
              placeholder="e.g., Kilimani, near Junction Mall"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => update('latitude', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => update('longitude', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl text-sm font-medium"
            >
              Next: Amenities
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">Infrastructure & Amenities</h2>

          <div className="space-y-3">
            {([
              ['has_borehole', 'Borehole / Well Water'],
              ['is_tokens_meter', 'Token / Prepaid Meter'],
              ['has_hot_shower', 'Hot Shower'],
              ['has_wifi', 'WiFi Available'],
              ['gate_curfew_enabled', 'Gate Curfew Enforced'],
              ['water_rationing_active', 'Water Rationing Active'],
              ['pets_allowed', 'Pets Allowed'],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form[key as keyof ListingFormData] as boolean}
                  onChange={(e) =>
                    update(
                      key as keyof ListingFormData,
                      e.target.checked
                    )
                  }
                  className="accent-green-700 w-5 h-5"
                />
                <span className="text-sm text-black">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl text-sm font-medium"
            >
              Next: Repair Rates
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">
            Standard Repair Deductions
          </h2>
          <p className="text-xs text-slate-500">
            Pre-set repair costs that will be used to calculate deposit refunds
            during move-out.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={repairItem.item_name}
              onChange={(e) =>
                setRepairItem((prev) => ({ ...prev, item_name: e.target.value }))
              }
              placeholder="Item name (e.g., Paint smudge)"
              className="border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={repairItem.cost || ''}
                onChange={(e) =>
                  setRepairItem((prev) => ({
                    ...prev,
                    cost: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Cost (KES)"
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm"
              />
              <button
                onClick={addRepairRate}
                className="bg-black text-white px-4 py-3 rounded-xl text-sm hover:bg-gray-800 font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {form.repair_rates.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Cost (KES)</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {form.repair_rates.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-black">{r.item_name}</td>
                    <td className="py-2 text-right text-black">
                      {r.cost.toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => removeRepairRate(i)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl text-sm font-medium"
            >
              Next: Photos
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">Photos & Videos</h2>
          <p className="text-xs text-slate-500">Upload images and videos to showcase your property.</p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-green-800 mb-1">Tenancy Agreement Document</label>
            <p className="text-xs text-green-600 mb-3">Upload your standard tenancy agreement (PDF, DOCX) that tenants will sign upon moving in.</p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const formData = new FormData()
                  formData.append('media', file)
                  update('agreement_doc', file.name)
                }
              }}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
            />
            {form.agreement_doc && <p className="text-xs text-green-700 mt-1">Selected: {form.agreement_doc}</p>}
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              setMediaFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
            }}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById('media-upload')?.click()}
          >
            <input
              id="media-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setMediaFiles((prev) => [...prev, ...Array.from(e.target.files!)])
              }}
            />
            <div className="text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs mt-1">Supports images (jpg, png) and videos (mp4, mov)</p>
            </div>
          </div>

          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {mediaFiles.map((f, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  {f.type.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  ) : (
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {Math.round(f.size / 1024)}KB
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(3)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {uploadingMedia ? 'Uploading...' : submitting ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
