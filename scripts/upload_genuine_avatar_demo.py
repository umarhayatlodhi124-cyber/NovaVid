import os
import sys
import json
import ctypes
import ctypes.wintypes
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(r"G:\Nova Vid")
EXPORTS_DIR = BASE_DIR / "exports"
AVATAR_VIDEO_PATH = EXPORTS_DIR / "Umar_Hayat_Urdu_AI_Avatar_Demonstration.mp4"
AVATAR_THUMB_PATH = EXPORTS_DIR / "umar_hayat_presenter_portrait.png"
RECEIPT_PATH = EXPORTS_DIR / "youtube_avatar_demo_receipt.json"

advapi32 = ctypes.windll.advapi32

class CREDENTIAL(ctypes.Structure):
    _fields_ = [
        ('Flags', ctypes.wintypes.DWORD),
        ('Type', ctypes.wintypes.DWORD),
        ('TargetName', ctypes.wintypes.LPWSTR),
        ('Comment', ctypes.wintypes.LPWSTR),
        ('LastWritten', ctypes.wintypes.FILETIME),
        ('CredentialBlobSize', ctypes.wintypes.DWORD),
        ('CredentialBlob', ctypes.c_void_p),
        ('Persist', ctypes.wintypes.DWORD),
        ('AttributeCount', ctypes.wintypes.DWORD),
        ('Attributes', ctypes.c_void_p),
        ('TargetAlias', ctypes.wintypes.LPWSTR),
        ('UserName', ctypes.wintypes.LPWSTR)
    ]

def read_credential(target):
    pcred = ctypes.POINTER(CREDENTIAL)()
    res = advapi32.CredReadW(target, 1, 0, ctypes.byref(pcred))
    if not res:
        return None
    cred = pcred.contents
    blob = ctypes.string_at(cred.CredentialBlob, cred.CredentialBlobSize)
    advapi32.CredFree(pcred)
    try:
        return json.loads(blob.decode('utf-16le'))
    except Exception:
        return json.loads(blob.decode('utf-8'))

def get_fresh_access_token():
    print("Reading YouTube OAuth credentials from Windows DPAPI...")
    token_data = read_credential('oauth_token.com.aiyoutubestudio.youtube')
    client_data = read_credential('oauth_client.com.aiyoutubestudio.youtube')
    
    if not token_data:
        raise RuntimeError("No YouTube OAuth token found in Windows DPAPI.")
    
    refresh_token = token_data.get('refreshToken') or token_data.get('refresh_token')
    client_id = client_data.get('clientId') if client_data else '223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com'
    client_secret = client_data.get('clientSecret') if client_data else None
    
    params = {
        'client_id': client_id,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }
    if client_secret and client_secret.strip():
        params['client_secret'] = client_secret.strip()
    
    data = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data, method='POST')
    with urllib.request.urlopen(req) as resp:
        res_json = json.loads(resp.read().decode('utf-8'))
        print("Successfully obtained fresh YouTube access token.")
        return res_json['access_token']

def upload_avatar_video(access_token):
    print(f"\n--- Uploading Avatar Demo Video: {AVATAR_VIDEO_PATH.name} ---")
    filesize = AVATAR_VIDEO_PATH.stat().st_size
    print(f"File size: {filesize:,} bytes")
    
    metadata = {
        "snippet": {
            "title": "Umar Hayat — LODHI TECHX AI Avatar Presenter | Urdu Demonstration",
            "description": (
                "Official demonstration of NovaVid AI Studio 2.0 Real Personal AI Face Presenter.\n\n"
                "Presenter: Umar Hayat (Founder & CEO, LODHI TECHX)\n"
                "Language: Urdu (Microsoft AsadNeural)\n"
                "Features: Photorealistic Face Avatar, Phoneme-Synchronized Lip Movement, Natural Eye Blinking, Subtle Breathing Sway\n"
                "Resolution: 1080p Full HD (1920x1080) @ 30fps Constrained VBR Broadcast Quality\n\n"
                "#LodhiTechX #NovaVid #AIAvatar #TalkingHead #EdTech #UmarHayat #TaleemiDuniya"
            ),
            "tags": [
                "LODHI TECHX",
                "NovaVid AI Studio",
                "AI Avatar",
                "Talking Face",
                "Umar Hayat",
                "Urdu AI Presenter",
                "Taleemi Duniya Pro",
                "Artificial Intelligence"
            ],
            "categoryId": "28" # Science & Technology
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False
        }
    }
    
    init_url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    meta_bytes = json.dumps(metadata).encode('utf-8')
    init_req = urllib.request.Request(init_url, data=meta_bytes, method='POST')
    init_req.add_header('Authorization', f'Bearer {access_token}')
    init_req.add_header('Content-Type', 'application/json; charset=UTF-8')
    init_req.add_header('X-Upload-Content-Length', str(filesize))
    init_req.add_header('X-Upload-Content-Type', 'video/mp4')
    
    with urllib.request.urlopen(init_req) as resp:
        upload_url = resp.headers.get('Location')
    
    print(f"Resumable upload session initiated: {upload_url[:65]}...")
    
    with open(AVATAR_VIDEO_PATH, 'rb') as f:
        video_data = f.read()
    
    upload_req = urllib.request.Request(upload_url, data=video_data, method='PUT')
    upload_req.add_header('Authorization', f'Bearer {access_token}')
    upload_req.add_header('Content-Type', 'video/mp4')
    upload_req.add_header('Content-Length', str(filesize))
    
    with urllib.request.urlopen(upload_req) as resp:
        upload_res = json.loads(resp.read().decode('utf-8'))
        video_id = upload_res['id']
        print(f"SUCCESS: Genuine Avatar Demonstration uploaded to YouTube! Video ID: {video_id}")
        return video_id, upload_res

def upload_avatar_thumbnail(access_token, video_id):
    print(f"\n--- Setting Custom Thumbnail for Video ID {video_id} ---")
    thumb_size = AVATAR_THUMB_PATH.stat().st_size
    print(f"Thumbnail file size: {thumb_size:,} bytes")
    
    with open(AVATAR_THUMB_PATH, 'rb') as f:
        thumb_bytes = f.read()
    
    thumb_url = f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={video_id}&uploadType=media"
    thumb_req = urllib.request.Request(thumb_url, data=thumb_bytes, method='POST')
    thumb_req.add_header('Authorization', f'Bearer {access_token}')
    thumb_req.add_header('Content-Type', 'image/png')
    thumb_req.add_header('Content-Length', str(thumb_size))
    
    try:
        with urllib.request.urlopen(thumb_req) as resp:
            thumb_res = json.loads(resp.read().decode('utf-8'))
            print("SUCCESS: Avatar thumbnail uploaded and confirmed by YouTube!")
            cdn_url = thumb_res['items'][0]['default']['url']
            print(f"Active Google CDN URL: {cdn_url}")
            return thumb_res
    except Exception as e:
        print(f"Thumbnail upload note: {e}")
        return None

def main():
    print("=" * 60)
    print("NOVAVID 2.0 — TALKING AVATAR YOUTUBE UPLOAD & VERIFICATION")
    print("Channel: Lodhi TechX (UCL1USyVzIikDT-K1OIg69_w)")
    print("=" * 60)
    
    access_token = get_fresh_access_token()
    video_id, upload_res = upload_avatar_video(access_token)
    thumb_res = upload_avatar_thumbnail(access_token, video_id)
    
    receipt = {
        "status": "SUCCESS",
        "video_id": video_id,
        "youtube_url": f"https://youtu.be/{video_id}",
        "channel_id": "UCL1USyVzIikDT-K1OIg69_w",
        "channel_title": "Lodhi TechX",
        "title": upload_res.get("snippet", {}).get("title"),
        "privacy": upload_res.get("status", {}).get("privacyStatus"),
        "file_path": str(AVATAR_VIDEO_PATH),
        "file_size_bytes": AVATAR_VIDEO_PATH.stat().st_size,
        "thumbnail_path": str(AVATAR_THUMB_PATH),
        "thumbnail_result": thumb_res,
        "upload_api_response": upload_res
    }
    
    with open(RECEIPT_PATH, 'w', encoding='utf-8') as f:
        json.dump(receipt, f, indent=2)
    
    print("\n" + "=" * 60)
    print(f"RECEIPT SAVED: {RECEIPT_PATH}")
    print(f"YOUTUBE URL: https://youtu.be/{video_id}")
    print("=" * 60)

if __name__ == "__main__":
    main()
