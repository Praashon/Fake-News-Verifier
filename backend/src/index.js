import 'dotenv/config'
import cron from 'node-cron'
import { fetchTopHeadlines, fetchEverything } from './services/newsFetcher.js'
import { BlockchainService } from './services/blockchainService.js'

const {
    PRIVATE_KEY,
    SEPOLIA_RPC_URL,
    CONTRACT_ADDRESS,
    NEWS_API_KEY,
    PINATA_JWT,
    FETCH_INTERVAL_MINUTES = 30
} = process.env

// Validate environment
if (!PRIVATE_KEY || !SEPOLIA_RPC_URL || !CONTRACT_ADDRESS) {
    console.error('❌ Missing required environment variables!')
    console.error('   Required: PRIVATE_KEY, SEPOLIA_RPC_URL, CONTRACT_ADDRESS')
    process.exit(1)
}

if (!NEWS_API_KEY || NEWS_API_KEY === 'your_newsapi_key_here') {
    console.error('❌ Missing NEWS_API_KEY!')
    console.error('   Get a free API key at: https://newsapi.org/register')
    process.exit(1)
}

// Initialize blockchain service
const blockchain = new BlockchainService(SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS)

/**
 * Fetch and register news articles
 */
async function fetchAndRegisterNews() {
    console.log('\n' + '='.repeat(60))
    console.log(`📰 Starting news fetch at ${new Date().toISOString()}`)
    console.log('='.repeat(60))

    // Check wallet balance
    const balance = await blockchain.getBalance()
    console.log(`💰 Wallet balance: ${balance} ETH`)
    console.log(`📍 Wallet address: ${blockchain.getAddress()}`)

    if (parseFloat(balance) < 0.001) {
        console.error('❌ Insufficient balance! Need at least 0.001 ETH for gas')
        return
    }

    // Fetch news from trusted sources
    console.log('\n📡 Fetching news from trusted sources...')
    const articles = await fetchTopHeadlines(NEWS_API_KEY, { pageSize: 10 })

    if (articles.length === 0) {
        console.log('⚠️  No articles fetched. Check API key or try again later.')
        return
    }

    console.log(`📋 Found ${articles.length} articles from trusted sources\n`)

    // Register each article
    let registered = 0
    let skipped = 0
    let failed = 0

    for (const article of articles) {
        const result = await blockchain.registerArticle(article, PINATA_JWT)
        
        if (result.success) {
            registered++
        } else if (result.reason === 'already-registered') {
            skipped++
        } else {
            failed++
        }

        // Small delay between transactions
        await new Promise(r => setTimeout(r, 2000))
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log(`   ✅ Registered: ${registered}`)
    console.log(`   ⏭️  Skipped (already registered): ${skipped}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log('='.repeat(60) + '\n')
}

/**
 * Main entry point
 */
async function main() {
    console.log('🚀 Fake News Verifier - Auto News Fetcher')
    console.log('=========================================\n')

    // Run immediately on start
    await fetchAndRegisterNews()

    // Schedule periodic fetching
    const cronExpression = `*/${FETCH_INTERVAL_MINUTES} * * * *`
    console.log(`⏰ Scheduling news fetch every ${FETCH_INTERVAL_MINUTES} minutes`)
    
    cron.schedule(cronExpression, async () => {
        await fetchAndRegisterNews()
    })

    console.log('👀 Watching for news... Press Ctrl+C to stop\n')
}

main().catch(console.error)
