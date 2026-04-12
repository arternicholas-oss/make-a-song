import { Suspense } from 'react'
import CheckoutSuccessClient from './CheckoutSuccessClient'

export const dynamic = 'force-dynamic'

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFF9F0',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <p style={{ fontSize: 16, color: '#9A8F88' }}>Loading…</p>
      </div>
    }>
      <CheckoutSuccessClient />
    </Suspense>
  )
}
