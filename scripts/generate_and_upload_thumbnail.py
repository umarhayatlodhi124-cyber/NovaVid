import os
import sys
import json
import subprocess
import urllib.request
from pathlib import Path
from upload_lodhi_techx_to_youtube import get_fresh_access_token

BASE_DIR = Path(r"G:\Nova Vid")
EXPORTS_DIR = BASE_DIR / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
FFMPEG = BASE_DIR / "bin" / "ffmpeg.exe"

THUMB_PATH = EXPORTS_DIR / "LODHI_TECHX_AI_Intro_1280x720_Thumbnail.png"
VIDEO_ID = "BnE6_ZbM4Bc"

def generate_1280x720_thumbnail():
    print("Generating unique 1280x720 high-CTR YouTube thumbnail...")
    
    # 1280x720 Canvas with deep dark gradient, neon cyan border, bold headline, and verified badge
    vf = (
        "drawbox=x=0:y=0:w=1280:h=720:color=0x080c18:t=fill,"
        # Neon Border
        "drawbox=x=16:y=16:w=1248:h=688:color=0x00F0FF:t=4,"
        # Background Grid lines
        "drawbox=x=40:y=120:w=1200:h=2:color=0x1E293B:t=fill,"
        "drawbox=x=40:y=240:w=1200:h=2:color=0x1E293B:t=fill,"
        "drawbox=x=40:y=360:w=1200:h=2:color=0x1E293B:t=fill,"
        "drawbox=x=40:y=480:w=1200:h=2:color=0x1E293B:t=fill,"
        "drawbox=x=40:y=600:w=1200:h=2:color=0x1E293B:t=fill,"
        # Top Brand Tag
        "drawbox=x=60:y=50:w=360:h=46:color=0x0F172A@0.9:t=fill,"
        "drawbox=x=60:y=50:w=360:h=46:color=0x00F0FF:t=2,"
        "drawtext=text='LODHI TECHX OFFICIAL':x=80:y=62:fontsize=22:fontcolor=0xFFFFFF,"
        # Hook Badge
        "drawbox=x=880:y=50:w=340:h=46:color=0xDC2626:t=fill,"
        "drawtext=text='1080P MASTERCLASS':x=915:y=62:fontsize=22:fontcolor=0xFFFFFF,"
        # Bold Main Headline
        "drawtext=text='AUTONOMOUS AI':x=60:y=170:fontsize=76:fontcolor=0x00F0FF,"
        "drawtext=text='VIDEO CREATION':x=60:y=265:fontsize=76:fontcolor=0xFFFFFF,"
        # Sub-headline Card
        "drawbox=x=60:y=385:w=1160:h=180:color=0x111827@0.90:t=fill,"
        "drawbox=x=60:y=385:w=1160:h=180:color=0x38BDF8@0.5:t=2,"
        "drawtext=text='• Studio Urdu Neural Voice (ur-PK)':x=90:y=415:fontsize=28:fontcolor=0xE2E8F0,"
        "drawtext=text='• 1080p FFmpeg Autonomous Muxing':x=90:y=465:fontsize=28:fontcolor=0xE2E8F0,"
        "drawtext=text='• Multi-Tenant Cloud Architecture':x=90:y=515:fontsize=28:fontcolor=0x38BDF8,"
        # Footer Action Strip
        "drawbox=x=60:y=610:w=1160:h=60:color=0x2563EB:t=fill,"
        "drawtext=text='NOVAVID AI STUDIO 2.0  -  POWERED BY LODHI TECHX':x=160:y=628:fontsize=28:fontcolor=0xFFFFFF"
    )

    subprocess.run([
        str(FFMPEG), "-y",
        "-f", "lavfi", "-i", "color=c=0x080c18:s=1280x720:d=1",
        "-vf", vf,
        "-frames:v", "1",
        str(THUMB_PATH)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    stat = os.stat(THUMB_PATH)
    print(f"Thumbnail generated: {THUMB_PATH} ({stat.st_size:,} bytes, 1280x720 PNG)")
    return THUMB_PATH

def upload_thumbnail_to_youtube(access_token, video_id, thumb_path):
    print(f"\nUploading thumbnail to YouTube Data API v3 (thumbnails.set) for video '{video_id}'...")
    url = f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={video_id}"
    
    with open(thumb_path, 'rb') as f:
        thumb_bytes = f.read()

    req = urllib.request.Request(url, data=thumb_bytes, method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'image/png')
    req.add_header('Content-Length', str(len(thumb_bytes)))

    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        print("\n=======================================================")
        print("YOUTUBE THUMBNAIL UPLOAD SUCCESSFUL!")
        print("=======================================================")
        print(f"Video ID: {video_id}")
        items = res_data.get('items', [{}])[0]
        default_url = items.get('default', {}).get('url')
        medium_url = items.get('medium', {}).get('url')
        high_url = items.get('high', {}).get('url')
        print(f"High Quality Thumbnail URL: {high_url or default_url}")
        print("=======================================================\n")
        
        receipt = {
            "videoId": video_id,
            "status": "published",
            "uploadedAt": resp.headers.get('Date'),
            "thumbnailFilePath": str(thumb_path),
            "thumbnailDimensions": "1280x720",
            "fileSizeBytes": len(thumb_bytes),
            "youtubeResponse": res_data
        }
        
        receipt_path = EXPORTS_DIR / "youtube_thumbnail_receipt.json"
        with open(receipt_path, 'w', encoding='utf-8') as f:
            json.dump(receipt, f, indent=2)
        print(f"Receipt written to: {receipt_path}")
        return res_data

def main():
    thumb_path = generate_1280x720_thumbnail()
    access_token = get_fresh_access_token()
    upload_thumbnail_to_youtube(access_token, VIDEO_ID, thumb_path)

if __name__ == "__main__":
    main()
