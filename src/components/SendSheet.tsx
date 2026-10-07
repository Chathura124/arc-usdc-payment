import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { erc20Abi, isAddress } from 'viem'
import { arcTestnet } from 'viem/chains'
import { Loader2, X, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { parseUnitsExact } from '@/onchain-money'

const TARGET_CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(TARGET_CHAIN_ID)!
const USDC_ADDRESS = usdcFact.address as `0x${string}`
const USDC_DECIMALS = usdcDecimalsFor(TARGET_CHAIN_ID)

const QUICK_AMOUNTS = ['0.10', '0.25', '1.00', '5.00']

const springs = {
  sheet: { type: 'spring' as const, stiffness: 340, damping: 36 },
}

const spectral = 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f59e0b,#10b981)'

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || (error as { code?: number })?.code === 4001) return 'Transaction cancelled.'
  if (msg.includes('insufficient') || msg.includes('exceeds balance')) return 'Insufficient balance.'
  if (msg.includes('reverted')) return 'Transaction failed on-chain.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error — please retry.'
  return 'Something went wrong.'
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (hash: string, to: string, amount: string) => void
}

export function SendSheet({ open, onClose, onSuccess }: Props) {
  const { address, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')

  const { data: rawBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const formattedBalance =
    rawBalance !== undefined
      ? Amount.fromRaw(rawBalance, USDC_DECIMALS).toFixed(2)
      : undefined

  const isWrongChain = chainId !== TARGET_CHAIN_ID
  const isValidAddress = isAddress(to)
  const parsedAmt = (() => {
    if (!amount || !/^\d*\.?\d+$/.test(amount)) return null
    try {
      return parseUnitsExact(amount, USDC_DECIMALS)
    } catch {
      return null
    }
  })()
  const hasEnoughBalance =
    rawBalance !== undefined && parsedAmt !== null
      ? (rawBalance) >= parsedAmt
      : true
  const canSend = isValidAddress && parsedAmt !== null && parsedAmt > 0n && hasEnoughBalance && !isPending && !isConfirming

  const txUrl = hash ? buildTxExplorerUrl(TARGET_CHAIN_ID, hash) : null

  const handleClose = () => {
    if (!isPending && !isConfirming) {
      setTo('')
      setAmount('')
      reset()
      onClose()
    }
  }

  const handleSend = () => {
    if (isWrongChain) {
      switchChain({ chainId: TARGET_CHAIN_ID })
      return
    }
    if (!parsedAmt || !isValidAddress) return
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, parsedAmt],
      chainId: TARGET_CHAIN_ID,
    })
  }

  // Fire onSuccess callback
  if (isSuccess && hash) {
    const capturedHash = hash
    const capturedTo = to
    const capturedAmt = amount
    setTimeout(() => {
      onSuccess(capturedHash, capturedTo, capturedAmt)
      handleClose()
    }, 1200)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
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
            {/* Spectral strip */}
            <div className="h-1" style={{ background: spectral }} />

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-black/10" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
                  Send USDC
                </h2>
                <button
                  onClick={handleClose}
                  disabled={isPending || isConfirming}
                  className="flex size-8 items-center justify-center rounded-full disabled:opacity-30"
                  style={{ background: 'var(--surface-muted)' }}
                >
                  <X className="size-4" style={{ color: 'var(--muted)' }} />
                </button>
              </div>

              {/* Success state */}
              {isSuccess ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle2 className="size-12" style={{ color: 'var(--success)' }} />
                  <p className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
                    Sent {amount} USDC
                  </p>
                  {txUrl && (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: 'var(--accent-hover)' }}
                    >
                      View on ArcScan <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  {/* Amount input */}
                  <div
                    className="mb-3 rounded-2xl p-4"
                    style={{
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <TokenUSDC variant="branded" size={24} />
                      <input
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, '')
                          if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
                        }}
                        placeholder="0.00"
                        className="display min-w-0 flex-1 bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
                        style={{ color: 'var(--ink)' }}
                      />
                      <span className="text-sm font-semibold" style={{ color: 'var(--subtle)' }}>
                        USDC
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                        Arc Testnet
                      </span>
                      <button
                        disabled={!formattedBalance}
                        onClick={() => formattedBalance && setAmount(formattedBalance)}
                        className="text-xs font-semibold disabled:opacity-40"
                        style={{ color: 'var(--accent-hover)' }}
                      >
                        {formattedBalance ? `Bal: ${formattedBalance} · Max` : 'Balance unavailable'}
                      </button>
                    </div>
                    {!hasEnoughBalance && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        Insufficient balance
                      </p>
                    )}
                  </div>

                  {/* Quick amounts */}
                  <div className="mb-3 flex gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        onClick={() => setAmount(q)}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold transition-all"
                        style={{
                          background: amount === q ? 'var(--accent)' : 'var(--surface-muted)',
                          color: amount === q ? '#fff' : 'var(--ink-2)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        ${q}
                      </button>
                    ))}
                  </div>

                  {/* Recipient */}
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                      Recipient address
                    </label>
                    <input
                      value={to}
                      onChange={(e) => setTo(e.target.value.trim())}
                      placeholder="0x…"
                      className="mono w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-slate-300"
                      style={{
                        background: 'var(--surface-muted)',
                        border: `1px solid ${to && !isValidAddress ? 'var(--danger)' : 'var(--border)'}`,
                        color: 'var(--ink)',
                      }}
                    />
                    {to && !isValidAddress && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        Not a valid address
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {writeError && (
                    <div
                      className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm"
                      style={{ background: 'rgba(186,43,76,0.07)', color: 'var(--danger)' }}
                    >
                      <AlertCircle className="size-4 shrink-0" />
                      {parseOnchainError(writeError)}
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    disabled={!isWrongChain && (!canSend || isSwitching)}
                    onClick={handleSend}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}
                  >
                    {isSwitching ? (
                      <><Loader2 className="size-4 animate-spin" /> Switching network…</>
                    ) : isWrongChain ? (
                      'Switch to Arc Testnet'
                    ) : isPending ? (
                      <><Loader2 className="size-4 animate-spin" /> Confirm in wallet…</>
                    ) : isConfirming ? (
                      <><Loader2 className="size-4 animate-spin" /> Confirming…</>
                    ) : (
                      'Send USDC'
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
