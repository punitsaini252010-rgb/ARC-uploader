'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Your Public ARC-Matrix Supabase Connection
const supabaseUrl = 'https://camxivyjiqvoxmrzcoji.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXhpdnlqaXF2b3htcnpjb2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NDI5NDQsImV4cCI6MjEwMDAxODk0NH0.iC1_04-CbLz9qKqnZfAWgrqDe6taBUJ9aU1I6pP5nBU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ArcCommandCenter() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [igCookies, setIgCookies] = useState('');
  const [status, setStatus] = useState('System Offline. Awaiting input.');

  // Function 1: Schedule the Video
    const handleDeploy = async () => {
    if (!file || !scheduleTime) {
      setStatus('[-] Error: Base video and schedule time are strictly required.');
      return;
    }
    
    setStatus('[*] Uploading Base Asset to ARC Vault...');
    
    // Clean filename and upload
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${cleanName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('arc_assets')
      .upload(fileName, file);

    if (uploadError) {
      console.error("SUPABASE UPLOAD ERROR:", uploadError);
      setStatus(`[-] FAIL: ${uploadError.message} | Code: ${uploadError.statusCode || 'N/A'}`);
      return;
    }

    // Get the Public URL
    const { data: urlData } = supabase.storage.from('arc_assets').getPublicUrl(fileName);
    const videoUrl = urlData.publicUrl;

    setStatus('[*] Asset secured. Writing protocol to database...');

    // Save Schedule to Database
    const { error: dbError } = await supabase
      .from('scheduled_posts')
      .insert([
        {
          video_url: videoUrl,
          caption: caption || '{The matrix|The system} is {live|active}. Comment {ARC|ENTER}.',
          scheduled_time: new Date(scheduleTime).toISOString()
        }
      ]);

    if (dbError) {
      setStatus(`[-] Database Error: ${dbError.message}`);
    } else {
      setStatus('[+] SUCCESS: Fleet deployment scheduled.');
    }
  };

  // Function 2: Update the Instagram Session Cookies
  const handleUpdateCookies = async () => {
    if (!igCookies) {
      setStatus('[-] Error: No cookies provided.');
      return;
    }
    
    setStatus('[*] Updating Instagram Session Vault...');
    
    // Saves the updated cookies to a secure table (we will create this table next)
    const { error } = await supabase
      .from('system_config')
      .upsert({ id: 1, ig_sessions: igCookies });

    if (error) {
      setStatus(`[-] Cookie Update Failed: ${error.message}`);
    } else {
      setStatus('[+] SUCCESS: Instagram network authenticated.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-500 p-6 font-mono selection:bg-green-900">
      <div className="max-w-2xl mx-auto border border-green-800 p-8 shadow-[0_0_15px_rgba(0,255,0,0.2)]">
        
        <h1 className="text-4xl font-bold mb-2 tracking-tighter">ARC // COMMAND</h1>
        <p className="text-green-700 mb-8 border-b border-green-900 pb-4">AUTONOMOUS FLEET ORCHESTRATION</p>
        
        {/* SECTION 1: CONTENT DEPLOYMENT */}
        <div className="space-y-6 mb-12">
          <h2 className="text-xl font-bold bg-green-900 text-black inline-block px-2">1. ASSET SCHEDULING</h2>
          
          <div>
            <label className="block mb-2 text-sm">UPLOAD BASE ASSET (.MP4)</label>
            <input 
              type="file" 
              accept="video/mp4"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-3 bg-black border border-green-800 focus:border-green-400 outline-none transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:bg-green-900 file:text-black file:border-0 file:font-bold"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">SPINTAX CAPTION MATRIX</label>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-3 bg-black border border-green-800 focus:border-green-400 outline-none h-24"
              placeholder="{They lied|The truth is hidden}. Comment {ARC|ESCAPE} to enter..."
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">DEPLOYMENT TIME (IST)</label>
            <input 
              type="datetime-local" 
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full p-3 bg-black border border-green-800 focus:border-green-400 outline-none"
            />
          </div>

          <button 
            onClick={handleDeploy}
            className="w-full bg-green-600 text-black font-bold py-4 hover:bg-green-400 transition-colors tracking-widest"
          >
            INITIALIZE DEPLOYMENT
          </button>
        </div>

        {/* SECTION 2: NETWORK AUTHENTICATION */}
        <div className="space-y-6 mb-8 pt-8 border-t border-green-900">
          <h2 className="text-xl font-bold bg-green-900 text-black inline-block px-2">2. NETWORK AUTHENTICATION</h2>
          
          <div>
            <label className="block mb-2 text-sm">UPDATE IG SESSION IDs (JSON/TEXT)</label>
            <textarea 
              value={igCookies}
              onChange={(e) => setIgCookies(e.target.value)}
              className="w-full p-3 bg-black border border-green-800 focus:border-green-400 outline-none h-20"
              placeholder="Paste new sessionid cookies here when old ones expire..."
            />
          </div>
          
          <button 
            onClick={handleUpdateCookies}
            className="w-full border border-green-600 text-green-500 font-bold py-3 hover:bg-green-900 hover:text-black transition-colors"
          >
            UPDATE VAULT
          </button>
        </div>

        {/* SYSTEM TERMINAL LOGS */}
        <div className="mt-8 p-4 bg-black border border-green-800 text-sm">
          <p className="text-green-700 mb-1">TERMINAL OUTPUT:</p>
          <p className="animate-pulse">&gt; {status}</p>
        </div>

      </div>
    </div>
  );
}

