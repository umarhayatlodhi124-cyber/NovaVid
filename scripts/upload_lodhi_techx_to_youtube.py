import os
import sys
import json
import ctypes
import ctypes.wintypes
import urllib.request
import urllib.parse
from pathlib import Path

VIDEO_PATH = Path(r"G:\Nova Vid\exports\LODHI_TECHX_AI_Technology_Introduction.mp4")
METADATA_PATH = Path(r"G:\Nova Vid\exports\lodhi_techx_first_video_metadata.json")

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
    print("Reading YouTube OAuth credentials from Windows DPAPI Credential Manager...")
    token_data = read_credential('oauth_token.com.aiyoutubestudio.youtube')
    client_data = read_credential('oauth_client.com.aiyoutubestudio.youtube')
    
    if not token_data:
        raise RuntimeError("No YouTube OAuth token found in Windows Credential Manager.")
    
    refresh_token = token_data.get('refreshToken') or token_data.get('refresh_token')
    if not refresh_token:
        raise RuntimeError("No refresh token found in stored credential.")
    
    client_id = client_data.get('clientId') or '223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com'
    client_secret = client_data.get('clientSecret')
    
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
        print("Successfully refreshed Google OAuth token! Expires in:", res_json.get('expires_in'), "seconds.")
        return res_json['access_token']

def verify_channel(access_token):
    req = urllib.request.Request('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true')
    req.add_header('Authorization', f'Bearer {access_token}')
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        items = data.get('items', [])
        if not items:
            raise RuntimeError("No YouTube channel found for the authenticated account.")
        channel = items[0]
        title = channel.get('snippet', {}).get('title', 'Unknown')
        cid = channel.get('id', 'Unknown')
        print(f"Authenticated YouTube Channel: '{title}' (ID: {cid})")
        return cid, title

def upload_video_private(access_token, video_path, metadata):
    file_size = os.path.getsize(video_path)
    print(f"\nInitiating YouTube Resumable Upload session for '{video_path.name}' ({file_size:,} bytes)...")
    
    init_url = (
        "https://www.googleapis.com/upload/youtube/v3/videos"
        "?uploadType=resumable&part=snippet,status"
    )
    
    body = {
        "snippet": {
            "title": metadata["title"],
            "description": metadata["description"],
            "tags": metadata["tags"],
            "categoryId": metadata["categoryId"],
            "defaultLanguage": "ur",
            "defaultAudioLanguage": "ur"
        },
        "status": {
            "privacyStatus": "private",  # Strictly PRIVATE
            "selfDeclaredMadeForKids": False
        }
    }
    
    body_bytes = json.dumps(body).encode('utf-8')
    init_req = urllib.request.Request(init_url, data=body_bytes, method='POST')
    init_req.add_header('Authorization', f'Bearer {access_token}')
    init_req.add_header('Content-Type', 'application/json; charset=UTF-8')
    init_req.add_header('X-Upload-Content-Length', str(file_size))
    init_req.add_header('X-Upload-Content-Type', 'video/mp4')
    
    with urllib.request.urlopen(init_req) as resp:
        upload_url = resp.headers.get('Location')
        if not upload_url:
            raise RuntimeError("Google API did not return an upload Location header.")
        print(f"Resumable session created successfully! Upload URL endpoint obtained.")

    print(f"Streaming video bytes to YouTube servers ({file_size:,} bytes)...")
    with open(video_path, 'rb') as f:
        video_bytes = f.read()

    upload_req = urllib.request.Request(upload_url, data=video_bytes, method='PUT')
    upload_req.add_header('Content-Type', 'video/mp4')
    upload_req.add_header('Content-Length', str(file_size))

    with urllib.request.urlopen(upload_req) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        video_id = res_data.get('id')
        privacy = res_data.get('status', {}).get('privacyStatus')
        title = res_data.get('snippet', {}).get('title')
        
        print("\n=======================================================")
        print("YOUTUBE VIDEO UPLOAD SUCCESSFUL!")
        print("=======================================================")
        print(f"Video ID: {video_id}")
        print(f"Title: {title}")
        print(f"Privacy Status: {privacy} (CONFIRMED PRIVATE)")
        print(f"Watch URL: https://youtu.be/{video_id}")
        print(f"YouTube Studio Link: https://studio.youtube.com/video/{video_id}/edit")
        print("=======================================================\n")
        
        return res_data

def main():
    if not VIDEO_PATH.exists():
        print(f"Error: Video file not found at: {VIDEO_PATH}")
        sys.exit(1)
        
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    access_token = get_fresh_access_token()
    cid, title = verify_channel(access_token)
    
    res = upload_video_private(access_token, VIDEO_PATH, metadata)
    
    # Save upload proof and receipt
    receipt = {
        "videoId": res.get('id'),
        "url": f"https://youtu.be/{res.get('id')}",
        "studioUrl": f"https://studio.youtube.com/video/{res.get('id')}/edit",
        "channelId": cid,
        "channelTitle": title,
        "title": res.get('snippet', {}).get('title'),
        "privacyStatus": res.get('status', {}).get('privacyStatus'),
        "uploadedAt": res.get('snippet', {}).get('publishedAt'),
        "fileSizeBytes": os.path.getsize(VIDEO_PATH),
        "filePath": str(VIDEO_PATH)
    }
    
    receipt_file = Path(r"G:\Nova Vid\exports\youtube_upload_receipt.json")
    with open(receipt_file, 'w', encoding='utf-8') as f:
        json.dump(receipt, f, indent=2, ensure_ascii=False)
    print(f"Upload proof receipt written to: {receipt_file}")

if __name__ == "__main__":
    main()
