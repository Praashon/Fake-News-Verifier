import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AnimeNavBar } from './components/ui/anime-navbar'
import { Home, Search, Upload, BookOpen, Newspaper } from 'lucide-react'
import Landing from './pages/Landing'
import PublisherDashboard from './pages/PublisherDashboard'
import VerificationPortal from './pages/VerificationPortal'
import PublicLedger from './pages/PublicLedger'
import NewsFeed from './pages/NewsFeed'

const navItems = [
  { name: 'Home', url: '/', icon: Home },
  { name: 'News', url: '/news', icon: Newspaper },
  { name: 'Verify', url: '/verify', icon: Search },
  { name: 'Publish', url: '/publish', icon: Upload },
  { name: 'Ledger', url: '/ledger', icon: BookOpen },
]

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <AnimeNavBar items={navItems} defaultActive="Home" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/news" element={<NewsFeed />} />
          <Route path="/verify" element={<VerificationPortal />} />
          <Route path="/publish" element={<PublisherDashboard />} />
          <Route path="/ledger" element={<PublicLedger />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  )
}

export default App
