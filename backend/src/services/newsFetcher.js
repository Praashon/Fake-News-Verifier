import axios from 'axios'
import { TRUSTED_SOURCES, getSourceIds } from '../config/trustedSources.js'

const NEWS_API_URL = 'https://newsapi.org/v2'

/**
 * Fetch top headlines from trusted sources
 */
export async function fetchTopHeadlines(apiKey, options = {}) {
    const { country = 'us', category = '', pageSize = 20 } = options

    try {
        const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
            params: {
                apiKey,
                sources: getSourceIds(),
                pageSize,
                language: 'en'
            }
        })

        return processArticles(response.data.articles)
    } catch (error) {
        console.error('Error fetching top headlines:', error.message)
        return []
    }
}

/**
 * Fetch everything from trusted sources
 */
export async function fetchEverything(apiKey, options = {}) {
    const { query = '', pageSize = 50, sortBy = 'publishedAt' } = options

    try {
        // Fetch from each trusted source
        const sourceIds = Object.keys(TRUSTED_SOURCES).slice(0, 5) // Limit to avoid rate limits
        
        const response = await axios.get(`${NEWS_API_URL}/everything`, {
            params: {
                apiKey,
                sources: sourceIds.join(','),
                pageSize,
                sortBy,
                language: 'en',
                q: query || undefined
            }
        })

        return processArticles(response.data.articles)
    } catch (error) {
        console.error('Error fetching news:', error.message)
        return []
    }
}

/**
 * Process and normalize articles
 */
function processArticles(articles) {
    if (!articles) return []

    return articles
        .filter(article => article.title && article.url && article.source?.id)
        .map(article => ({
            id: generateArticleId(article),
            title: article.title,
            description: article.description || '',
            content: article.content || article.description || '',
            url: article.url,
            urlToImage: article.urlToImage || '',
            publishedAt: article.publishedAt,
            source: {
                id: article.source.id,
                name: article.source.name,
                ...TRUSTED_SOURCES[article.source.id]
            },
            author: article.author || 'Unknown'
        }))
        .filter(article => article.source.reliability) // Only keep articles from known trusted sources
}

/**
 * Generate unique article ID
 */
function generateArticleId(article) {
    return `${article.source.id}-${Buffer.from(article.url).toString('base64').slice(0, 20)}`
}

/**
 * Fetch news using free RSS feeds (no API key needed)
 */
export async function fetchFromRSS() {
    const RSS_FEEDS = [
        { name: 'Reuters', url: 'https://www.reutersagency.com/feed/', source: 'reuters' },
        { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/rss.xml', source: 'bbc-news' },
        { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', source: 'npr' },
    ]

    // For now, return empty - RSS parsing would need additional library
    console.log('RSS fetching not implemented yet - use NewsAPI')
    return []
}
