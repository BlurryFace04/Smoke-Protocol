'use client'

import { ThemeProvider } from 'next-themes'
import { ThemeProviderProps } from 'next-themes/dist/types'
import { EthereumProvider } from "./ethereum";

export function Provider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider {...props}>
      <EthereumProvider>
        {children}
      </EthereumProvider>
    </ThemeProvider>
  );
}
