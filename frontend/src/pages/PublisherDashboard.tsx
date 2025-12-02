import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { CloudArrowUpIcon, DocumentCheckIcon, WalletIcon } from '@heroicons/react/24/outline'
import { getCurrentAccount, registerContent, getPublisherContent, getContentDetails, getEtherscanUrl, connectWallet } from '../utils/blockchain'
import { generateContentHash, generateFileHash, hexToBytes32 } from '../utils/hash'
import { uploadFileToIPFS, uploadJSONToIPFS } from '../utils/ipfs'
import { DotScreenShader } from '@/components/ui/dot-shader-background'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'

interface RegisteredContentItem {
    exists: boolean
    contentHash: string
    publisher: string
    timestamp: number
    contentType: string
    ipfsMetadata: string
}

export default function PublisherDashboard() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [contentInput, setContentInput] = useState('')
    const [contentType, setContentType] = useState<'article' | 'image' | 'video'>('article')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isRegistering, setIsRegistering] = useState(false)
    const [registeredContent, setRegisteredContent] = useState<RegisteredContentItem[]>([])
    const [isLoadingContent, setIsLoadingContent] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)

    const loadPublisherContent = useCallback(async (address: string) => {
        setIsLoadingContent(true)
        try {
            const hashes = await getPublisherContent(address)
            const contentDetails = await Promise.all(
                hashes.map(async (hash: string) => {
                    const details = await getContentDetails(hash)
                    return details
                })
            )
            setRegisteredContent(contentDetails.filter((c: { exists: boolean }) => c.exists))
        } catch (error) {
            console.error('Failed to load content:', error)
        } finally {
            setIsLoadingContent(false)
        }
    }, [])

    useEffect(() => {
        const checkConnection = async () => {
            const account = await getCurrentAccount()
            setWalletAddress(account)
            if (account) {
                loadPublisherContent(account)
            }
        }
        checkConnection()
    }, [loadPublisherContent])

    const handleConnect = async () => {
        setIsConnecting(true)
        try {
            const address = await connectWallet()
            setWalletAddress(address)
            loadPublisherContent(address)
            toast.success('Wallet connected!')
        } catch (error) {
            console.error('Failed to connect:', error)
            toast.error('Failed to connect wallet')
        } finally {
            setIsConnecting(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            if (file.type.startsWith('image/')) {
                setContentType('image')
            } else if (file.type.startsWith('video/')) {
                setContentType('video')
            }
        }
    }

    const handleRegister = async () => {
        if (!walletAddress) {
            toast.error('Please connect your wallet first')
            return
        }

        if (!contentInput && !selectedFile) {
            toast.error('Please enter content or upload a file')
            return
        }

        setIsRegistering(true)

        try {
            toast.info('Generating content hash...')
            const hash = selectedFile
                ? await generateFileHash(selectedFile)
                : generateContentHash(contentInput)

            const bytes32Hash = hexToBytes32(hash)

            toast.info('Uploading to IPFS...')
            let ipfsHash: string

            if (selectedFile) {
                ipfsHash = await uploadFileToIPFS(selectedFile)
            } else {
                const metadata = {
                    originalContent: contentInput,
                    contentType,
                    timestamp: Date.now(),
                    hash
                }
                ipfsHash = await uploadJSONToIPFS(metadata)
            }

            toast.info('Registering on blockchain... Please confirm transaction')
            const txHash = await registerContent(bytes32Hash, contentType, ipfsHash)

            toast.success(
                <div>
                    <p>Content registered successfully!</p>
                    <a
                        href={getEtherscanUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-sm"
                    >
                        View on Etherscan
                    </a>
                </div>,
                { autoClose: 10000 }
            )

            setContentInput('')
            setSelectedFile(null)

            if (walletAddress) {
                setTimeout(() => loadPublisherContent(walletAddress), 3000)
            }

        } catch (error: unknown) {
            console.error('Registration error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            toast.error('Registration failed: ' + errorMessage)
        } finally {
            setIsRegistering(false)
        }
    }

    if (!walletAddress) {
        return (
            <div className="relative min-h-screen pt-24 flex items-center justify-center px-4">
                <DotScreenShader />
                <motion.div
                    className="text-center max-w-md"
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
                        <WalletIcon className="h-20 w-20 text-cyan-400" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
                    <p className="text-white/60 mb-8">
                        Connect your MetaMask wallet to register content on the blockchain
                    </p>
                    <motion.button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl 
                                   hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 
                                   shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isConnecting ? (
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" color="white" />
                                <span>Connecting...</span>
                            </div>
                        ) : (
                            'Connect MetaMask'
                        )}n                    </motion.button>
                </motion.div>
            </div>
        )
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
                        <CloudArrowUpIcon className="h-16 w-16 text-cyan-400" />
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Publisher
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"> Dashboard</span>
                    </h1>
                    <p className="text-white/60">
                        Connected: <code className="text-cyan-400">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</code>
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Registration Form */}
                    <motion.div
                        className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <CloudArrowUpIcon className="h-7 w-7 text-cyan-400" />
                            Register New Content
                        </h2>

                        {/* Content Type Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold mb-2 text-white/80">Content Type</label>
                            <div className="flex gap-2">
                                {(['article', 'image', 'video'] as const).map((type) => (
                                    <motion.button
                                        key={type}
                                        onClick={() => setContentType(type)}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition capitalize ${
                                            contentType === type
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {type}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Text Input for Articles */}
                        {contentType === 'article' && !selectedFile && (
                            <div className="mb-6">
                                <label className="block text-sm font-semibold mb-2 text-white/80">Article Content</label>
                                <textarea
                                    value={contentInput}
                                    onChange={(e) => setContentInput(e.target.value)}
                                    placeholder="Paste your article content here..."
                                    className="w-full min-h-[200px] resize-y bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* File Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold mb-2 text-white/80">
                                {contentType === 'article' ? 'Or Upload a File' : 'Upload File'}
                            </label>
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                    accept={contentType === 'image' ? 'image/*' : contentType === 'video' ? 'video/*' : '*/*'}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <CloudArrowUpIcon className="h-12 w-12 text-white/40 mx-auto mb-2" />
                                    <p className="text-white/60">
                                        {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Register Button */}
                        <motion.button
                            onClick={handleRegister}
                            disabled={isRegistering || (!contentInput && !selectedFile)}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl 
                                       hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 
                                       shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isRegistering ? (
                                <div className="flex items-center justify-center gap-2">
                                    <LoadingSpinner size="sm" color="white" />
                                    <span>Registering...</span>
                                </div>
                            ) : (
                                'Register on Blockchain'
                            )}
                        </motion.button>

                        <p className="text-xs text-white/40 mt-3 text-center">
                            ⚠️ Requires Sepolia ETH for gas fees
                        </p>
                    </motion.div>

                    {/* Registered Content */}
                    <motion.div
                        className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <DocumentCheckIcon className="h-7 w-7 text-cyan-400" />
                            Your Registered Content
                        </h2>

                        {isLoadingContent ? (
                            <div className="flex justify-center py-12">
                                <LoadingSpinner size="lg" color="white" />
                            </div>
                        ) : registeredContent.length > 0 ? (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {registeredContent.map((item, index) => (
                                    <motion.div
                                        key={item.contentHash}
                                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                item.contentType === 'article' ? 'bg-green-500/20 text-green-400' :
                                                item.contentType === 'image' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-purple-500/20 text-purple-400'
                                            }`}>
                                                {item.contentType}
                                            </span>
                                            <span className="text-white/40 text-xs">
                                                {new Date(item.timestamp * 1000).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-white/60 text-sm font-mono truncate">
                                            {item.contentHash}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <DocumentCheckIcon className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <p className="text-white/40">No content registered yet</p>
                                <p className="text-white/30 text-sm mt-2">
                                    Register your first piece of content to see it here
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
