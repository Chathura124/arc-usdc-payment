import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { ConnectKitButton } from 'connectkit'
import { ArrowUpRight, ArrowDownLeft, Clock, ExternalLink, Zap } from 'lucide-react'
import { TokenUSDC, NetworkArc } from '@web3icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { SendSheet } from './SendSheet'
import { ReceiveSheet } from './ReceiveSheet'

const TARGET_CHAIN_ID = arcTestnet.id
const usdcFact = getUsdc(TARGET_CHAIN_ID)!
const USDC_ADDRESS = usdcFact.address as `0x${string}`
const USDC_DECIMALS = usdcDecimalsFor(TARGET_CHAIN_ID)

interface TxRecord {
  hash: string
  to: string
  amount: string
  ts: number
}

const glass = {
  card: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(18,45,69,0.10)',
    boxShadow: '0 4px 32px rgba(18,45,69,0.06)',
  } as React.CSSProperties,
}

function formatShortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function PaymentApp() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  // Parse prefilled params from URL to auto-open send sheet
  const prefillParams = (() => {
    const p = new URLSearchParams(window.location.search)
    return { to: p.get('to'), amount: p.get('amount') }
  })()

  const [sendOpen, setSendOpen] = useState(() => !!(prefillParams.to && typeof window !== 'undefined'))
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [txHistory, setTxHistory] = useState<TxRecord[]>([])

  // Store prefills for SendSheet to read when it mounts
  useEffect(() => {
    if (prefillParams.to) sessionStorage.setItem('prefill_to', prefillParams.to)
    if (prefillParams.amount) sessionStorage.setItem('prefill_amount', prefillParams.amount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  const { data: rawBalance, isLoading: balanceLoading } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  })

  const formattedBalance =
    rawBalance !== undefined
      ? Amount.fromRaw(rawBalance, USDC_DECIMALS).toFixed(2)
      : undefined

  const handleSendSuccess = (hash: string, to: string, amount: string) => {
    setTxHistory((prev) => [{ hash, to, amount, ts: Date.now() }, ...prev.slice(0, 9)])
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center px-4 py-8"
      style={{ background: 'var(--bg-gradient)' }}
    >
      {/* Header */}
      <header className="mb-8 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2">
          <NetworkArc variant="branded" size={28} />
          <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
            Arc Pay
          </span>
        </div>
        <ConnectKitButton />
      </header>

      {/* Wrong chain banner */}
      <AnimatePresence>
        {isWrongChain && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex w-full max-w-md items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'rgba(186,43,76,0.08)', border: '1px solid rgba(186,43,76,0.18)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
              Wrong network — please switch to Arc Testnet
            </p>
            <button
              onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: 'var(--danger)' }}
            >
              Switch
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero balance card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 w-full max-w-md rounded-3xl p-6"
        style={glass.card}
      >
        <div className="mb-3 flex items-center gap-2">
          <TokenUSDC variant="branded" size={20} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            USDC Balance
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className="display text-5xl font-bold tabular-nums"
            style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}
          >
            {!isConnected
              ? '—'
              : balanceLoading
              ? '…'
              : formattedBalance ?? '0.00'}
          </span>
          <span className="text-xl font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <Zap className="size-3" style={{ color: 'var(--success)' }} />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {isConnected ? 'Live on Arc Testnet · gas is USDC' : 'Connect your wallet to see your balance'}
          </p>
        </div>
      </motion.section>

      {/* Action row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="mb-6 flex w-full max-w-md gap-3"
      >
        <button
          disabled={!isConnected}
          onClick={() => setSendOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          <ArrowUpRight className="size-4" />
          Send
        </button>
        <button
          disabled={!isConnected}
          onClick={() => setReceiveOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
          }}
        >
          <ArrowDownLeft className="size-4" />
          Receive
        </button>
      </motion.div>

      {/* Activity feed */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14 }}
        className="w-full max-w-md rounded-3xl p-5"
        style={glass.card}
      >
        <div className="mb-4 flex items-center gap-2">
          <Clock className="size-4" style={{ color: 'var(--muted)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            Activity this session
          </h3>
        </div>

        {txHistory.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <TokenUSDC variant="mono" size={32} className="opacity-20" />
            <p className="text-sm" style={{ color: 'var(--subtle)' }}>
              {isConnected ? 'No transactions yet — try sending some USDC.' : 'Connect your wallet to get started.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {txHistory.map((tx) => (
                <motion.li
                  key={tx.hash}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl px-3 py-3"
                  style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(26,128,71,0.12)' }}
                    >
                      <ArrowUpRight className="size-4" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                        Sent {tx.amount} USDC
                      </p>
                      <p className="mono text-xs" style={{ color: 'var(--subtle)' }}>
                        to {formatShortAddr(tx.to)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={buildTxExplorerUrl(TARGET_CHAIN_ID, tx.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    View <ExternalLink className="size-3" />
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* Faucet note */}
      <p className="mt-6 text-center text-xs" style={{ color: 'var(--subtle)' }}>
        Need test USDC? Use the{' '}
        <span className="font-semibold" style={{ color: 'var(--accent-hover)' }}>
          Get test USDC
        </span>{' '}
        button in the Arc Studio sidebar.
      </p>

      {/* Sheets */}
      <SendSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSuccess={handleSendSuccess}
      />
      {address && (
        <ReceiveSheet
          open={receiveOpen}
          onClose={() => setReceiveOpen(false)}
          address={address}
        />
      )}
    </div>
  )
}
