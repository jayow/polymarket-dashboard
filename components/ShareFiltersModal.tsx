'use client'

import { useState, useEffect, useRef } from 'react'
import { getShareableURL, formatFilterDisplay, ShareableFilters } from '@/lib/share-utils'
import html2canvas from 'html2canvas'
import { QRCodeSVG } from 'qrcode.react'

interface ShareFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: ShareableFilters
  resultCount: number
}

export default function ShareFiltersModal({ isOpen, onClose, filters, resultCount }: ShareFiltersModalProps) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const screenshotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      const url = getShareableURL(filters)
      setShareUrl(url)
    }
  }, [isOpen, filters])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleExportImage = async () => {
    if (!screenshotRef.current) return

    try {
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        width: 600,
        height: screenshotRef.current.scrollHeight,
        useCORS: true,
        logging: false,
      })
      
      const link = document.createElement('a')
      link.download = `polyfilter-results-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (err) {
      console.error('Failed to export image:', err)
      alert('Failed to export image. Please try again.')
    }
  }

  const handleSocialShare = (platform: 'twitter' | 'linkedin' | 'reddit') => {
    const text = `Check out ${resultCount} filtered Polymarket markets on PolyFilter`
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(text)

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    }

    window.open(urls[platform], '_blank', 'width=600,height=400')
  }

  if (!isOpen) return null

  const activeFilters = formatFilterDisplay(filters)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-polymarket-dark border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-700 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Your Filter
              </h2>
              <p className="text-sm text-gray-400 mt-1">{resultCount} markets found</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Active Filters */}
          {activeFilters.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Active Filters
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 rounded-lg px-3 py-1.5"
                  >
                    <span className="text-xs text-blue-300 font-medium">{filter.label}:</span>
                    <span className="text-sm text-white font-semibold">{filter.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400 text-center">No filters applied - showing all markets</p>
            </div>
          )}

          {/* Screenshot Preview (off-screen, used for export) */}
          <div 
            ref={screenshotRef} 
            className="absolute -left-[9999px] bg-polymarket-dark p-8 rounded-lg border border-gray-700 w-[600px]"
            style={{ top: 0 }}
          >
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-white mb-3">PolyFilter Results</h3>
              <p className="text-gray-400 text-lg">{resultCount} markets found</p>
            </div>
            {activeFilters.length > 0 && (
              <div className="mb-6">
                <p className="text-base text-gray-300 mb-3 font-semibold">Filters Applied:</p>
                <div className="space-y-2">
                  {activeFilters.map((filter, idx) => (
                    <div key={idx} className="text-base text-white">
                      • {filter.label}: {filter.value}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-center mt-6 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-500">polyfilter.hanyon.app</p>
            </div>
          </div>

          {/* Share URL */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Share Link
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm font-mono truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* QR Code */}
          {shareUrl && (
            <div className="mb-6 text-center">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Scan to Open
              </h3>
              <div className="inline-block p-4 bg-white rounded-lg">
                <QRCodeSVG value={shareUrl} size={128} level="M" />
              </div>
            </div>
          )}

          {/* Social Share Buttons */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Share on Social
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleSocialShare('twitter')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white rounded-lg px-4 py-3 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </button>
              <button
                onClick={() => handleSocialShare('linkedin')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0077B5] hover:bg-[#006399] text-white rounded-lg px-4 py-3 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>
              <button
                onClick={() => handleSocialShare('reddit')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#e63d00] text-white rounded-lg px-4 py-3 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-2.597a1.249 1.249 0 0 1 0-1.768 1.25 1.25 0 0 1 1.768 0l2.597 2.597A1.249 1.249 0 0 1 17.01 4.744zM9.63 1.54a.75.75 0 0 1 .75.75v2.499a.75.75 0 1 1-1.5 0V2.29a.75.75 0 0 1 .75-.75zm-.35 4.24a1.25 1.25 0 1 1-2.498.056L4.777 7.498a1.249 1.249 0 0 1 0-1.768 1.25 1.25 0 0 1 1.768 0l2.597 2.597a1.249 1.249 0 0 1 .073 1.697zm-4.28 2.998a.75.75 0 0 1 .75.75v2.499a.75.75 0 1 1-1.5 0V9.528a.75.75 0 0 1 .75-.75zm4.28 8.502a1.25 1.25 0 1 1-2.498.056l-2.597-2.597a1.249 1.249 0 0 1 0-1.768 1.25 1.25 0 0 1 1.768 0l2.597 2.597a1.249 1.249 0 0 1 .073 1.697zm-.35-4.24a.75.75 0 0 1 .75.75v2.499a.75.75 0 1 1-1.5 0v-2.499a.75.75 0 0 1 .75-.75zm-4.28-8.502a1.25 1.25 0 1 1-2.498.056L2.787 7.498a1.249 1.249 0 0 1 0-1.768 1.25 1.25 0 0 1 1.768 0l2.597 2.597a1.249 1.249 0 0 1 .073 1.697zm8.56 0a1.25 1.25 0 1 1-2.498.056l-2.597-2.597a1.249 1.249 0 0 1 0-1.768 1.25 1.25 0 0 1 1.768 0l2.597 2.597a1.249 1.249 0 0 1 .073 1.697zM12 8.277a3.75 3.75 0 1 0 .001 7.499A3.75 3.75 0 0 0 12 8.277zm-1.405 3.676a1.875 1.875 0 1 1 3.751.001 1.875 1.875 0 0 1-3.751-.001zm8.56-4.998a.75.75 0 0 1 .75.75v2.499a.75.75 0 1 1-1.5 0V7.705a.75.75 0 0 1 .75-.75z"/>
                </svg>
                Reddit
              </button>
            </div>
          </div>

          {/* Export as Image */}
          <div>
            <button
              onClick={handleExportImage}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-3 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Export as Image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

