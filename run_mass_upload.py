import os
import json
from instagrapi import Client

def upload_to_ig(username, password, video_path, caption):
    cl = Client()
    try:
        print(f"[*] Authenticating: {username}...")
        cl.login(username, password)
        print(f"[*] Uploading Reel for {username}...")
        
        # clip_upload is the specific instagrapi function for Reels
        cl.clip_upload(video_path, caption)
        
        print(f"[+] Success: Reel deployed to {username}")
    except Exception as e:
        print(f"[-] FATAL ERROR for {username}: {e}")

if __name__ == "__main__":
    # GitHub Actions will pass these securely
    accounts_json = os.getenv("IG_ACCOUNTS", "[]")
    video_file = os.getenv("VIDEO_FILE")
    caption = os.getenv("CAPTION")

    # Parse the JSON string of your accounts
    accounts = json.loads(accounts_json)
    
    print(f"Initiating ARC Mass Deployment for {len(accounts)} accounts...")
    
    for acc in accounts:
        upload_to_ig(acc["username"], acc["password"], video_file, caption)
      
