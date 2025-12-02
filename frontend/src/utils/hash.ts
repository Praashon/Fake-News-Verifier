import CryptoJS from 'crypto-js'

/**
 * Generate SHA-256 hash from text content
 */
export const generateContentHash = (content: string): string => {
    const hash = CryptoJS.SHA256(content)
    return hash.toString(CryptoJS.enc.Hex)
}

/**
 * Generate SHA-256 hash from file
 */
export const generateFileHash = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target?.result
                if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
                    throw new Error('Failed to read file')
                }
                
                // Convert ArrayBuffer to WordArray for crypto-js
                const wordArray = arrayBufferToWordArray(arrayBuffer)
                const hash = CryptoJS.SHA256(wordArray)
                resolve(hash.toString(CryptoJS.enc.Hex))
            } catch (error) {
                reject(error)
            }
        }
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }
        
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Convert ArrayBuffer to CryptoJS WordArray
 */
const arrayBufferToWordArray = (ab: ArrayBuffer): CryptoJS.lib.WordArray => {
    const i8a = new Uint8Array(ab)
    const a: number[] = []
    
    for (let i = 0; i < i8a.length; i += 4) {
        a.push(
            (i8a[i] << 24) | 
            ((i8a[i + 1] || 0) << 16) | 
            ((i8a[i + 2] || 0) << 8) | 
            (i8a[i + 3] || 0)
        )
    }
    
    return CryptoJS.lib.WordArray.create(a, i8a.length)
}

/**
 * Convert hex string to bytes32 format for Solidity
 */
export const hexToBytes32 = (hex: string): string => {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    
    // Ensure it's 64 characters (32 bytes)
    const paddedHex = cleanHex.padStart(64, '0').slice(0, 64)
    
    return '0x' + paddedHex
}

/**
 * Convert bytes32 to hex string
 */
export const bytes32ToHex = (bytes32: string): string => {
    // Remove 0x prefix if present
    return bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a percentage (0-100)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 100
    if (!str1 || !str2) return 0

    // Normalize strings
    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()

    if (s1 === s2) return 100

    const len1 = s1.length
    const len2 = s2.length
    
    // For very long strings, use a simplified comparison
    if (len1 > 10000 || len2 > 10000) {
        return calculateSimplifiedSimilarity(s1, s2)
    }

    // Create matrix
    const matrix: number[][] = []
    
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i]
    }
    
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            )
        }
    }

    const distance = matrix[len1][len2]
    const maxLen = Math.max(len1, len2)
    const similarity = ((maxLen - distance) / maxLen) * 100
    
    return Math.round(similarity * 100) / 100
}

/**
 * Simplified similarity for very long strings
 * Uses word-based comparison
 */
const calculateSimplifiedSimilarity = (str1: string, str2: string): number => {
    const words1 = new Set(str1.split(/\s+/))
    const words2 = new Set(str2.split(/\s+/))
    
    let intersection = 0
    words1.forEach(word => {
        if (words2.has(word)) intersection++
    })
    
    const union = words1.size + words2.size - intersection
    
    return Math.round((intersection / union) * 100 * 100) / 100
}

/**
 * Validate hash format
 */
export const isValidHash = (hash: string): boolean => {
    const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash
    return /^[a-fA-F0-9]{64}$/.test(cleanHash)
}

/**
 * Truncate hash for display
 */
export const truncateHash = (hash: string, startChars = 8, endChars = 6): string => {
    if (!hash) return ''
    if (hash.length <= startChars + endChars + 3) return hash
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`
}
