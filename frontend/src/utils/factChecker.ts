/**
 * Advanced AI Fact-Checking Service
 * Uses Gemini AI + Perplexity API for powerful news verification
 */

// API Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || ''
const GOOGLE_FACT_CHECK_API = 'https://factchecktools.googleapis.com/v1alpha1/claims:search'

interface FactCheckResult {
    source: string
    claim: string
    rating: string
    url: string
    publisher: string
    reviewDate: string
}

export interface AIAnalysisResult {
    overallScore: number
    confidence: string
    verdict: 'likely-real' | 'likely-fake' | 'unverified' | 'mixed'
    factChecks: FactCheckResult[]
    redFlags: string[]
    greenFlags: string[]
    sources: { name: string; found: boolean; reliability: string }[]
    explanation: string
    aiAnalysis: string
    perplexityInsights: string
    relatedArticles: { title: string; url: string; source: string }[]
}

export interface ImageAnalysisResult {
    extractedText: string
    newsContent: string
    isNewsScreenshot: boolean
    sourceIdentified: string
    analysisResult: AIAnalysisResult
    imageFlags: string[]
    manipulationIndicators: string[]
}

/**
 * Main analysis function - uses multiple AI sources
 */
export async function analyzeNewsContent(content: string): Promise<AIAnalysisResult> {
    console.log('📰 Starting news analysis...')
    console.log('📰 Content length:', content.length)
    
    const results: AIAnalysisResult = {
        overallScore: 50,
        confidence: 'low',
        verdict: 'unverified',
        factChecks: [],
        redFlags: [],
        greenFlags: [],
        sources: [],
        explanation: '',
        aiAnalysis: '',
        perplexityInsights: '',
        relatedArticles: []
    }

    try {
        console.log('🚀 Running AI analysis in parallel...')
        
        // Run all AI checks in parallel for speed
        const [geminiResult, perplexityResult, googleFactChecks, patternAnalysis] = await Promise.all([
            analyzeWithGemini(content),
            analyzeWithPerplexity(content),
            checkGoogleFactCheck(content),
            Promise.resolve(analyzeContentPatterns(content))
        ])

        console.log('✅ AI analysis complete!')
        console.log('🤖 Gemini result:', geminiResult)
        console.log('🔍 Perplexity result:', perplexityResult)
        console.log('📋 Google fact checks:', googleFactChecks)
        console.log('🎯 Pattern analysis:', patternAnalysis)

        // Merge Gemini analysis
        if (geminiResult) {
            console.log('✅ Merging Gemini results...')
            results.aiAnalysis = geminiResult.analysis
            results.redFlags.push(...geminiResult.redFlags)
            results.greenFlags.push(...geminiResult.greenFlags)
            results.overallScore = geminiResult.credibilityScore
        } else {
            console.log('⚠️ No Gemini result available')
        }

        // Merge Perplexity insights
        if (perplexityResult) {
            console.log('✅ Merging Perplexity results...')
            results.perplexityInsights = perplexityResult.insights
            results.relatedArticles = perplexityResult.relatedArticles
            results.sources = perplexityResult.sourcesFound
            
            // Adjust score based on Perplexity findings
            if (perplexityResult.verificationStatus === 'verified') {
                results.overallScore = Math.min(100, results.overallScore + 20)
            } else if (perplexityResult.verificationStatus === 'disputed') {
                results.overallScore = Math.max(0, results.overallScore - 20)
            }
        } else {
            console.log('⚠️ No Perplexity result available')
        }

        // Add Google Fact Checks
        results.factChecks = googleFactChecks

        // Merge pattern analysis
        results.redFlags.push(...patternAnalysis.redFlags)
        results.greenFlags.push(...patternAnalysis.greenFlags)

        // Remove duplicates
        results.redFlags = [...new Set(results.redFlags)]
        results.greenFlags = [...new Set(results.greenFlags)]

        // Calculate final verdict
        const finalScore = calculateFinalScore(results)
        results.overallScore = finalScore.score
        results.confidence = finalScore.confidence
        results.verdict = finalScore.verdict
        results.explanation = generateExplanation(results)

        return results
    } catch (error) {
        console.error('AI Analysis error:', error)
        // Fallback to pattern-only analysis
        const patternAnalysis = analyzeContentPatterns(content)
        results.redFlags = patternAnalysis.redFlags
        results.greenFlags = patternAnalysis.greenFlags
        results.explanation = 'AI services unavailable. Analysis based on content patterns only.'
        return results
    }
}

/**
 * Gemini AI Analysis - Deep content analysis
 */
async function analyzeWithGemini(content: string): Promise<{
    analysis: string
    redFlags: string[]
    greenFlags: string[]
    credibilityScore: number
} | null> {
    if (!GEMINI_API_KEY) {
        console.warn('❌ Gemini API key not configured')
        return null
    }

    console.log('🧠 Calling Gemini API...')
    
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an expert fact-checker. Analyze this news headline/content and determine if it's likely real or fake news.

NEWS TO VERIFY:
"${content}"

Search your knowledge to verify if this news is real. Check if:
1. This event actually happened
2. Major news outlets reported on this
3. The claims are factually accurate

Respond in this EXACT JSON format only (no markdown):
{
    "credibilityScore": <number 0-100>,
    "analysis": "<your detailed analysis of whether this news is real or fake>",
    "redFlags": ["<any concerning signs>"],
    "greenFlags": ["<any positive credibility signs>"],
    "isReal": <true or false>,
    "reasoning": "<why you believe this>"
}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1024
                    }
                })
            }
        )

        console.log('🧠 Gemini response status:', response.status)
        clearTimeout(timeoutId)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Gemini API error:', errorText)
            throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json()
        console.log('🧠 Gemini raw response:', JSON.stringify(data).slice(0, 500))
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        console.log('🧠 Gemini text:', text.slice(0, 300))
        
        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0])
                console.log('✅ Gemini parsed successfully:', parsed)
                return {
                    analysis: parsed.analysis || '',
                    redFlags: parsed.redFlags || [],
                    greenFlags: parsed.greenFlags || [],
                    credibilityScore: parsed.credibilityScore || 50
                }
            } catch (parseError) {
                console.error('❌ Gemini JSON parse error:', parseError)
            }
        } else {
            console.log('⚠️ Gemini: No JSON found in response')
        }
        
        return null
    } catch (error) {
        console.error('❌ Gemini analysis error:', error)
        return null
    }
}

/**
 * Perplexity AI Analysis - Real-time web search and verification
 */
async function analyzeWithPerplexity(content: string): Promise<{
    insights: string
    relatedArticles: { title: string; url: string; source: string }[]
    sourcesFound: { name: string; found: boolean; reliability: string }[]
    verificationStatus: 'verified' | 'disputed' | 'unverified'
} | null> {
    console.log('🔍 Perplexity: Starting analysis...')
    console.log('🔍 Perplexity API Key present:', PERPLEXITY_API_KEY ? 'YES (length: ' + PERPLEXITY_API_KEY.length + ')' : 'NO')
    
    if (!PERPLEXITY_API_KEY) {
        console.warn('❌ Perplexity API key not configured')
        return null
    }

    try {
        console.log('🔍 Perplexity: Making API request...')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: `You are a fact-checking assistant with access to real-time web search. Your job is to verify news claims by searching for corroborating or contradicting sources. Always cite your sources.`
                    },
                    {
                        role: 'user',
                        content: `Verify this news claim/article by searching the web for related information:

"${content}"

Respond in this EXACT JSON format:
{
    "verificationStatus": "<verified|disputed|unverified>",
    "insights": "<summary of what you found from searching the web>",
    "sourcesFound": [
        {"name": "<source name>", "found": true, "reliability": "<high|medium|low>"}
    ],
    "relatedArticles": [
        {"title": "<article title>", "url": "<url>", "source": "<publisher>"}
    ],
    "contradictions": ["<any contradicting information found>"],
    "corroborations": ["<any supporting information found>"]
}`
                    }
                ],
                max_tokens: 1024,
                temperature: 0.2
            })
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Perplexity API error:', response.status, errorText)
            throw new Error(`Perplexity API error: ${response.status}`)
        }

        console.log('🔍 Perplexity: Got response, parsing...')
        const data = await response.json()
        console.log('🔍 Perplexity: Raw response:', JSON.stringify(data).slice(0, 500))
        
        const text = data.choices?.[0]?.message?.content || ''
        console.log('🔍 Perplexity: Extracted text:', text.slice(0, 300))
        
        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            console.log('✅ Perplexity: Parsed result:', parsed)
            return {
                insights: parsed.insights || '',
                relatedArticles: parsed.relatedArticles || [],
                sourcesFound: parsed.sourcesFound || [],
                verificationStatus: parsed.verificationStatus || 'unverified'
            }
        }
        
        console.log('⚠️ Perplexity: No JSON found, using raw text')
        // If no JSON, extract insights from text
        return {
            insights: text.slice(0, 500),
            relatedArticles: [],
            sourcesFound: [],
            verificationStatus: 'unverified'
        }
    } catch (error) {
        console.error('❌ Perplexity analysis error:', error)
        return null
    }
}

/**
 * Google Fact Check API
 */
async function checkGoogleFactCheck(content: string): Promise<FactCheckResult[]> {
    try {
        // Extract key claims from content
        const searchQuery = content.slice(0, 200).replace(/[^\w\s]/g, ' ')
        
        const response = await fetch(
            `${GOOGLE_FACT_CHECK_API}?query=${encodeURIComponent(searchQuery)}&languageCode=en`
        )

        if (!response.ok) return []

        const data = await response.json()
        
        if (!data.claims) return []

        return data.claims.slice(0, 5).map((claim: {
            text?: string
            claimReview?: Array<{
                publisher?: { name?: string; site?: string }
                url?: string
                textualRating?: string
                reviewDate?: string
            }>
        }) => ({
            claim: claim.text || '',
            source: claim.claimReview?.[0]?.publisher?.name || 'Unknown',
            rating: claim.claimReview?.[0]?.textualRating || 'Unrated',
            url: claim.claimReview?.[0]?.url || '',
            publisher: claim.claimReview?.[0]?.publisher?.site || '',
            reviewDate: claim.claimReview?.[0]?.reviewDate || ''
        }))
    } catch (error) {
        console.error('Google Fact Check error:', error)
        return []
    }
}

/**
 * Pattern-based content analysis (fallback/supplement)
 */
function analyzeContentPatterns(content: string): {
    redFlags: string[]
    greenFlags: string[]
} {
    const redFlags: string[] = []
    const greenFlags: string[] = []
    const lowerContent = content.toLowerCase()

    // Red flag patterns
    const sensationalistPatterns = [
        { pattern: /BREAKING|SHOCKING|URGENT|EXPLOSIVE/i, flag: 'Uses sensationalist language (BREAKING, SHOCKING, etc.)' },
        { pattern: /you won't believe|doctors hate|this one trick/i, flag: 'Contains clickbait phrases' },
        { pattern: /exposed|bombshell|scandal/i, flag: 'Uses emotionally charged words' },
        { pattern: /!!!+|\?\?\?+/g, flag: 'Excessive punctuation (multiple ! or ?)' },
        { pattern: /100% (true|proven|confirmed)/i, flag: 'Claims absolute certainty' },
        { pattern: /mainstream media (won't|doesn't|refuses)/i, flag: 'Uses anti-establishment rhetoric' },
        { pattern: /they don't want you to know/i, flag: 'Conspiracy-style language' },
        { pattern: /miracle|cure-all|secret/i, flag: 'Uses miracle/secret claims' },
        { pattern: /exposed\s+the\s+truth/i, flag: '"Exposing the truth" narrative' }
    ]

    // Check ALL CAPS ratio
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (capsRatio > 0.3 && content.length > 50) {
        redFlags.push('Excessive use of CAPITAL LETTERS')
    }

    sensationalistPatterns.forEach(({ pattern, flag }) => {
        if (pattern.test(content)) {
            redFlags.push(flag)
        }
    })

    // Green flag patterns
    const credibilityPatterns = [
        { pattern: /according to|reported by|stated/i, flag: 'Attributes information to sources' },
        { pattern: /study|research|data|statistics/i, flag: 'References studies or data' },
        { pattern: /(reuters|associated press|ap news|bbc|npr|afp)/i, flag: 'Mentions reputable news agencies' },
        { pattern: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},? \d{4}/i, flag: 'Contains specific dates' },
        { pattern: /"[^"]+"\s*(said|stated|told|explained)/i, flag: 'Includes direct quotes with attribution' },
        { pattern: /professor|researcher|scientist|expert/i, flag: 'References experts or professionals' },
        { pattern: /university|institute|organization/i, flag: 'Mentions institutions' },
        { pattern: /percent|percentage|\d+%/i, flag: 'Uses specific statistics' }
    ]

    credibilityPatterns.forEach(({ pattern, flag }) => {
        if (pattern.test(content)) {
            greenFlags.push(flag)
        }
    })

    // Check for balanced language
    const opinionWords = /i think|i believe|in my opinion|personally/i
    if (!opinionWords.test(lowerContent) && content.length > 100) {
        greenFlags.push('Uses objective language (not personal opinion)')
    }

    // Check content length
    if (content.length > 500) {
        greenFlags.push('Substantial content length (not just a headline)')
    }

    return { redFlags, greenFlags }
}

/**
 * Calculate final credibility score
 */
function calculateFinalScore(results: AIAnalysisResult): {
    score: number
    confidence: string
    verdict: 'likely-real' | 'likely-fake' | 'unverified' | 'mixed'
} {
    let score = results.overallScore
    
    // Adjust based on fact checks
    if (results.factChecks.length > 0) {
        const ratings = results.factChecks.map(fc => fc.rating.toLowerCase())
        if (ratings.some(r => r.includes('false') || r.includes('fake') || r.includes('misleading'))) {
            score -= 30
        }
        if (ratings.some(r => r.includes('true') || r.includes('correct') || r.includes('accurate'))) {
            score += 20
        }
    }

    // Adjust based on flags
    score -= results.redFlags.length * 5
    score += results.greenFlags.length * 3

    // Adjust based on related articles found
    if (results.relatedArticles.length >= 3) {
        score += 10
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score))

    // Determine confidence
    let confidence: string
    const dataPoints = [
        results.aiAnalysis ? 1 : 0,
        results.perplexityInsights ? 1 : 0,
        results.factChecks.length > 0 ? 1 : 0,
        results.relatedArticles.length > 0 ? 1 : 0
    ].reduce((a, b) => a + b, 0)

    if (dataPoints >= 3) confidence = 'high'
    else if (dataPoints >= 2) confidence = 'medium'
    else confidence = 'low'

    // Determine verdict
    let verdict: 'likely-real' | 'likely-fake' | 'unverified' | 'mixed'
    if (score >= 70) verdict = 'likely-real'
    else if (score <= 30) verdict = 'likely-fake'
    else if (dataPoints >= 2) verdict = 'mixed'
    else verdict = 'unverified'

    return { score, confidence, verdict }
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(results: AIAnalysisResult): string {
    const parts: string[] = []

    // AI analysis summary
    if (results.aiAnalysis) {
        parts.push(results.aiAnalysis)
    }

    // Perplexity insights
    if (results.perplexityInsights) {
        parts.push(`Web search: ${results.perplexityInsights}`)
    }

    // Fact check summary
    if (results.factChecks.length > 0) {
        const ratings = results.factChecks.map(fc => `${fc.publisher}: ${fc.rating}`).join(', ')
        parts.push(`Fact-checks found: ${ratings}`)
    }

    // Source verification
    const verifiedSources = results.sources.filter(s => s.found && s.reliability === 'high')
    if (verifiedSources.length > 0) {
        parts.push(`Corroborated by: ${verifiedSources.map(s => s.name).join(', ')}`)
    }

    if (parts.length === 0) {
        return 'Limited information available for verification. Please verify with additional trusted sources.'
    }

    return parts.join(' | ')
}

/**
 * Quick check function for simple verification
 */
export async function quickFactCheck(claim: string): Promise<{
    isLikelyTrue: boolean
    confidence: number
    summary: string
}> {
    if (GEMINI_API_KEY) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Quick fact check this claim. Respond with JSON only:
Claim: "${claim}"

{"isLikelyTrue": true/false, "confidence": 0-100, "summary": "<one sentence explanation>"}`
                            }]
                        }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
                    })
                }
            )

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const match = text.match(/\{[\s\S]*\}/)
            if (match) {
                return JSON.parse(match[0])
            }
        } catch (error) {
            console.error('Quick fact check error:', error)
        }
    }

    return {
        isLikelyTrue: false,
        confidence: 0,
        summary: 'Unable to verify - AI service unavailable'
    }
}

/**
 * Analyze image/screenshot for fake news detection using Gemini Vision
 */
export async function analyzeNewsImage(imageFile: File): Promise<ImageAnalysisResult> {
    console.log('🖼️ Starting image analysis...')
    console.log('🖼️ File:', imageFile.name, 'Size:', imageFile.size)
    
    const defaultResult: ImageAnalysisResult = {
        extractedText: '',
        newsContent: '',
        isNewsScreenshot: false,
        sourceIdentified: 'Unknown',
        analysisResult: {
            overallScore: 50,
            confidence: 'low',
            verdict: 'unverified',
            factChecks: [],
            redFlags: [],
            greenFlags: [],
            sources: [],
            explanation: 'Unable to analyze image',
            aiAnalysis: '',
            perplexityInsights: '',
            relatedArticles: []
        },
        imageFlags: [],
        manipulationIndicators: []
    }

    if (!GEMINI_API_KEY) {
        console.error('❌ Gemini API key not configured for image analysis')
        return defaultResult
    }

    try {
        // Convert image to base64
        const base64Image = await fileToBase64(imageFile)
        const mimeType = imageFile.type || 'image/jpeg'
        
        console.log('🖼️ Sending image to Gemini Vision...')
        
        // First, extract text and analyze the image
        const extractionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image
                                }
                            },
                            {
                                text: `Analyze this image which may be a screenshot of a news article, social media post, or news-related content.

Extract and analyze the following:
1. All text visible in the image
2. The main news claim or headline
3. The source/publisher if visible
4. Any signs of image manipulation or editing
5. Whether this appears to be a legitimate news screenshot

Respond in this EXACT JSON format:
{
    "extractedText": "<all text visible in the image>",
    "mainHeadline": "<the main news headline or claim>",
    "newsContent": "<full news content if visible>",
    "isNewsScreenshot": true/false,
    "sourceIdentified": "<source name like CNN, BBC, Twitter, Facebook, etc. or 'Unknown'>",
    "platform": "<website, twitter, facebook, whatsapp, etc.>",
    "imageFlags": ["<any concerning visual elements>"],
    "manipulationIndicators": ["<signs of editing, cropping, or manipulation>"],
    "visualCredibilityScore": <0-100>,
    "observations": "<your observations about the image authenticity>"
}`
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 2048
                    }
                })
            }
        )

        if (!extractionResponse.ok) {
            const errorText = await extractionResponse.text()
            console.error('❌ Gemini Vision error:', errorText)
            throw new Error('Image analysis failed')
        }

        const extractionData = await extractionResponse.json()
        const extractionText = extractionData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        console.log('🖼️ Extraction response:', extractionText.slice(0, 300))

        // Parse the extraction result
        const jsonMatch = extractionText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('❌ No JSON in image analysis response')
            return defaultResult
        }

        const imageAnalysis = JSON.parse(jsonMatch[0])
        console.log('✅ Image analysis parsed:', imageAnalysis)

        // Now fact-check the extracted news content
        const newsToVerify = imageAnalysis.mainHeadline || imageAnalysis.newsContent || imageAnalysis.extractedText
        
        let factCheckResult: AIAnalysisResult = defaultResult.analysisResult
        
        if (newsToVerify && newsToVerify.length > 10) {
            console.log('🔍 Fact-checking extracted content:', newsToVerify.slice(0, 100))
            factCheckResult = await analyzeNewsContent(newsToVerify)
        }

        // Combine image analysis with fact-check results
        const combinedResult: ImageAnalysisResult = {
            extractedText: imageAnalysis.extractedText || '',
            newsContent: imageAnalysis.mainHeadline || imageAnalysis.newsContent || '',
            isNewsScreenshot: imageAnalysis.isNewsScreenshot || false,
            sourceIdentified: imageAnalysis.sourceIdentified || 'Unknown',
            analysisResult: {
                ...factCheckResult,
                // Adjust score based on image analysis
                overallScore: Math.round(
                    (factCheckResult.overallScore * 0.7) + 
                    ((imageAnalysis.visualCredibilityScore || 50) * 0.3)
                ),
                redFlags: [
                    ...factCheckResult.redFlags,
                    ...imageAnalysis.imageFlags || [],
                    ...imageAnalysis.manipulationIndicators || []
                ],
                greenFlags: [
                    ...factCheckResult.greenFlags,
                    ...(imageAnalysis.isNewsScreenshot ? ['Appears to be legitimate screenshot'] : []),
                    ...(imageAnalysis.sourceIdentified !== 'Unknown' ? [`Source identified: ${imageAnalysis.sourceIdentified}`] : [])
                ]
            },
            imageFlags: imageAnalysis.imageFlags || [],
            manipulationIndicators: imageAnalysis.manipulationIndicators || []
        }

        // Adjust verdict if manipulation detected
        if (combinedResult.manipulationIndicators.length > 0) {
            combinedResult.analysisResult.verdict = 'likely-fake'
            combinedResult.analysisResult.explanation = 
                `Image manipulation detected: ${combinedResult.manipulationIndicators.join(', ')}. ` + 
                combinedResult.analysisResult.explanation
        }

        console.log('✅ Combined analysis complete:', combinedResult)
        return combinedResult

    } catch (error) {
        console.error('❌ Image analysis error:', error)
        return defaultResult
    }
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
