import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const springs = {
  sheet: { type: 'spring' as const, stiffness: 340, damping: 36 },
}
const spectral = 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f59e0b,#10b981)'

interface Props {
  open: boolean
  onClose: () => void
  address: string
}

function generatePaymentLink(address: string, amount?: string): string {
  const base = window.location.origin
  const params = new URLSearchParams({ to: address })
  if (amount) params.set('amount', amount)
  return `${base}?${params.toString()}`
}

export function ReceiveSheet({ open, onClose, address }: Props) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')

  const payLink = generatePaymentLink(address, requestAmount || undefined)
  const shortAddr = `${address.slice(0, 8)}…${address.slice(-6)}`

  const copy = (text: string, setter: (v: boolean) => void) => {
    void navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1" style={{ background: spectral }} />
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-black/10" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
                  Receive USDC
                </h2>
                <button
                  onClick={onClose}
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-muted)' }}
                >
                  <X className="size-4" style={{ color: 'var(--muted)' }} />
                </button>
              </div>

              {/* Address pill */}
              <div
                className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                    Your address
                  </p>
                  <p className="mono mt-0.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {shortAddr}
                  </p>
                </div>
                <button
                  onClick={() => copy(address, setCopiedAddress)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {copiedAddress ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedAddress ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Payment link */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                  Request a specific amount (optional)
                </label>
                <div className="flex gap-2">
                  <div
                    className="flex flex-1 items-center gap-2 rounded-xl px-3"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--subtle)' }}>$</span>
                    <input
                      inputMode="decimal"
                      value={requestAmount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '')
                        if (v === '' || /^\d*\.?\d*$/.test(v)) setRequestAmount(v)
                      }}
                      placeholder="0.00"
                      className="display flex-1 bg-transparent py-2.5 text-sm font-semibold tabular-nums outline-none placeholder:text-slate-300"
                      style={{ color: 'var(--ink)' }}
                    />
                  </div>
                  <button
                    onClick={() => copy(payLink, setCopiedLink)}
                    className="flex items-center gap-1 rounded-xl px-4 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {copiedLink ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copiedLink ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>

              {/* Link preview */}
              <div
                className="rounded-xl px-3 py-2.5"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                  Payment link preview
                </p>
                <p className="mono mt-1 break-all text-xs" style={{ color: 'var(--subtle)' }}>
                  {payLink}
                </p>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
