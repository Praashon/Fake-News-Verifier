import { ethers } from 'ethers'
import crypto from 'crypto'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load contract ABI - go up to project root, then into frontend
const contractPath = path.join(__dirname, '../../../frontend/src/contracts/ContentVerification.json')
const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'))

/**
 * Blockchain service for registering news on-chain
 */
export class BlockchainService {
    constructor(rpcUrl, privateKey, contractAddress) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl)
        this.wallet = new ethers.Wallet(privateKey, this.provider)
        this.contract = new ethers.Contract(contractAddress, contractData.abi, this.wallet)
        this.registeredHashes = new Set() // Track what we've already registered
    }

    /**
     * Generate content hash from article
     */
    generateContentHash(article) {
        // Create deterministic hash from title + source + publishedAt
        const content = `${article.title}|${article.source.id}|${article.publishedAt}`
        const hash = crypto.createHash('sha256').update(content).digest('hex')
        return '0x' + hash
    }

    /**
     * Upload metadata to IPFS via Pinata
     */
    async uploadToIPFS(article, pinataJwt) {
        try {
            const metadata = {
                title: article.title,
                description: article.description,
                url: article.url,
                source: article.source.name,
                sourceId: article.source.id,
                reliability: article.source.reliability,
                author: article.author,
                publishedAt: article.publishedAt,
                urlToImage: article.urlToImage,
                registeredAt: new Date().toISOString(),
                registeredBy: 'auto-news-fetcher'
            }

            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                {
                    pinataContent: metadata,
                    pinataMetadata: {
                        name: `news-${article.source.id}-${Date.now()}.json`
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${pinataJwt}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            return response.data.IpfsHash
        } catch (error) {
            console.error('IPFS upload error:', error.message)
            return ''
        }
    }

    /**
     * Check if content is already registered
     */
    async isRegistered(contentHash) {
        if (this.registeredHashes.has(contentHash)) {
            return true
        }

        try {
            const content = await this.contract.contentRegistry(contentHash)
            return content.exists || content[5]
        } catch (error) {
            return false
        }
    }

    /**
     * Register article on blockchain
     */
    async registerArticle(article, pinataJwt) {
        const contentHash = this.generateContentHash(article)
        
        // Check if already registered
        if (await this.isRegistered(contentHash)) {
            console.log(`⏭️  Already registered: ${article.title.slice(0, 50)}...`)
            return { success: false, reason: 'already-registered', hash: contentHash }
        }

        try {
            // Upload metadata to IPFS
            console.log(`📤 Uploading to IPFS: ${article.title.slice(0, 50)}...`)
            const ipfsHash = await this.uploadToIPFS(article, pinataJwt)

            // Register on blockchain
            console.log(`⛓️  Registering on blockchain...`)
            const tx = await this.contract.registerContent(
                contentHash,
                'article',
                ipfsHash
            )

            console.log(`⏳ Waiting for confirmation... TX: ${tx.hash}`)
            const receipt = await tx.wait()

            this.registeredHashes.add(contentHash)

            console.log(`✅ Registered: ${article.title.slice(0, 50)}...`)
            console.log(`   Hash: ${contentHash}`)
            console.log(`   IPFS: ${ipfsHash}`)
            console.log(`   Block: ${receipt.blockNumber}`)

            return {
                success: true,
                hash: contentHash,
                ipfsHash,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber
            }
        } catch (error) {
            console.error(`❌ Failed to register: ${article.title.slice(0, 50)}...`)
            console.error(`   Error: ${error.message}`)
            return { success: false, reason: error.message, hash: contentHash }
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance() {
        const balance = await this.provider.getBalance(this.wallet.address)
        return ethers.formatEther(balance)
    }

    /**
     * Get wallet address
     */
    getAddress() {
        return this.wallet.address
    }
}
