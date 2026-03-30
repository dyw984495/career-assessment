// ============================================================
// 二维码弹窗组件
// ============================================================

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QrCodeModalProps {
  url: string
  studentName?: string | null
  taskId: string
  onClose: () => void
}

export function QrCodeModal({ url, studentName, taskId, onClose }: QrCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(setQrDataUrl).catch(console.error)
  }, [url])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>

        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {studentName || '测评链接'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">扫码开始测评</p>

          {/* 二维码 */}
          <div className="inline-block p-4 bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="二维码" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* 链接 */}
          <div className="bg-gray-50 rounded-2xl p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">测评链接</p>
            <p className="text-sm text-gray-700 break-all font-mono">{url}</p>
          </div>

          <p className="text-xs text-gray-400">
            链接有效期至过期设置时间，每个 token 仅可提交一次
          </p>
        </div>
      </div>
    </div>
  )
}
