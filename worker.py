import os
import random
import re
import urllib.request
from datetime import datetime, timezone
from supabase import create_client, Client
from moviepy.editor import VideoFileClip
import moviepy.video.fx.all as vfx
from instagrapi import Client as InstaClient

# Connect to your Supabase Brain using GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_spintax(text):
    # Converts "{The matrix|The system} is {live|active}" into unique captions
    while True:
        match = re.search(r'\{([^{}]*)\}', text)
        if not match:
            break
        options = match.group(1).split('|')
        text = text[:match.start()] + random.choice(options) + text[match.end():]
    return text

def mutate_video(input_path, output_path):
    # Generates a completely unique cryptographic hash for the algorithm
    clip = VideoFileClip(input_path)
    
    # 1. Time Shift (Unnoticeable speed change)
    clip = clip.fx(vfx.speedx, random.uniform(0.95, 1.05))
    # 2. Pixel Shift (Unique crop)
    x1, y1 = random.randint(0, 10), random.randint(0, 10)
    clip = clip.crop(x1=x1, y1=y1, x2=clip.w-10, y2=clip.h-10)
    # 3. Color Shift
    clip = clip.fx(vfx.colorx, random.uniform(0.95, 1.05))
    # 4. Mirror Flip (50% probability)
    if random.choice([True, False]):
        clip = clip.fx(vfx.mirror_x)
    
    clip.write_videofile(output_path, codec="libx264", audio_codec="aac", fps=30, logger=None)
    return output_path

def main():
    print("[*] Engine Online. Checking ARC Matrix schedules...")
    
    # 1. Fetch pending posts where the scheduled time has arrived
    now = datetime.now(timezone.utc).isoformat()
    response = supabase.table("scheduled_posts").select("*").eq("status", "pending").lte("scheduled_time", now).execute()
    posts = response.data
    
    if not posts:
        print("[*] No deployments scheduled for this hour. Standing by.")
        return

    # 2. Fetch IG Cookies (Saved directly from your Next.js Dashboard)
    config_res = supabase.table("system_config").select("ig_sessions").eq("id", 1).execute()
    if not config_res.data or not config_res.data[0].get("ig_sessions"):
        print("[-] FATAL: No Instagram cookies found. Update via dashboard.")
        return
    
    # Reads the comma-separated session IDs you pasted in the UI
    session_ids = [s.strip() for s in config_res.data[0]["ig_sessions"].split(",") if s.strip()]

    for post in posts:
        print(f"[*] Initiating Deployment Protocol for Schedule ID: {post['id']}")
        
        base_video = "base_video.mp4"
        urllib.request.urlretrieve(post['video_url'], base_video)
        
        # Deploy to all channels in the vault
        for i, session_id in enumerate(session_ids):
            print(f"[*] Processing Channel {i+1}/{len(session_ids)}")
            
            mutated_video = f"mutated_{i}.mp4"
            mutate_video(base_video, mutated_video)
            final_caption = parse_spintax(post['caption'])
            
            try:
                cl = InstaClient()
                cl.login_by_sessionid(session_id)
                cl.clip_upload(mutated_video, final_caption)
                print(f"[+] SUCCESS: Channel {i+1} uploaded.")
            except Exception as e:
                print(f"[-] FAILED: Channel {i+1} upload error - {e}")
            
            if os.path.exists(mutated_video):
                os.remove(mutated_video)

        # Mark as completed so it doesn't upload again tomorrow
        supabase.table("scheduled_posts").update({"status": "completed"}).eq("id", post["id"]).execute()
        print(f"[+] DEPLOYMENT COMPLETE. All assets pushed.")

if __name__ == "__main__":
    main()
  
