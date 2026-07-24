'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (or use your existing client import)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ARCVideoUploader() {
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  // 1. Automatic filename sanitizer to prevent crashes
  const sanitizeFilename = (filename) => {
    const extension = filename.split('.').pop()
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'))
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
    return `${cleanName}-${Date.now()}.${extension}` // Adds timestamp to prevent overwrites
  }

  // 2. The 1-Click Engine Handler
  const handleUploadAndSchedule = async (e) => {
    e.preventDefault()
    if (!file) return alert('Please select a video file first!')

    setUploading(true)
    setStatusMsg('Sanitizing and uploading to vault...')

    try {
      // Step A: Sanitize file name
      const safeFileName = sanitizeFilename(file.name)

      // Step B: Upload directly to Supabase Storage bucket ('videos')
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(safeFileName, file)

      if (storageError) throw storageError

      // Step C: Get the public URL for the GitHub worker
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(safeFileName)

      const publicVideoUrl = urlData.publicUrl

      setStatusMsg('Registering post into ARC Matrix...')

      // Step D: Insert into scheduled_posts table automatically
      // Setting status to 'pending' and time to right now so your worker picks it up
      const { error: dbError } = await supabase
        .from('scheduled_posts')
        .insert([
          {
            video_url: publicVideoUrl,
            caption: caption,
            status: 'pending',
            scheduled_time: new Date().toISOString() // Current UTC timestamp
          }
        ])

      if (dbError) throw dbError

      setStatusMsg('SUCCESS! Video locked into the fleet engine.')
      setFile(null)
      setCaption('')
      
    } catch (err) {
      console.error(err)
      setStatusMsg(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg mx-auto text-white">
      <h2 className="text-xl font-bold mb-4">ARC Fleet Video Deployment</h2>
      
      <form onSubmit={handleUploadAndSchedule} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Select Video File (.mp4)</label>
          <input 
            type="file" 
            accept="video/mp4,video/quicktime"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Caption / Spintax</label>
          <textarea 
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Enter caption here... {Awesome|Epic} post!"
            rows={3}
            className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button 
          type="submit" 
          disabled={uploading}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 font-semibold rounded-lg transition-colors"
        >
          {uploading ? 'Processing Deployment...' : 'Deploy to ARC Matrix'}
        </button>

        {statusMsg && (
          <p className="text-sm text-center mt-2 font-mono text-cyan-400">{statusMsg}</p>
        )}
      </form>
    </div>
  )
}

