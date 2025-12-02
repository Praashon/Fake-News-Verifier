import { motion } from "motion/react"
import { Link } from "react-router-dom"
import { DotScreenShader } from "@/components/ui/dot-shader-background"
import { ShieldCheckIcon, DocumentMagnifyingGlassIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline"

export default function Landing() {
    return (
        <div className="relative min-h-screen pt-20">
            <DotScreenShader />
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
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
                        <ShieldCheckIcon className="h-20 w-20 text-cyan-400" />
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tighter mb-6">
                        Fake News
                        <br />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Verifier
                        </span>
                    </h1>
                    
                    <p className="text-lg md:text-xl lg:text-2xl text-white/70 max-w-2xl mx-auto mb-8">
                        Blockchain-powered content verification platform. 
                        Verify authenticity, fight misinformation.
                    </p>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                    className="flex flex-col sm:flex-row gap-4 mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    <Link
                        to="/verify"
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl 
                                   hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 
                                   shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                    >
                        Verify Content
                    </Link>
                    <Link
                        to="/publish"
                        className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl 
                                   border border-white/20 hover:bg-white/20 transition-all duration-300"
                    >
                        Register Content
                    </Link>
                </motion.div>

                {/* Features */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <FeatureCard
                        icon={<DocumentMagnifyingGlassIcon className="h-8 w-8" />}
                        title="Instant Verification"
                        description="Check if content is registered on the blockchain by trusted publishers"
                    />
                    <FeatureCard
                        icon={<CloudArrowUpIcon className="h-8 w-8" />}
                        title="Secure Registration"
                        description="Publishers can register their content with immutable blockchain records"
                    />
                    <FeatureCard
                        icon={<ShieldCheckIcon className="h-8 w-8" />}
                        title="Decentralized Trust"
                        description="No central authority - verification powered by Ethereum blockchain"
                    />
                </motion.div>
            </div>
        </div>
    )
}

function FeatureCard({ 
    icon, 
    title, 
    description 
}: { 
    icon: React.ReactNode
    title: string
    description: string 
}) {
    return (
        <motion.div
            className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 
                       hover:bg-white/10 transition-all duration-300"
            whileHover={{ scale: 1.02, y: -5 }}
        >
            <div className="text-cyan-400 mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-white/60">{description}</p>
        </motion.div>
    )
}
