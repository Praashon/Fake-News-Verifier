import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { getRecentRegistrations } from '../utils/blockchain'
import { fetchFromIPFS } from '../utils/ipfs'
import { DotScreenShader } from '@/components/ui/dot-shader-background'
import LoadingSpinner from '../components/LoadingSpinner'
import { NewspaperIcon } from '@heroicons/react/24/outline'

interface NewsArticle {
    title: string
    description: string
    url: string
    source: string
    sourceId: string
    reliability: string
    author: string
    publishedAt: string
    urlToImage: string
    registeredAt: string
    contentHash: string
}

const reliabilityColors: Record<string, string> = {
    'highest': 'bg-green-500',
    'high': 'bg-blue-500',
    'medium-high': 'bg-yellow-500',
    'medium': 'bg-orange-500'
}

const reliabilityLabels: Record<string, string> = {
    'highest': 'Most Reliable',
    'high': 'Highly Reliable',
    'medium-high': 'Reliable',
    'medium': 'Moderately Reliable'
}

export default function NewsFeed() {
    const [articles, setArticles] = useState<NewsArticle[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState<string>('all')

    useEffect(() => {
        loadVerifiedNews()
    }, [])

    const loadVerifiedNews = async () => {
        setLoading(true)
        setError('')

        try {
            const registrations = await getRecentRegistrations(50)
            const articlesWithMetadata: NewsArticle[] = []
            
            for (const reg of registrations) {
                if (reg.ipfsMetadata && reg.contentType === 'article') {
                    try {
                        const metadata = await fetchFromIPFS(reg.ipfsMetadata)
                        if (metadata && metadata.title) {
                            articlesWithMetadata.push({
                                title: String(metadata.title || ''),
                                description: String(metadata.description || ''),
                                url: String(metadata.url || ''),
                                source: String(metadata.source || ''),
                                sourceId: String(metadata.sourceId || ''),
                                reliability: String(metadata.reliability || 'medium'),
                                author: String(metadata.author || ''),
                                publishedAt: String(metadata.publishedAt || ''),
                                urlToImage: String(metadata.urlToImage || ''),
                                registeredAt: String(metadata.registeredAt || new Date().toISOString()),
                                contentHash: reg.contentHash
                            })
                        }
                    } catch {
                        // Skip articles with invalid IPFS data
                    }
                }
            }

            setArticles(articlesWithMetadata)
        } catch (err) {
            console.error('Error loading news:', err)
            setError('Failed to load verified news. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const filteredArticles = articles.filter(article => {
        if (filter === 'all') return true
        return article.reliability === filter
    })

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4">
            <DotScreenShader />
            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        className="flex justify-center mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <NewspaperIcon className="h-16 w-16 text-cyan-400" />
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Verified
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> News Feed</span>
                    </h1>
                    <p className="text-lg text-white/70 max-w-2xl mx-auto">
                        News articles automatically verified and registered on the blockchain 
                        from trusted sources like Reuters, BBC, AP News, and more.
                    </p>
                </motion.div>

                {/* Filters */}
                <motion.div
                    className="flex flex-wrap justify-center gap-3 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    {[
                        { key: 'all', label: 'All Sources', color: 'bg-cyan-500' },
                        { key: 'highest', label: '🏆 Most Reliable', color: 'bg-green-500' },
                        { key: 'high', label: '⭐ Highly Reliable', color: 'bg-blue-500' }
                    ].map((item) => (
                        <motion.button
                            key={item.key}
                            onClick={() => setFilter(item.key)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                filter === item.key 
                                    ? `${item.color} text-white` 
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {item.label}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Loading State */}
                {loading && (
                    <motion.div
                        className="flex justify-center py-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <LoadingSpinner size="lg" color="white" />
                    </motion.div>
                )}

                {/* Error State */}
                {error && (
                    <motion.div
                        className="bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-xl p-6 text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <p className="text-red-300">{error}</p>
                        <motion.button
                            onClick={loadVerifiedNews}
                            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Try Again
                        </motion.button>
                    </motion.div>
                )}

                {/* Empty State */}
                {!loading && !error && articles.length === 0 && (
                    <motion.div
                        className="text-center py-20"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-medium text-white mb-2">No Verified News Yet</h3>
                        <p className="text-white/60 max-w-md mx-auto">
                            The automatic news fetcher hasn't registered any articles yet. 
                            Run the backend service to start fetching news from trusted sources.
                        </p>
                        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl p-4 max-w-lg mx-auto text-left border border-white/10">
                            <p className="text-white/80 text-sm font-mono">
                                cd backend<br/>
                                npm install<br/>
                                npm start
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* News Grid */}
                {!loading && !error && filteredArticles.length > 0 && (
                    <motion.div
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        {filteredArticles.map((article, index) => (
                            <motion.article 
                                key={article.contentHash || index}
                                className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                whileHover={{ scale: 1.02, y: -5 }}
                            >
                                {/* Image */}
                                {article.urlToImage && (
                                    <div className="aspect-video bg-white/5 overflow-hidden">
                                        <img
                                            src={article.urlToImage}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="p-5">
                                    {/* Source Badge */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                                            reliabilityColors[article.reliability] || 'bg-gray-500'
                                        }`}>
                                            {reliabilityLabels[article.reliability] || 'Verified'}
                                        </span>
                                        <span className="text-white/50 text-sm">{article.source}</span>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                                        {article.title}
                                    </h2>

                                    {/* Description */}
                                    <p className="text-white/60 text-sm mb-4 line-clamp-3">
                                        {article.description}
                                    </p>

                                    {/* Meta */}
                                    <div className="flex items-center justify-between text-xs text-white/40">
                                        <span>{formatDate(article.publishedAt)}</span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Verified
                                        </span>
                                    </div>

                                    {/* Read More */}
                                    <motion.a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 block text-center py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg 
                                                   hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Read Original Article →
                                    </motion.a>
                                </div>
                            </motion.article>
                        ))}
                    </motion.div>
                )}

                {/* Blockchain Info */}
                <motion.div
                    className="mt-12 text-center text-white/40 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <p>All articles are cryptographically hashed and stored on Ethereum Sepolia</p>
                </motion.div>
            </div>
        </div>
    )
}
