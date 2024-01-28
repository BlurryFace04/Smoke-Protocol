import './globals.css';
import { Provider } from '@/components/provider';

import { Metadata } from 'next'
import { fontMono, fontSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: {
    default: 'Smoke Protocol',
    template: `%s - Next.js Boilerplate`
  },
  description: 'Lending and Borrowing using crosschain NFTs as collateral',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={cn(
          'font-sans antialiased overflow-hidden',
          fontSans.variable,
          fontMono.variable
        )}
      >
        <Provider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex flex-col flex-1 bg-muted/50">{children}</main>
          </div>
        </Provider>
      </body>
    </html>
  );
}

export default RootLayout;
