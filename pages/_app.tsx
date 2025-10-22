import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import ErrorBoundary from '../components/ErrorBoundary'
import '../styles/globals.css'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ErrorBoundary>
  )
}
