/**
 * IPFS utilities using Pinata for decentralized storage
 */

// Pinata API configuration
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || ''

// Pinata API endpoints
const PINATA_API_URL = 'https://api.pinata.cloud'
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

/**
 * Check if Pinata is configured
 */
function isPinataConfigured(): boolean {
    return Boolean(PINATA_JWT)
}

/**
 * Get authorization headers for Pinata
 */
const getAuthHeaders = (): Record<string, string> => {
    return {
        'Authorization': `Bearer ${PINATA_JWT}`
    }
}

/**
 * Upload a file to IPFS via Pinata
 */
export const uploadFileToIPFS = async (file: File): Promise<string> => {
    if (!isPinataConfigured()) {
        throw new Error('Pinata API not configured. Please set VITE_PINATA_JWT environment variable.')
    }

    const formData = new FormData()
    formData.append('file', file)

    // Add metadata
    const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
            type: file.type,
            size: file.size.toString(),
            uploadedAt: new Date().toISOString()
        }
    })
    formData.append('pinataMetadata', metadata)

    // Pin options
    const options = JSON.stringify({
        cidVersion: 1
    })
    formData.append('pinataOptions', options)

    try {
        const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to upload file to IPFS')
        }

        const result = await response.json()
        return result.IpfsHash
    } catch (error) {
        console.error('IPFS upload error:', error)
        throw error
    }
}

/**
 * Upload JSON data to IPFS via Pinata
 */
export const uploadJSONToIPFS = async (data: Record<string, unknown>): Promise<string> => {
    if (!isPinataConfigured()) {
        throw new Error('Pinata API not configured. Please set VITE_PINATA_JWT environment variable.')
    }

    const payload = {
        pinataContent: data,
        pinataMetadata: {
            name: `metadata-${Date.now()}.json`,
            keyvalues: {
                type: 'json',
                uploadedAt: new Date().toISOString()
            }
        },
        pinataOptions: {
            cidVersion: 1
        }
    }

    try {
        const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to upload JSON to IPFS')
        }

        const result = await response.json()
        return result.IpfsHash
    } catch (error) {
        console.error('IPFS JSON upload error:', error)
        throw error
    }
}

/**
 * Fetch content from IPFS
 */
export const fetchFromIPFS = async (ipfsHash: string): Promise<Record<string, unknown>> => {
    if (!ipfsHash) {
        throw new Error('IPFS hash is required')
    }

    // Clean the hash (remove any gateway prefix if present)
    const cleanHash = ipfsHash.replace(/^.*\/ipfs\//, '')

    const gateways = [
        PINATA_GATEWAY,
        'https://ipfs.io/ipfs',
        'https://cloudflare-ipfs.com/ipfs',
        'https://dweb.link/ipfs'
    ]

    for (const gateway of gateways) {
        try {
            const response = await fetch(`${gateway}/${cleanHash}`, {
                headers: {
                    'Accept': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                return data as Record<string, unknown>
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${gateway}:`, error)
            continue
        }
    }

    throw new Error('Failed to fetch from IPFS. All gateways failed.')
}

/**
 * Get IPFS URL for a hash
 */
export const getIPFSUrl = (ipfsHash: string): string => {
    if (!ipfsHash) return ''
    const cleanHash = ipfsHash.replace(/^.*\/ipfs\//, '')
    return `${PINATA_GATEWAY}/${cleanHash}`
}

/**
 * Check if a hash is a valid IPFS CID
 */
export const isValidIPFSHash = (hash: string): boolean => {
    if (!hash) return false
    const cleanHash = hash.replace(/^.*\/ipfs\//, '')
    
    // CIDv0 (base58btc, starts with Qm, 46 chars)
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
    
    // CIDv1 (base32, starts with ba or bf, variable length)
    const cidV1Regex = /^b[a-z2-7]{58,}$/
    
    return cidV0Regex.test(cleanHash) || cidV1Regex.test(cleanHash)
}

/**
 * Unpin content from IPFS via Pinata
 */
export const unpinFromIPFS = async (ipfsHash: string): Promise<boolean> => {
    if (!isPinataConfigured()) {
        throw new Error('Pinata API not configured')
    }

    const cleanHash = ipfsHash.replace(/^.*\/ipfs\//, '')

    try {
        const response = await fetch(`${PINATA_API_URL}/pinning/unpin/${cleanHash}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })

        return response.ok
    } catch (error) {
        console.error('IPFS unpin error:', error)
        return false
    }
}
