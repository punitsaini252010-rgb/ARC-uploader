import os
import random
import re
import time
import urllib.request
from datetime import datetime, timezone
from supabase import create_client, Client
from moviepy.editor import VideoFileClip
import moviepy.video.fx.all as vfx
from instagrapi import Client as InstaClient

# Connect to Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_spintax(text):
    while True:
        match = re.search(r'\{([^{}]*)\}', text)
        if not match:
            break
        options = match.group(1).split('|')
        text = text[:match.start()] + random.choice(options) + text[match.end():]
    return text

def mutate_video(input_path, output_path):
    clip = VideoFileClip(input_path)
    
    # 1. Random speed change
    clip = clip.fx(vfx.speedx, random.uniform(0.95, 1.05))
    # 2. Random crop shift
    x1, y1 = random.randint(0, 10), random.randint(0, 10)
    clip = clip.crop(x1=x1, y1=y1, x2=clip.w-10, y2=clip.h-10)
    # 3. Random color shift
    clip = clip.fx(vfx.colorx, random.uniform(0.95, 1.05))
    # 4. Random mirror flip
    if random.choice([True, False]):
        clip = clip.fx(vfx.mirror_x)
    
    clip.write_videofile(output_path, codec="libx264", audio_codec="aac", fps=30, logger=None)
    return output_path

def main():
    print("[*] Engine Online. Checking ARC Matrix schedules...")
    
    now = datetime.now(timezone.utc).isoformat()
    response = supabase.table("scheduled_posts").select("*").eq("status", "pending").lte("scheduled_time", now).execute()
    posts = response.data
    
    if not posts:
        print("[*] No deployments scheduled for this hour. Standing by.")
        return

        # Fetch IG Cookies
    config_res = supabase.table("system_config").select("*").eq("id", 1).execute()
    if not config_res.data or not config_res.data[0].get("ig_sessions"):
        print("[-] FATAL: No Instagram cookies found in vault.")
        return

    session_ids = [s.strip() for s in config_res.data[0]["ig_sessions"].split(",") if s.strip()]
    
    total_accounts = len(session_ids)
    print(f"[*] Loaded {total_accounts} active target accounts.")

    for post in posts:
        print(f"[*] Executing Deployment Protocol for Schedule ID: {post['id']}")
        
        base_video = "base_video.mp4"
        urllib.request.urlretrieve(post['video_url'], base_video)
        
        for i, session_id in enumerate(session_ids):
            print(f"[*] Processing Target {i+1}/{total_accounts}...")
            
            mutated_video = f"mutated_{i}.mp4"
            mutate_video(base_video, mutated_video)
            final_caption = parse_spintax(post['caption'])
            
            try:
                cl = InstaClient()
                cl.login_by_sessionid(session_id)
                cl.clip_upload(mutated_video, final_caption)
                print(f"[+] SUCCESS: Target {i+1} deployed.")
            except Exception as e:
                print(f"[-] FAILED: Target {i+1} error - {e}")
            
            if os.path.exists(mutated_video):
                os.remove(mutated_video)

            # STAGGERED DELAY: Wait between 3 to 7 minutes before posting to the next account
            if i < total_accounts - 1:
                delay = random.randint(180, 420)
                print(f"[*] Staggering network activity. Waiting {delay} seconds before next post...")
                time.sleep(delay)

        # Mark schedule as completed
        supabase.table("scheduled_posts").update({"status": "completed"}).eq("id", post["id"]).execute()
        print(f"[+] DEPLOYMENT PROTOCOL COMPLETE.")

if __name__ == "__main__":
    main()
    
