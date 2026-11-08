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
VIDEO2_PATH = EXPORTS_DIR / "Taleemi_Duniya_Pro_Avatar_Tutorial.mp4"
THUMB2_PATH = EXPORTS_DIR / "Taleemi_Duniya_Pro_Avatar_Thumbnail.png"
RECEIPT_PATH = EXPORTS_DIR / "youtube_v2_upload_receipt.json"

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
        print("Obtained fresh YouTube access token.")
        return res_json['access_token']

def verify_video1(access_token):
    print("\n--- Verifying Video 1 (BnE6_ZbM4Bc) via YouTube Data API v3 ---")
    url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=BnE6_ZbM4Bc"
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {access_token}')
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        items = data.get('items', [])
        if not items:
            print("Video BnE6_ZbM4Bc not found!")
            return None
        v = items[0]
        snippet = v['snippet']
        status = v['status']
        print(f"Title: {snippet.get('title')}")
        print(f"Privacy Status: {status.get('privacyStatus')}")
        print(f"Thumbnails: {list(snippet.get('thumbnails', {}).keys())}")
        for size, info in snippet.get('thumbnails', {}).items():
            print(f"  {size}: {info.get('url')} ({info.get('width')}x{info.get('height')})")
        return v

def upload_video2(access_token):
    print("\n--- Uploading Video 2 (Taleemi Duniya Pro) to YouTube ---")
    filesize = os.path.getsize(VIDEO2_PATH)
    print(f"File: {VIDEO2_PATH} ({filesize:,} bytes)")
    
    metadata = {
        "snippet": {
            "title": "Taleemi Duniya Pro — Complete Educational ERP Software Tutorial (LODHI TECHX)",
            "description": (
                "Welcome to Taleemi Duniya Pro, Pakistan's leading digital campus management and academic ERP software.\n\n"
                "Watch the official full walkthrough presented by Umar Hayat, Founder LODHI TECHX.\n\n"
                "Key Modules:\n"
                "- Student Admissions & Biometric Attendance\n"
                "- Automated Fee Management & SMS Alerts\n"
                "- Smart Exam Paper Generator & Instant Marksheets\n"
                "- Dedicated Teacher & Parent Mobile Apps\n\n"
                "Chapters:\n"
                "0:00 Introduction & Overview\n"
                "0:15 Student & Fee Management\n"
                "0:27 Smart Exam Engine\n"
                "0:40 Mobile Applications\n"
                "0:52 Digital Campus Free Demo\n\n"
                "#TaleemiDuniya #LodhiTechX #SchoolManagement #EdTech #SoftwareTutorial"
            ),
            "tags": [
                "Taleemi Duniya Pro",
                "LODHI TECHX",
                "Educational ERP",
                "School Management Software",
                "Pakistan EdTech",
                "Student Attendance System",
                "Online Fee Management",
                "Urdu Software Tutorial",
                "Umar Hayat"
            ],
            "categoryId": "27" # Education
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False
        }
    }
    
    # Initiate resumable upload session
    init_url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    meta_bytes = json.dumps(metadata).encode('utf-8')
    init_req = urllib.request.Request(init_url, data=meta_bytes, method='POST')
    init_req.add_header('Authorization', f'Bearer {access_token}')
    init_req.add_header('Content-Type', 'application/json; charset=UTF-8')
    init_req.add_header('X-Upload-Content-Length', str(filesize))
    init_req.add_header('X-Upload-Content-Type', 'video/mp4')
    
    with urllib.request.urlopen(init_req) as resp:
        upload_url = resp.headers.get('Location')
    
    print(f"Resumable upload session initiated: {upload_url[:60]}...")
    
    # Upload video stream
    with open(VIDEO2_PATH, 'rb') as f:
        video_data = f.read()
    
    upload_req = urllib.request.Request(upload_url, data=video_data, method='PUT')
    upload_req.add_header('Authorization', f'Bearer {access_token}')
    upload_req.add_header('Content-Type', 'video/mp4')
    upload_req.add_header('Content-Length', str(filesize))
    
    with urllib.request.urlopen(upload_req) as resp:
        upload_res = json.loads(resp.read().decode('utf-8'))
        video_id = upload_res['id']
        print(f"SUCCESS: Video 2 uploaded to YouTube! Video ID: {video_id}")
        return video_id, upload_res

def upload_thumbnail2(access_token, video_id):
    print(f"\n--- Setting Custom Thumbnail for Video 2 ({video_id}) via thumbnails.set ---")
    thumb_size = os.path.getsize(THUMB2_PATH)
    print(f"Thumbnail file: {THUMB2_PATH} ({thumb_size:,} bytes)")
    
    url = f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={video_id}"
    with open(THUMB2_PATH, 'rb') as f:
        img_data = f.read()
    
    req = urllib.request.Request(url, data=img_data, method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'image/png')
    req.add_header('Content-Length', str(thumb_size))
    
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("SUCCESS: Custom thumbnail uploaded to YouTube!")
        items = res.get('items', [])
        if items:
            t = items[0]
            print(f"Default CDN URL: {t.get('default', {}).get('url')}")
            print(f"High CDN URL: {t.get('high', {}).get('url')}")
        return res

def main():
    token = get_fresh_access_token()
    
    # Step 1: Verify Video 1
    v1_data = verify_video1(token)
    
    # Step 2: Upload Video 2
    v2_id, v2_data = upload_video2(token)
    
    # Step 3: Set Thumbnail for Video 2
    thumb_res = upload_thumbnail2(token, v2_id)
    
    # Write complete receipt
    receipt = {
        "channel": "Lodhi TechX (@lodhitechx)",
        "channelId": "UCL1USyVzIikDT-K1OIg69_w",
        "video1": {
            "videoId": "BnE6_ZbM4Bc",
            "url": "https://youtu.be/BnE6_ZbM4Bc",
            "verifiedData": v1_data
        },
        "video2": {
            "videoId": v2_id,
            "url": f"https://youtu.be/{v2_id}",
            "privacyStatus": "private",
            "uploadResponse": v2_data,
            "thumbnailResponse": thumb_res
        },
        "verifiedAt": "2026-11-08T12:00:00Z"
    }
    
    with open(RECEIPT_PATH, 'w', encoding='utf-8') as f:
        json.dump(receipt, f, indent=2)
    print(f"\nAudit receipt saved to: {RECEIPT_PATH}")

if __name__ == '__main__':
    main()
