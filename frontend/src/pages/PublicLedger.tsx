import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { MagnifyingGlassIcon, BookOpenIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { getAllRegisteredContent, formatAddress, getAddressUrl } from '../utils/blockchain'
import { DotScreenShader } from '@/components/ui/dot-shader-background'
import LoadingSpinner from '../components/LoadingSpinner'

interface ContentItem {
  contentHash: string
  contentType: string
  publisher: string
  timestamp: number
  ipfsMetadata: string
}

export default function PublicLedger() {
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadAllContent()
  }, [])

  useEffect(() => {
    let filtered = allContent

    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.contentType === filterType)
    }

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.contentHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.publisher.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredContent(filtered)
  }, [searchTerm, filterType, allContent])

  const loadAllContent = async () => {
    setIsLoading(true)
    try {
      const content = await getAllRegisteredContent()
      setAllContent(content)
      setFilteredContent(content)
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-4">
      <DotScreenShader />
      <div className="relative z-10 max-w-7xl mx-auto">
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
            <BookOpenIcon className="h-16 w-16 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Public
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> Ledger</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Transparent record of all registered content on the blockchain
          </p>
        </motion.div>

        {/* Statistics */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {[
            { value: allContent.length, label: 'Total Registrations', color: 'text-cyan-400' },
            { value: allContent.filter(c => c.contentType === 'article').length, label: 'Articles', color: 'text-green-400' },
            { value: allContent.filter(c => c.contentType === 'image').length, label: 'Images', color: 'text-blue-400' },
            { value: allContent.filter(c => c.contentType === 'video').length, label: 'Videos', color: 'text-purple-400' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-white/60">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="text"
                placeholder="Search by content hash or publisher address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {['all', 'article', 'image', 'video'].map((type) => (
                <motion.button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                    filterType === type
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {type === 'all' ? 'All Types' : type}
                </motion.button>
              ))}
              
              {/* Refresh Button */}
              <motion.button
                onClick={loadAllContent}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium bg-white/10 text-white/70 hover:bg-white/20 transition flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <LoadingSpinner size="lg" color="white" />
            <p className="text-white/60 mt-4">Loading blockchain data...</p>
          </motion.div>
        )}

        {/* Content Table */}
        {!isLoading && (
          <motion.div
            className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left text-white/60 font-medium py-4 px-6">Content Hash</th>
                    <th className="text-left text-white/60 font-medium py-4 px-6">Type</th>
                    <th className="text-left text-white/60 font-medium py-4 px-6">Publisher</th>
                    <th className="text-left text-white/60 font-medium py-4 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContent.length > 0 ? (
                    filteredContent.map((item, index) => (
                      <motion.tr
                        key={item.contentHash}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="py-4 px-6">
                          <code className="text-cyan-400 text-sm">{item.contentHash.slice(0, 20)}...</code>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.contentType === 'article' ? 'bg-green-500/20 text-green-400' :
                            item.contentType === 'image' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {item.contentType}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <a
                            href={getAddressUrl(item.publisher)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/70 hover:text-cyan-400 transition"
                          >
                            {formatAddress(item.publisher)}
                          </a>
                        </td>
                        <td className="py-4 px-6 text-white/60">
                          {new Date(item.timestamp * 1000).toLocaleString()}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-white/40">
                        {allContent.length === 0 
                          ? 'No content registered yet. Be the first to register content!'
                          : 'No content matches your search criteria.'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Info */}
        <motion.div
          className="mt-8 text-center text-white/40 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p>All data is stored immutably on the Ethereum Sepolia blockchain</p>
        </motion.div>
      </div>
    </div>
  )
}
