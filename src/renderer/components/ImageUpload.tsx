import React, { useState } from 'react'

interface Props {
  onImageSelected: (base64: string, mediaType: 'image/jpeg' | 'image/png', preview: string) => void
}

export function ImageUpload({ onImageSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      setPreview(dataUrl)
      onImageSelected(base64, mediaType, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleBrowse = async () => {
    const result = await window.api.openImage()
    if (result) {
      const dataUrl = `data:${result.mediaType};base64,${result.base64}`
      setPreview(dataUrl)
      onImageSelected(result.base64, result.mediaType, dataUrl)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-zwift-border hover:border-orange-400 hover:bg-white/5'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleBrowse}
      >
        {preview ? (
          <img src={preview} alt="workout" className="max-h-64 mx-auto rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-300">גרור תמונת אימון לכאן</p>
            <p className="text-sm">או לחץ לבחירת קובץ</p>
            <p className="text-xs text-gray-600">JPG, PNG מקובלים</p>
          </div>
        )}
      </div>

      {preview && (
        <button
          onClick={(e) => { e.stopPropagation(); setPreview(null) }}
          className="text-sm text-gray-500 hover:text-gray-300 underline"
        >
          בחר תמונה אחרת
        </button>
      )}
    </div>
  )
}
