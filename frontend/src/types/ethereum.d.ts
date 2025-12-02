import type { Eip1193Provider } from 'ethers'

declare global {
    interface Window {
        ethereum?: Eip1193Provider & {
            isMetaMask?: boolean
            on(event: 'accountsChanged', handler: (accounts: string[]) => void): void
            on(event: 'chainChanged', handler: (chainId: string) => void): void
            removeListener(event: 'accountsChanged', handler: (accounts: string[]) => void): void
            removeListener(event: 'chainChanged', handler: (chainId: string) => void): void
            request(args: { method: string; params?: unknown[] }): Promise<unknown>
        }
    }
}

export {}
