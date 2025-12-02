/**
 * Trusted News Sources Configuration
 * These are verified, reputable news organizations
 */

export const TRUSTED_SOURCES = {
    // Major Wire Services (Most Reliable)
    'reuters': {
        name: 'Reuters',
        domain: 'reuters.com',
        reliability: 'highest',
        category: 'wire-service'
    },
    'associated-press': {
        name: 'Associated Press',
        domain: 'apnews.com', 
        reliability: 'highest',
        category: 'wire-service'
    },
    'afp': {
        name: 'AFP (Agence France-Presse)',
        domain: 'afp.com',
        reliability: 'highest',
        category: 'wire-service'
    },

    // Major International News
    'bbc-news': {
        name: 'BBC News',
        domain: 'bbc.com',
        reliability: 'high',
        category: 'international'
    },
    'the-guardian': {
        name: 'The Guardian',
        domain: 'theguardian.com',
        reliability: 'high',
        category: 'international'
    },
    'al-jazeera-english': {
        name: 'Al Jazeera English',
        domain: 'aljazeera.com',
        reliability: 'high',
        category: 'international'
    },

    // Major US News
    'the-new-york-times': {
        name: 'The New York Times',
        domain: 'nytimes.com',
        reliability: 'high',
        category: 'us-news'
    },
    'the-washington-post': {
        name: 'The Washington Post',
        domain: 'washingtonpost.com',
        reliability: 'high',
        category: 'us-news'
    },
    'npr': {
        name: 'NPR',
        domain: 'npr.org',
        reliability: 'high',
        category: 'us-news'
    },

    // Tech News
    'wired': {
        name: 'Wired',
        domain: 'wired.com',
        reliability: 'high',
        category: 'tech'
    },
    'ars-technica': {
        name: 'Ars Technica',
        domain: 'arstechnica.com',
        reliability: 'high',
        category: 'tech'
    },
    'the-verge': {
        name: 'The Verge',
        domain: 'theverge.com',
        reliability: 'medium-high',
        category: 'tech'
    },

    // Business News
    'bloomberg': {
        name: 'Bloomberg',
        domain: 'bloomberg.com',
        reliability: 'high',
        category: 'business'
    },
    'financial-times': {
        name: 'Financial Times',
        domain: 'ft.com',
        reliability: 'high',
        category: 'business'
    },

    // Science News
    'national-geographic': {
        name: 'National Geographic',
        domain: 'nationalgeographic.com',
        reliability: 'high',
        category: 'science'
    },
    'new-scientist': {
        name: 'New Scientist',
        domain: 'newscientist.com',
        reliability: 'high',
        category: 'science'
    }
}

// Get source IDs for NewsAPI
export const getSourceIds = () => Object.keys(TRUSTED_SOURCES).join(',')

// Get source info by ID
export const getSourceInfo = (sourceId) => TRUSTED_SOURCES[sourceId] || null

// Check if source is trusted
export const isTrustedSource = (sourceId) => sourceId in TRUSTED_SOURCES
