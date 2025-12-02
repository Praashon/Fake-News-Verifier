import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'
import ContentVerificationABI from '../contracts/ContentVerification.json'

// Contract address - Update after deployment
const CONTRACT_ADDRESS = ContentVerificationABI.address || import.meta.env.VITE_CONTRACT_ADDRESS || ''

// Sepolia RPC URL from environment
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/192a8eabea484b0db31e112c0431842d'

// Network configuration
const NETWORK_CONFIG = {
    sepolia: {
        chainId: '0xaa36a7',
        chainName: 'Sepolia',
        rpcUrls: [SEPOLIA_RPC_URL],
        nativeCurrency: {
            name: 'Sepolia ETH',
            symbol: 'ETH',
            decimals: 18
        },
        blockExplorer: 'https://sepolia.etherscan.io'
    },
    localhost: {
        chainId: '0x7a69',
        chainName: 'Localhost 8545',
        rpcUrls: ['http://127.0.0.1:8545'],
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        },
        blockExplorer: ''
    }
}

// Get current network from environment - default to sepolia for cloud
const CURRENT_NETWORK = import.meta.env.VITE_NETWORK || 'sepolia'
const networkConfig = NETWORK_CONFIG[CURRENT_NETWORK as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG.sepolia

/**
 * Get browser provider from MetaMask
 */
const getProvider = (): BrowserProvider | null => {
    if (typeof window !== 'undefined' && window.ethereum) {
        return new BrowserProvider(window.ethereum)
    }
    return null
}

/**
 * Get JSON RPC provider for read-only operations (bypasses MetaMask)
 */
const getReadOnlyProvider = (): JsonRpcProvider => {
    return new JsonRpcProvider(networkConfig.rpcUrls[0])
}

// Export for use in other modules
export { getReadOnlyProvider, CONTRACT_ADDRESS, networkConfig }

/**
 * Get contract instance
 */
const getContract = async (withSigner = false): Promise<Contract | null> => {
    if (!CONTRACT_ADDRESS) {
        console.warn('Contract address not configured')
        return null
    }

    if (withSigner) {
        const provider = getProvider()
        if (!provider) return null
        const signer = await provider.getSigner()
        return new Contract(CONTRACT_ADDRESS, ContentVerificationABI.abi, signer)
    }
    
    // Use direct RPC provider for read operations
    const provider = getReadOnlyProvider()
    return new Contract(CONTRACT_ADDRESS, ContentVerificationABI.abi, provider)
}

/**
 * Connect wallet and return address
 */
export const connectWallet = async (): Promise<string> => {
    if (!window.ethereum) {
        throw new Error('MetaMask not installed')
    }

    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        }) as string[]
        
        if (accounts.length === 0) {
            throw new Error('No accounts found')
        }
        
        return accounts[0]
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 4001) {
            throw new Error('User rejected connection request')
        }
        throw error
    }
}

/**
 * Get current connected account
 */
export const getCurrentAccount = async (): Promise<string | null> => {
    if (!window.ethereum) return null
    
    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        }) as string[]
        
        return accounts.length > 0 ? accounts[0] : null
    } catch (error) {
        console.error('Error getting current account:', error)
        return null
    }
}

/**
 * Register content on blockchain
 */
export const registerContent = async (
    contentHash: string,
    contentType: string,
    ipfsMetadata: string
): Promise<string> => {
    const contract = await getContract(true)
    if (!contract) {
        throw new Error('Contract not available. Please check your wallet connection.')
    }

    try {
        const tx = await contract.registerContent(contentHash, contentType, ipfsMetadata)
        const receipt = await tx.wait()
        return receipt.hash
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'reason' in error) {
            throw new Error((error as { reason: string }).reason)
        }
        throw error
    }
}

/**
 * Verify content on blockchain
 */
export const verifyContent = async (contentHash: string): Promise<{
    exists: boolean
    publisher: string
    timestamp: number
    contentType: string
    ipfsMetadata: string
}> => {
    const contract = await getContract(false)
    if (!contract) {
        throw new Error('Contract not available')
    }

    try {
        // Solidity mapping returns a tuple: [contentHash, timestamp, publisher, contentType, ipfsMetadata, exists]
        const content = await contract.contentRegistry(contentHash)
        
        // The struct fields are returned as array elements or named properties
        // Check exists field (last element in the struct)
        const exists = content.exists ?? content[5] ?? false
        
        if (!exists) {
            return {
                exists: false,
                publisher: '',
                timestamp: 0,
                contentType: '',
                ipfsMetadata: ''
            }
        }

        return {
            exists: true,
            publisher: content.publisher ?? content[2] ?? '',
            timestamp: Number(content.timestamp ?? content[1] ?? 0),
            contentType: content.contentType ?? content[3] ?? '',
            ipfsMetadata: content.ipfsMetadata ?? content[4] ?? ''
        }
    } catch (error) {
        console.error('Verification error:', error)
        // If the contract call fails, return not exists instead of throwing
        return {
            exists: false,
            publisher: '',
            timestamp: 0,
            contentType: '',
            ipfsMetadata: ''
        }
    }
}

/**
 * Get content details by hash
 */
export const getContentDetails = async (contentHash: string): Promise<{
    exists: boolean
    contentHash: string
    publisher: string
    timestamp: number
    contentType: string
    ipfsMetadata: string
}> => {
    const contract = await getContract(false)
    if (!contract) {
        return {
            exists: false,
            contentHash,
            publisher: '',
            timestamp: 0,
            contentType: '',
            ipfsMetadata: ''
        }
    }

    try {
        const content = await contract.contentRegistry(contentHash)
        
        // Handle both named properties and array access for struct fields
        const exists = content.exists ?? content[5] ?? false
        
        return {
            exists,
            contentHash,
            publisher: content.publisher ?? content[2] ?? '',
            timestamp: Number(content.timestamp ?? content[1] ?? 0),
            contentType: content.contentType ?? content[3] ?? '',
            ipfsMetadata: content.ipfsMetadata ?? content[4] ?? ''
        }
    } catch (error) {
        console.error('Error getting content details:', error)
        return {
            exists: false,
            contentHash,
            publisher: '',
            timestamp: 0,
            contentType: '',
            ipfsMetadata: ''
        }
    }
}

/**
 * Get all content registered by a publisher
 */
export const getPublisherContent = async (publisherAddress: string): Promise<string[]> => {
    const contract = await getContract(false)
    if (!contract) return []

    try {
        // Get all content hashes for the publisher
        const hashes: string[] = []
        let index = 0
        
        while (true) {
            try {
                const hash = await contract.publisherContent(publisherAddress, index)
                if (hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    hashes.push(hash)
                    index++
                } else {
                    break
                }
            } catch {
                break
            }
        }
        
        return hashes
    } catch (error) {
        console.error('Error getting publisher content:', error)
        return []
    }
}

/**
 * Get total registrations count
 */
export const getTotalRegistrations = async (): Promise<number> => {
    const contract = await getContract(false)
    if (!contract) return 0

    try {
        const total = await contract.totalRegistrations()
        return Number(total)
    } catch (error) {
        console.error('Error getting total registrations:', error)
        return 0
    }
}

/**
 * Get all registered content by querying ContentRegistered events
 */
export const getAllRegisteredContent = async (): Promise<Array<{
    contentHash: string
    publisher: string
    timestamp: number
    contentType: string
    ipfsMetadata: string
}>> => {
    try {
        const provider = getReadOnlyProvider()
        const contract = new Contract(CONTRACT_ADDRESS, ContentVerificationABI.abi, provider)
        
        // Query ContentRegistered events from block 0 to latest
        const filter = contract.filters.ContentRegistered()
        const events = await contract.queryFilter(filter, 0, 'latest')
        
        console.log('Found', events.length, 'ContentRegistered events')
        
        const content = events.map(event => {
            const args = (event as unknown as { args: [string, string, bigint, string, string] }).args
            return {
                contentHash: args[0],
                publisher: args[1],
                timestamp: Number(args[2]),
                contentType: args[3],
                ipfsMetadata: args[4]
            }
        })
        
        // Sort by timestamp descending (newest first)
        return content.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
        console.error('Error fetching registered content:', error)
        return []
    }
}

/**
 * Get publisher reputation
 */
export const getPublisherReputation = async (publisherAddress: string): Promise<{
    totalRegistrations: number
    verificationCount: number
    reputationScore: number
}> => {
    const contract = await getContract(false)
    if (!contract) {
        return { totalRegistrations: 0, verificationCount: 0, reputationScore: 0 }
    }

    try {
        const reputation = await contract.publisherReputations(publisherAddress)
        return {
            totalRegistrations: Number(reputation.totalRegistrations),
            verificationCount: Number(reputation.verificationCount),
            reputationScore: Number(reputation.reputationScore)
        }
    } catch (error) {
        console.error('Error getting publisher reputation:', error)
        return { totalRegistrations: 0, verificationCount: 0, reputationScore: 0 }
    }
}

/**
 * Format address for display
 */
export const formatAddress = (address: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Get Etherscan URL for transaction
 */
export const getEtherscanUrl = (txHash: string): string => {
    return `${networkConfig.blockExplorer}/tx/${txHash}`
}

/**
 * Get Etherscan URL for address
 */
export const getAddressUrl = (address: string): string => {
    return `${networkConfig.blockExplorer}/address/${address}`
}

/**
 * Check if wallet is connected to correct network
 */
export const checkNetwork = async (): Promise<boolean> => {
    if (!window.ethereum) return false

    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
        return chainId === networkConfig.chainId
    } catch (error) {
        console.error('Error checking network:', error)
        return false
    }
}

/**
 * Request network switch to correct network
 */
export const switchNetwork = async (): Promise<void> => {
    if (!window.ethereum) {
        throw new Error('MetaMask not installed')
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: networkConfig.chainId }]
        })
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 4902) {
            // Chain not added, add it
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: networkConfig.chainId,
                    chainName: networkConfig.chainName,
                    rpcUrls: networkConfig.rpcUrls,
                    nativeCurrency: networkConfig.nativeCurrency,
                    blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : []
                }]
            })
        } else {
            throw error
        }
    }
}

/**
 * Get current network name
 */
export const getCurrentNetwork = (): string => {
    return CURRENT_NETWORK
}


/**
 * Get recent content registrations from blockchain events
 */
export const getRecentRegistrations = async (limit: number = 20): Promise<{
    contentHash: string
    publisher: string
    timestamp: number
    contentType: string
    ipfsMetadata: string
}[]> => {
    const contract = await getContract(false)
    if (!contract) return []

    try {
        // Get ContentRegistered events from the last 5000 blocks (reduced for speed)
        const filter = contract.filters.ContentRegistered()
        const latestBlock = await getReadOnlyProvider().getBlockNumber()
        const fromBlock = Math.max(0, latestBlock - 5000)
        
        const events = await contract.queryFilter(filter, fromBlock, latestBlock)
        
        // Parse events and return most recent first
        const registrations = events
            .map(event => {
                const args = (event as unknown as { args: unknown[] }).args
                return {
                    contentHash: args[0] as string,
                    publisher: args[1] as string,
                    timestamp: Number(args[2]),
                    contentType: args[3] as string,
                    ipfsMetadata: args[4] as string
                }
            })
            .reverse()
            .slice(0, limit)

        return registrations
    } catch (error) {
        console.error('Error fetching registrations:', error)
        return []
    }
}

/**
 * Search verified news by title (searches through IPFS metadata)
 */
// Simple in-memory cache for IPFS metadata
const ipfsCache: Map<string, { data: unknown; timestamp: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const fetchIPFSWithCache = async (ipfsHash: string, timeout: number = 3000): Promise<unknown | null> => {
    // Check cache first
    const cached = ipfsCache.get(ipfsHash)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
    }

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, {
            signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (!response.ok) return null
        const data = await response.json()
        
        // Cache the result
        ipfsCache.set(ipfsHash, { data, timestamp: Date.now() })
        return data
    } catch {
        return null
    }
}

export const searchVerifiedNews = async (searchQuery: string): Promise<{
    found: boolean
    matches: {
        title: string
        source: string
        url: string
        publishedAt: string
        contentHash: string
        ipfsMetadata: string
        reliability: string
        similarity: number
    }[]
}> => {
    try {
        // Reduced limit for faster search
        const registrations = await getRecentRegistrations(20)
        const searchLower = searchQuery.toLowerCase().trim()

        // Filter only articles with IPFS metadata
        const articleRegs = registrations.filter(reg => 
            reg.contentType === 'article' && reg.ipfsMetadata
        )

        // Fetch all IPFS metadata in parallel with timeout
        const metadataResults = await Promise.all(
            articleRegs.map(async (reg) => {
                const metadata = await fetchIPFSWithCache(reg.ipfsMetadata)
                return { reg, metadata }
            })
        )

        const matches: {
            title: string
            source: string
            url: string
            publishedAt: string
            contentHash: string
            ipfsMetadata: string
            reliability: string
            similarity: number
        }[] = []

        for (const { reg, metadata } of metadataResults) {
            if (!metadata || !(metadata as { title?: string }).title) continue
            
            const meta = metadata as { title: string; source?: string; url?: string; publishedAt?: string; reliability?: string }
            const titleLower = meta.title.toLowerCase()
            
            // Calculate similarity
            let similarity = 0
            if (titleLower === searchLower) {
                similarity = 100
            } else if (titleLower.includes(searchLower) || searchLower.includes(titleLower)) {
                similarity = 80
            } else {
                // Word matching
                const searchWords = searchLower.split(/\s+/).filter((w: string) => w.length > 3)
                const titleWords = titleLower.split(/\s+/)
                const matchedWords = searchWords.filter((sw: string) => 
                    titleWords.some((tw: string) => tw.includes(sw) || sw.includes(tw))
                )
                similarity = searchWords.length > 0 
                    ? Math.round((matchedWords.length / searchWords.length) * 100)
                    : 0
            }

            if (similarity >= 50) {
                matches.push({
                    title: meta.title,
                    source: meta.source || 'Unknown',
                    url: meta.url || '',
                    publishedAt: meta.publishedAt || '',
                    contentHash: reg.contentHash,
                    ipfsMetadata: reg.ipfsMetadata,
                    reliability: meta.reliability || 'verified',
                    similarity
                })
            }
        }

        // Sort by similarity
        matches.sort((a, b) => b.similarity - a.similarity)

        return {
            found: matches.length > 0,
            matches: matches.slice(0, 10)
        }
    } catch (error) {
        console.error('Error searching verified news:', error)
        return { found: false, matches: [] }
    }
}
