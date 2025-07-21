import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import Head from 'next/head'

import '@/styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutos
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>AgroIA - Monitoramento Agrícola Inteligente</title>
        <meta name="description" content="Sistema de monitoramento agrícola com análise de satélite, IA e alertas via WhatsApp" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Meta tags para SEO */}
        <meta name="keywords" content="agricultura, satélite, IA, NDVI, monitoramento, WhatsApp, alertas" />
        <meta name="author" content="AgroIA Team" />
        <meta property="og:title" content="AgroIA - Monitoramento Agrícola Inteligente" />
        <meta property="og:description" content="Monitore suas plantações com tecnologia de satélite e inteligência artificial" />
        <meta property="og:type" content="website" />
        
        {/* Leaflet CSS */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </Head>
      
      <Component {...pageProps} />
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default MyApp