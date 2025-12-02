import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, ShieldCheckIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { searchVerifiedNews, verifyContent, formatAddress, getAddressUrl } from '../utils/blockchain'
import { analyzeNewsContent, analyzeNewsImage } from '../utils/factChecker'
import type { ImageAnalysisResult } from '../utils/factChecker'
import { generateContentHash, generateFileHash, hexToBytes32 } from '../utils/hash'
import { DotScreenShader } from '@/components/ui/dot-shader-background'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'

// Blockchain exact match result
interface BlockchainExactMatch {
  found: boolean
  contentHash: string
  publisher: string
  timestamp: number
  contentType: string
  ipfsMetadata: string
}

// Blockchain verification result for images
interface BlockchainImageMatch {
  found: boolean
  contentHash: string
  publisher: string
  timestamp: number
  contentType: string
  ipfsMetadata: string
}

interface SearchMatch {
  title: string
  source: string
  url: string
  publishedAt: string
  contentHash: string
  ipfsMetadata: string
  reliability: string
  similarity: number
}

interface AIAnalysis {
  overallScore: number
  confidence: string
  verdict: 'likely-real' | 'likely-fake' | 'unverified' | 'mixed'
  factChecks: Array<{
    source: string
    claim: string
    rating: string
    url: string
    publisher: string
  }>
  redFlags: string[]
  greenFlags: string[]
  sources: Array<{ name: string; found: boolean; reliability: string }>
  explanation: string
  aiAnalysis: string
  perplexityInsights: string
  relatedArticles: Array<{ title: string; url: string; source: string }>
}

const reliabilityColors: Record<string, string> = {
  'highest': 'bg-green-500',
  'high': 'bg-blue-500',
  'medium-high': 'bg-yellow-500',
  'verified': 'bg-green-500'
}

const reliabilityLabels: Record<string, string> = {
  'highest': '🏆 Wire Service',
  'high': '⭐ Major Outlet',
  'medium-high': '✓ Reliable',
  'verified': '✓ Verified'
}

const verdictConfig = {
  'likely-real': { color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircleIcon, label: '✅ Likely Authentic' },
  'likely-fake': { color: 'text-red-400', bg: 'bg-red-900/30', icon: XCircleIcon, label: '❌ Likely Fake/Misleading' },
  'mixed': { color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: ExclamationTriangleIcon, label: '⚠️ Mixed Signals' },
  'unverified': { color: 'text-gray-400', bg: 'bg-gray-800', icon: MagnifyingGlassIcon, label: '❓ Unable to Verify' }
}

export default function VerificationPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchMatch[] | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<'blockchain' | 'ai'>('blockchain')
  const [exactBlockchainMatch, setExactBlockchainMatch] = useState<BlockchainExactMatch | null>(null)
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null)
  const [verificationMode, setVerificationMode] = useState<'text' | 'image'>('text')
  const [imageBlockchainMatch, setImageBlockchainMatch] = useState<BlockchainImageMatch | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image must be less than 10MB')
        return
      }
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
      setVerificationMode('image')
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setImageAnalysis(null)
    setImageBlockchainMatch(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSearch = async () => {
    // Image verification mode
    if (verificationMode === 'image' && selectedImage) {
      setIsSearching(true)
      setSearchResults(null)
      setAiAnalysis(null)
      setImageAnalysis(null)
      setImageBlockchainMatch(null)
      setHasSearched(true)

      try {
        // Step 1: Check if this exact image is registered on blockchain
        toast.info('Checking blockchain registry...')
        const imageHash = await generateFileHash(selectedImage)
        const bytes32Hash = hexToBytes32(imageHash)
        const blockchainResult = await verifyContent(bytes32Hash)
        
        if (blockchainResult.exists) {
          // Image found on blockchain!
          setImageBlockchainMatch({
            found: true,
            contentHash: bytes32Hash,
            publisher: blockchainResult.publisher,
            timestamp: blockchainResult.timestamp,
            contentType: blockchainResult.contentType,
            ipfsMetadata: blockchainResult.ipfsMetadata
          })
          toast.success('This image is VERIFIED on the blockchain!')
          setActiveTab('blockchain')
          setIsSearching(false)
          return
        }
        
        // Step 2: Image not on blockchain, analyze with AI
        toast.info('Image not found on blockchain. Analyzing with AI...')
        const result = await analyzeNewsImage(selectedImage)
        setImageAnalysis(result)
        setAiAnalysis(result.analysisResult)

        if (result.newsContent) {
          // Also search blockchain for the extracted text content
          const textBlockchainResult = await searchVerifiedNews(result.newsContent)
          setSearchResults(textBlockchainResult.matches)
        }

        if (result.manipulationIndicators.length > 0) {
          toast.warning('Potential image manipulation detected!')
        } else if (result.analysisResult.verdict === 'likely-real') {
          toast.success('Image analysis complete - content appears authentic')
        } else {
          toast.info('Analysis complete - see results below')
        }
        setActiveTab('ai')
      } catch (error) {
        console.error('Image analysis error:', error)
        toast.error('Failed to analyze image')
      } finally {
        setIsSearching(false)
      }
      return
    }

    // Text verification mode
    if (!searchQuery.trim()) {
      toast.error('Please enter news content to verify')
      return
    }

    setIsSearching(true)
    setSearchResults(null)
    setAiAnalysis(null)
    setImageAnalysis(null)
    setExactBlockchainMatch(null)
    setHasSearched(true)

    try {
      // First, check for exact content hash match on blockchain
      const contentHash = generateContentHash(searchQuery.trim())
      const bytes32Hash = hexToBytes32(contentHash)
      
      const exactMatch = await verifyContent(bytes32Hash)
      
      if (exactMatch.exists) {
        // Found exact match on blockchain!
        setExactBlockchainMatch({
          found: true,
          contentHash: bytes32Hash,
          publisher: exactMatch.publisher,
          timestamp: exactMatch.timestamp,
          contentType: exactMatch.contentType,
          ipfsMetadata: exactMatch.ipfsMetadata
        })
        toast.success('✅ Content verified on blockchain! Exact match found.')
        setActiveTab('blockchain')
        
        // Still run AI analysis for additional context
        const aiResult = await analyzeNewsContent(searchQuery)
        setAiAnalysis(aiResult)
      } else {
        // No exact match, do regular search
        const [blockchainResult, aiResult] = await Promise.all([
          searchVerifiedNews(searchQuery),
          analyzeNewsContent(searchQuery)
        ])

        setSearchResults(blockchainResult.matches)
        setAiAnalysis(aiResult)

        if (blockchainResult.found) {
          toast.success(`Found ${blockchainResult.matches.length} similar verified article(s)!`)
          setActiveTab('blockchain')
        } else if (aiResult.verdict !== 'unverified') {
          toast.info('AI analysis complete - see results below')
          setActiveTab('ai')
        } else {
          toast.warning('Limited verification data available')
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Verification failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-4">
      <DotScreenShader />
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Hero Section */}
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
            <MagnifyingGlassIcon className="h-16 w-16 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI-Powered News
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> Verification</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Paste any news headline, article, or claim. We'll check our blockchain registry 
            AND analyze it with AI to detect fake news. <span className="text-cyan-400 font-semibold">100% Free!</span>
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setVerificationMode('text'); clearImage() }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                verificationMode === 'text' 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              📝 Text/Article
            </button>
            <button
              onClick={() => setVerificationMode('image')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                verificationMode === 'image' 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🖼️ Image/Screenshot
            </button>
          </div>

          {verificationMode === 'text' ? (
            <>
              <label className="block text-sm font-semibold mb-2 text-white/80">
                Paste News Content to Verify:
              </label>
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Paste a news headline, article excerpt, or any claim you want to fact-check...

Example: 'Scientists discover new cure for cancer' or paste an entire article"
                className="w-full min-h-[120px] resize-y mb-4 bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold mb-2 text-white/80">
                Upload Screenshot or Image:
              </label>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              
              {!imagePreview ? (
                <motion.div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[200px] border-2 border-dashed border-white/30 rounded-xl p-8 
                             flex flex-col items-center justify-center cursor-pointer
                             hover:border-cyan-400 hover:bg-white/5 transition-all mb-4"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <PhotoIcon className="h-16 w-16 text-white/40 mb-4" />
                  <p className="text-white/70 text-center">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-white/40 text-sm mt-2">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </motion.div>
              ) : (
                <div className="relative mb-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-[300px] object-contain rounded-xl border border-white/20"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-lg text-sm text-white">
                    📁 {selectedImage?.name}
                  </div>
                </div>
              )}
            </>
          )}

          <motion.button
            onClick={handleSearch}
            disabled={isSearching || (verificationMode === 'text' ? !searchQuery.trim() : !selectedImage)}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl 
                       hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 
                       shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSearching ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" color="white" />
                <span className="ml-2">{verificationMode === 'image' ? 'Analyzing Image...' : 'Analyzing...'}</span>
              </div>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ShieldCheckIcon className="h-5 w-5" />
                {verificationMode === 'image' ? 'Verify Screenshot' : 'Verify News'}
              </span>
            )}
          </motion.button>
          <p className="text-xs text-white/50 mt-3 text-center">
            💡 {verificationMode === 'image' 
              ? 'Upload screenshots from social media, news sites, or messaging apps' 
              : 'Works with headlines, full articles, social media posts, or any claim'}
          </p>
        </motion.div>

        {/* Image Blockchain Match - Shows when exact image is found on blockchain */}
        {imageBlockchainMatch?.found && (
          <motion.div
            className="bg-green-900/30 backdrop-blur-sm rounded-2xl border border-green-500/50 p-6 mb-6"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircleIcon className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-400">Verified on Blockchain</h3>
                <p className="text-green-300/70">This exact image was registered by a verified publisher</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">Publisher</p>
                <a
                  href={getAddressUrl(imageBlockchainMatch.publisher)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  {formatAddress(imageBlockchainMatch.publisher)}
                </a>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">Registered On</p>
                <p className="text-white font-semibold">
                  {new Date(imageBlockchainMatch.timestamp * 1000).toLocaleString()}
                </p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">Content Type</p>
                <p className="text-white font-semibold capitalize">{imageBlockchainMatch.contentType}</p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">Content Hash</p>
                <p className="text-cyan-400 font-mono text-sm truncate">{imageBlockchainMatch.contentHash}</p>
              </div>
            </div>
            
            {imageBlockchainMatch.ipfsMetadata && (
              <div className="mt-4">
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${imageBlockchainMatch.ipfsMetadata}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  View Original Metadata on IPFS
                </a>
              </div>
            )}
          </motion.div>
        )}

        {/* Image Analysis Results */}
        {imageAnalysis && (
          <motion.div
            className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-cyan-400" />
              Image Analysis Results
            </h3>
            
            <div className="space-y-4">
              {/* Source Identified */}
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">Source Identified</p>
                <p className="text-white font-semibold">{imageAnalysis.sourceIdentified}</p>
              </div>
              
              {/* Extracted Content */}
              {imageAnalysis.newsContent && (
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-2">Extracted News Content</p>
                  <p className="text-white">{imageAnalysis.newsContent}</p>
                </div>
              )}
              
              {/* Manipulation Warnings */}
              {imageAnalysis.manipulationIndicators.length > 0 && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400 font-semibold mb-2">⚠️ Potential Manipulation Detected</p>
                  <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                    {imageAnalysis.manipulationIndicators.map((indicator, i) => (
                      <li key={i}>{indicator}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Image Flags */}
              {imageAnalysis.imageFlags.length > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                  <p className="text-yellow-400 font-semibold mb-2">🔍 Visual Observations</p>
                  <ul className="list-disc list-inside text-yellow-300 text-sm space-y-1">
                    {imageAnalysis.imageFlags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isSearching ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" color="white" />
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  <motion.button
                    onClick={() => setActiveTab('blockchain')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeTab === 'blockchain'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ⛓️ Blockchain Registry {exactBlockchainMatch?.found && '✓'} {searchResults && searchResults.length > 0 && `(${searchResults.length})`}
                  </motion.button>
                  <motion.button
                    onClick={() => setActiveTab('ai')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeTab === 'ai'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🤖 AI Analysis
                  </motion.button>
                </div>

                {/* Blockchain Results Tab */}
                {activeTab === 'blockchain' && (
                  <>
                    {/* Exact Blockchain Match */}
                    {exactBlockchainMatch?.found && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-6"
                      >
                        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 backdrop-blur-sm rounded-xl border-2 border-green-500 p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                              <ShieldCheckIcon className="h-8 w-8 text-green-400" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-green-400">
                                ✅ Exact Match Found on Blockchain!
                              </h2>
                              <p className="text-green-300/70">This content has been verified and registered</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-black/30 rounded-lg p-4">
                              <p className="text-white/60 text-sm mb-1">Content Hash</p>
                              <p className="text-cyan-400 font-mono text-sm break-all">
                                {exactBlockchainMatch.contentHash}
                              </p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-4">
                              <p className="text-white/60 text-sm mb-1">Registered By</p>
                              <a 
                                href={getAddressUrl(exactBlockchainMatch.publisher)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 font-mono hover:underline"
                              >
                                {formatAddress(exactBlockchainMatch.publisher)}
                              </a>
                            </div>
                            <div className="bg-black/30 rounded-lg p-4">
                              <p className="text-white/60 text-sm mb-1">Registration Time</p>
                              <p className="text-white">
                                {new Date(exactBlockchainMatch.timestamp * 1000).toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-4">
                              <p className="text-white/60 text-sm mb-1">Content Type</p>
                              <p className="text-white capitalize">{exactBlockchainMatch.contentType}</p>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                            <p className="text-green-300 text-sm">
                              <strong>✓ Verified:</strong> This exact content was registered on the blockchain. 
                              The hash matches perfectly, confirming its authenticity and origin.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Similar Results from Search */}
                    {searchResults && searchResults.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center gap-2 mb-6">
                          <CheckCircleIcon className="h-8 w-8 text-green-400" />
                          <h2 className="text-2xl font-bold text-green-400">
                            {exactBlockchainMatch?.found ? 'Similar Articles in Registry' : 'Found in Blockchain Registry!'}
                          </h2>
                        </div>

                        <div className="space-y-4">
                          {searchResults.map((match, index) => (
                            <motion.div 
                              key={match.contentHash || index}
                              className="bg-white/5 backdrop-blur-sm rounded-xl border border-green-500/30 p-5 hover:bg-white/10 transition-all"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                                      reliabilityColors[match.reliability] || 'bg-gray-500'
                                    }`}>
                                      {reliabilityLabels[match.reliability] || 'Verified'}
                                    </span>
                                    <span className="text-sm text-white/60">{match.source}</span>
                                    <span className="text-sm text-white/40">•</span>
                                    <span className="text-sm text-white/60">{formatDate(match.publishedAt)}</span>
                                  </div>

                                  <h3 className="text-lg font-semibold text-white mb-2">
                                    {match.title}
                                  </h3>

                                  <div className="flex items-center gap-4 text-sm">
                                    <span className={`font-medium ${
                                      match.similarity >= 80 ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                      {match.similarity}% match
                                    </span>
                                    <a
                                      href={match.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-cyan-400 hover:underline"
                                    >
                                      Read Original →
                                    </a>
                                  </div>
                                </div>

                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ) : !exactBlockchainMatch?.found ? (
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center">
                        <p className="text-white/60">Not found in blockchain registry. Check the AI Analysis tab for more insights.</p>
                      </div>
                    ) : null}
                  </>
                )}

                {/* AI Analysis Tab */}
                {activeTab === 'ai' && aiAnalysis && (
                  <motion.div
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Verdict Card */}
                    <motion.div
                      className={`bg-white/5 backdrop-blur-sm rounded-xl border p-6 ${
                        aiAnalysis.verdict === 'likely-real' ? 'border-green-500/50' :
                        aiAnalysis.verdict === 'likely-fake' ? 'border-red-500/50' :
                        aiAnalysis.verdict === 'mixed' ? 'border-yellow-500/50' : 'border-white/20'
                      }`}
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className={`text-2xl font-bold ${verdictConfig[aiAnalysis.verdict].color}`}>
                            {verdictConfig[aiAnalysis.verdict].label}
                          </h2>
                          <p className="text-white/60 mt-1">
                            Confidence: <span className="font-medium capitalize text-white/80">{aiAnalysis.confidence}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${getScoreColor(aiAnalysis.overallScore)}`}>
                            {aiAnalysis.overallScore}%
                          </div>
                          <p className="text-sm text-white/50">Credibility Score</p>
                        </div>
                      </div>
                      <p className="mt-4 text-white/70">
                        {aiAnalysis.explanation}
                      </p>
                    </motion.div>

                    {/* Red & Green Flags */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {aiAnalysis.greenFlags.length > 0 && (
                        <motion.div
                          className="bg-green-900/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-5"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5" />
                            Positive Indicators
                          </h3>
                          <ul className="space-y-2">
                            {aiAnalysis.greenFlags.map((flag, i) => (
                              <li key={i} className="text-sm text-green-300 flex items-start gap-2">
                                <span>✓</span>
                                <span>{flag}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {aiAnalysis.redFlags.length > 0 && (
                        <motion.div
                          className="bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-5"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            Warning Signs
                          </h3>
                          <ul className="space-y-2">
                            {aiAnalysis.redFlags.map((flag, i) => (
                              <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                                <span>⚠️</span>
                                <span>{flag}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </div>

                    {/* Trusted Sources Check */}
                    {aiAnalysis.sources.some(s => s.found) && (
                      <motion.div
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
                        <h3 className="font-semibold text-white mb-3">📰 Source References Found</h3>
                        <div className="flex flex-wrap gap-2">
                          {aiAnalysis.sources.filter(s => s.found).map((source, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-500/30">
                              {source.name}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Fact Checks */}
                    {aiAnalysis.factChecks.length > 0 && (
                      <motion.div
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                      >
                        <h3 className="font-semibold text-white mb-3">🔍 Related Fact-Checks</h3>
                        <div className="space-y-3">
                          {aiAnalysis.factChecks.map((fc, i) => (
                            <div key={i} className="p-3 bg-white/5 rounded-lg">
                              <p className="font-medium text-sm text-white">{fc.claim}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                                <span className="font-medium text-white/70">{fc.rating}</span>
                                <span>by {fc.publisher}</span>
                                {fc.url && (
                                  <a href={fc.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                                    View →
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Gemini AI Analysis */}
                    {aiAnalysis.aiAnalysis && (
                      <motion.div
                        className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm rounded-xl border border-purple-500/30 p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.45 }}
                      >
                        <h3 className="font-semibold text-purple-300 mb-3 flex items-center gap-2">
                          <span className="text-xl">🧠</span>
                          Gemini AI Analysis
                        </h3>
                        <p className="text-white/80 text-sm leading-relaxed">{aiAnalysis.aiAnalysis}</p>
                      </motion.div>
                    )}

                    {/* Perplexity Web Search Insights */}
                    {aiAnalysis.perplexityInsights && (
                      <motion.div
                        className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                      >
                        <h3 className="font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                          <span className="text-xl">🌐</span>
                          Perplexity Web Search
                        </h3>
                        <p className="text-white/80 text-sm leading-relaxed">{aiAnalysis.perplexityInsights}</p>
                      </motion.div>
                    )}

                    {/* Related Articles from Perplexity */}
                    {aiAnalysis.relatedArticles && aiAnalysis.relatedArticles.length > 0 && (
                      <motion.div
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.55 }}
                      >
                        <h3 className="font-semibold text-white mb-3">📚 Related Articles Found</h3>
                        <div className="space-y-2">
                          {aiAnalysis.relatedArticles.map((article, i) => (
                            <a
                              key={i}
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition group"
                            >
                              <p className="text-sm text-white group-hover:text-cyan-400 transition">{article.title}</p>
                              <p className="text-xs text-white/40 mt-1">{article.source}</p>
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Disclaimer */}
                    <div className="text-center text-sm text-white/50 p-4 bg-white/5 rounded-lg border border-white/10">
                      ⚠️ AI analysis powered by Gemini & Perplexity. Always verify important news with multiple trusted sources.
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* How It Works */}
        {!hasSearched && (
          <motion.div
            className="grid md:grid-cols-4 gap-6 mt-12"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {[
              { icon: '⛓️', title: 'Blockchain', desc: 'Check our verified news registry', color: 'from-green-500/20 to-emerald-500/20' },
              { icon: '🧠', title: 'Gemini AI', desc: 'Deep content analysis & pattern detection', color: 'from-purple-500/20 to-pink-500/20' },
              { icon: '🌐', title: 'Perplexity', desc: 'Real-time web search verification', color: 'from-cyan-500/20 to-blue-500/20' },
              { icon: '🆓', title: '100% Free', desc: 'No wallet, no fees, no sign-up!', color: 'from-orange-500/20 to-yellow-500/20' }
            ].map((item, index) => (
              <motion.div
                key={index}
                className={`text-center p-6 bg-gradient-to-br ${item.color} backdrop-blur-sm rounded-2xl border border-white/10`}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/60">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
