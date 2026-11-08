import asyncio
import os
import json
import subprocess
import edge_tts
from pathlib import Path

BASE_DIR = Path(r"G:\Nova Vid")
EXPORTS_DIR = BASE_DIR / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
FFMPEG = BASE_DIR / "bin" / "ffmpeg.exe"
FFPROBE = BASE_DIR / "bin" / "ffprobe.exe"

SCENES = [
    {
        "id": "scene_1",
        "title": "LODHI TECHX AI ECOSYSTEM",
        "subtitle": "Next-Gen AI Video Production & YouTube Automation",
        "badge": "OFFICIAL LAUNCH • NOVAVID 2.0",
        "accent": "#00F0FF",
        "urdu_text": "السلام علیکم! لودھی ٹیک ایکس کے جدید ترین پلیٹ فارم نووا وڈ اے آئی اسٹوڈیو 2.0 میں خوش آمدید۔ یہ ویڈیو تخلیق کاروں کے لیے مصنوعی ذہانت کے ایک شاندار اور انقلابی دور کا باقاعدہ آغاز ہے۔",
        "english_sub": "Welcome to LODHI TECHX's flagship NovaVid AI Studio 2.0 platform. A revolutionary new era for video creators begins today."
    },
    {
        "id": "scene_2",
        "title": "AUTONOMOUS VIDEO PIPELINE",
        "subtitle": "AI Scriptwriting • Smart Storyboard • 1080p Muxing",
        "badge": "END-TO-END AUTOMATION",
        "accent": "#7B2CBF",
        "urdu_text": "نووا وڈ آپ کے آئیڈیاز کو خودکار طریقے سے مکمل فل ایچ ڈی 1080p ویڈیوز میں ڈھالتا ہے۔ سکرپٹ رائٹنگ، اسٹوری بورڈ، صوتی تاثرات اور جدید بصری اینیمیشنز، سب کچھ خودکار ہے۔",
        "english_sub": "NovaVid autonomously transforms your ideas into Full HD 1080p videos: scriptwriting, storyboarding, audio, and animations."
    },
    {
        "id": "scene_3",
        "title": "NEURAL VOICE SYNTHESIS",
        "subtitle": "Urdu Neural Engine • Human Cadence • Studio Dynamics",
        "badge": "STUDIO-GRADE URDU TTS",
        "accent": "#10B981",
        "urdu_text": "جدید ترین نیورل وائس ٹیکنالوجی کے ذریعے قدرتی جذبات اور روانی کے ساتھ اردو آڈیو جنریشن اب انگلیوں کے اشارے پر ممکن ہے۔ اس میں ہر لفظ کا تلفظ انتہائی واضح اور معیاری ہے۔",
        "english_sub": "Cutting-edge neural voice technology delivers fluent, expressive Urdu audio narration with crystal-clear human articulation."
    },
    {
        "id": "scene_4",
        "title": "CLOUD SAAS & TENANT ISOLATION",
        "subtitle": "Multi-Tenant Architecture • Firebase Persistence • DPAPI Vault",
        "badge": "ENTERPRISE SECURITY",
        "accent": "#F59E0B",
        "urdu_text": "کلاؤڈ ساس اور محفوظ ترین ملٹی ٹیننٹ آرکیٹیکچر کی مدد سے آپ کے تمام پروجیکٹس اور ڈیٹا ڈیسک ٹاپ اور کلاؤڈ کے درمیان بغیر کسی رکاوٹ کے محفوظ طریقے سے ہم آہنگ رہتے ہیں۔",
        "english_sub": "Enterprise multi-tenant cloud architecture ensures continuous synchronization and vault-grade isolation across web and desktop."
    },
    {
        "id": "scene_5",
        "title": "AUTOMATED YOUTUBE PUBLISHING",
        "subtitle": "RFC 7636 PKCE OAuth • Instant Metadata Injection • Private Scheduling",
        "badge": "YOUTUBE CHANNEL SYNC",
        "accent": "#EF4444",
        "urdu_text": "یوٹیوب اسٹوڈیو انٹیگریشن کے ذریعے، ون کلک پرائیویٹ یا پبلک اپلوڈ، خودکار ٹائٹلز، ڈسکرپشن اور ایس ای او ٹیگز کی خودکار شمولیت آپ کے یوٹیوب سفر کو تیز ترین بناتی ہے۔",
        "english_sub": "Seamless YouTube Studio integration: instant private uploads, automated SEO tags, and scheduled publishing directly to your channel."
    },
    {
        "id": "scene_6",
        "title": "SHAPING THE FUTURE OF CREATION",
        "subtitle": "Empowering Creators Worldwide • Powered by LODHI TECHX",
        "badge": "FUTURE OF AI CONTENT",
        "accent": "#3B82F6",
        "urdu_text": "لودھی ٹیک ایکس کا مشن پاکستان اور عالمی سطح پر تخلیق کاروں کو بااختیار بنانا ہے۔ آج ہی نووا وڈ اے آئی اسٹوڈیو کا حصہ بنیں اور ویڈیو پروڈکشن کے مستقبل پر راج کریں۔ شکریہ!",
        "english_sub": "LODHI TECHX empowers creators in Pakistan and across the globe. Join NovaVid AI Studio today and conquer the future of video."
    }
]

def format_srt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

async def main():
    print("=== Step 1: Synthesizing Urdu Neural Voice Narration (Target 60-90s) ===")
    scene_audios = []
    srt_entries = []
    current_time = 0.0

    temp_audio_dir = EXPORTS_DIR / "temp_audio"
    temp_audio_dir.mkdir(exist_ok=True)

    for idx, sc in enumerate(SCENES):
        raw_mp3 = temp_audio_dir / f"{sc['id']}_raw.mp3"
        pcm_wav = temp_audio_dir / f"{sc['id']}.wav"
        
        # Synthesize using Microsoft Urdu Pakistan Neural Voice (Asad) if not already cached
        if not raw_mp3.exists():
            comm = edge_tts.Communicate(sc["urdu_text"], voice="ur-PK-AsadNeural", rate="-2%")
            await comm.save(str(raw_mp3))

        # Convert to 44.1kHz 16-bit stereo WAV if not cached
        if not pcm_wav.exists():
            subprocess.run([
                str(FFMPEG), "-y", "-i", str(raw_mp3),
                "-ar", "44100", "-ac", "2", str(pcm_wav)
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # Probe exact duration
        probe = subprocess.run([
            str(FFPROBE), "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(pcm_wav)
        ], stdout=subprocess.PIPE, text=True, check=True)
        duration = float(probe.stdout.strip())
        
        # Add 1.0 second breathing padding between scenes
        padded_duration = duration + 1.0
        sc["duration"] = padded_duration
        sc["raw_duration"] = duration
        sc["start_time"] = current_time
        sc["end_time"] = current_time + padded_duration

        # Generate padded WAV
        padded_wav = temp_audio_dir / f"{sc['id']}_padded.wav"
        subprocess.run([
            str(FFMPEG), "-y", "-i", str(pcm_wav),
            "-af", f"apad=pad_dur=1.0",
            "-ar", "44100", "-ac", "2", str(padded_wav)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        scene_audios.append(padded_wav)

        # Build SRT entry
        srt_start = format_srt_time(current_time)
        srt_end = format_srt_time(current_time + duration + 0.5)
        srt_entries.append(
            f"{idx + 1}\n{srt_start} --> {srt_end}\n{sc['urdu_text']}\n{sc['english_sub']}\n"
        )

        print(f"Scene {idx + 1} [{sc['id']}]: {duration:.2f}s (padded: {padded_duration:.2f}s) -> Start: {current_time:.2f}s")
        current_time += padded_duration

    total_duration = current_time
    print(f"\nTotal video duration: {total_duration:.2f} seconds (Target 60-90s met: {60 <= total_duration <= 90})")

    # Concatenate voice segments into narration_full.wav
    concat_audio_txt = temp_audio_dir / "audio_concat.txt"
    with open(concat_audio_txt, "w", encoding="utf-8") as f:
        for p in scene_audios:
            escaped = str(p).replace("\\", "/")
            f.write(f"file '{escaped}'\n")

    full_voice_wav = EXPORTS_DIR / "lodhi_narration_urdu_full.wav"
    subprocess.run([
        str(FFMPEG), "-y", "-f", "concat", "-safe", "0", "-i", str(concat_audio_txt),
        "-c:a", "pcm_s16le", str(full_voice_wav)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Save synchronized SRT subtitles
    srt_file = EXPORTS_DIR / "lodhi_techx_subtitles.srt"
    with open(srt_file, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_entries))
    print(f"Synchronized SRT written to: {srt_file}")

    print("\n=== Step 2: Synthesizing Dynamic Ambient Background Music (-18dB Ducking) ===")
    bg_music_wav = temp_audio_dir / "ambient_bg_music.wav"
    # Generate rhythmic technological synth chord pad using FFmpeg lavfi oscillators
    # 4 synth layers: Deep bass drone (65Hz), warm pad (130Hz/195Hz), melodic arp (390Hz), filtered noise
    bg_synth_filter = (
        f"aevalsrc=exprs='0.08*sin(2*PI*65.41*t) + "
        f"0.06*sin(2*PI*130.81*t + sin(2*PI*0.2*t)) + "
        f"0.05*sin(2*PI*196.00*t + sin(2*PI*0.3*t)) + "
        f"0.03*sin(2*PI*392.00*t + sin(2*PI*1.5*t))':s=44100:d={total_duration:.2f},"
        f"lowpass=f=1200,volume=0.22,afade=t=in:ss=0:d=2.0,afade=t=out:st={total_duration - 2.5:.2f}:d=2.5"
    )
    subprocess.run([
        str(FFMPEG), "-y", "-f", "lavfi", "-i", bg_synth_filter,
        "-ar", "44100", "-ac", "2", str(bg_music_wav)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    print("=== Step 3: Mixing Voice Narration + Ducked Background Music ===")
    mixed_audio_wav = EXPORTS_DIR / "lodhi_master_audio_mixed.wav"
    # amix filter: voice volume at 1.0 (0dB), background music ducked at 0.16 (-16dB to -18dB)
    subprocess.run([
        str(FFMPEG), "-y",
        "-i", str(full_voice_wav),
        "-i", str(bg_music_wav),
        "-filter_complex", "[0:a]volume=1.0[v];[1:a]volume=0.18[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        "-map", "[aout]", "-c:a", "pcm_s16le", str(mixed_audio_wav)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    print("\n=== Step 4: Generating High-Resolution 1080p Visual Scenes ===")
    temp_video_dir = EXPORTS_DIR / "temp_video"
    temp_video_dir.mkdir(exist_ok=True)
    rendered_scenes = []

    for idx, sc in enumerate(SCENES):
        scene_mp4 = temp_video_dir / f"{sc['id']}_visual.mp4"
        dur = sc["duration"]
        accent = sc["accent"].replace("#", "0x")
        
        # Write subtitle text to file to avoid any ffmpeg escaping issues
        sub_txt = temp_video_dir / f"{sc['id']}_sub.txt"
        with open(sub_txt, "w", encoding="utf-8") as f:
            f.write(sc["english_sub"].replace("'", ""))
        rel_sub_path = f"exports/temp_video/{sc['id']}_sub.txt"

        # High-tech animated 1080p canvas with dynamic moving tech grid, HUD elements, and branded badges
        vf = (
            f"drawbox=x=0:y=0:w=1920:h=1080:color=0x080c18:t=fill,"
            # Top branding header bar
            f"drawbox=x=0:y=0:w=1920:h=90:color=0x0f172a:t=fill,"
            f"drawbox=x=0:y=88:w=1920:h=3:color={accent}:t=fill,"
            f"drawtext=text='LODHI TECHX':x=80:y=28:fontsize=36:fontcolor=0xFFFFFF,"
            f"drawtext=text='|  NovaVid AI Studio 2.0':x=340:y=30:fontsize=32:fontcolor={accent},"
            f"drawtext=text='1080p 60fps - Enterprise Multi-Tenant SaaS':x=1360:y=34:fontsize=22:fontcolor=0x94A3B8,"
            # Central Infographic Panel
            f"drawbox=x=120:y=160:w=1680:h=680:color=0x111827@0.85:t=fill,"
            f"drawbox=x=120:y=160:w=1680:h=680:color={accent}@0.5:t=2,"
            # Badge
            f"drawbox=x=180:y=210:w=440:h=46:color={accent}@0.25:t=fill,"
            f"drawbox=x=180:y=210:w=440:h=46:color={accent}:t=1,"
            f"drawtext=text='{sc['badge'].replace('•', '-') }':x=205:y=222:fontsize=20:fontcolor=0xFFFFFF,"
            # Scene Title & Subtitle
            f"drawtext=text='{sc['title']}':x=180:y=285:fontsize=56:fontcolor=0xFFFFFF,"
            f"drawtext=text='{sc['subtitle'].replace('•', '-') }':x=184:y=365:fontsize=30:fontcolor={accent},"
            # Central animated tech pulse ring
            f"drawbox=x=180:y=430:w=1560:h=3:color=0x334155:t=fill,"
            # Animated radar scanner indicator line
            f"drawbox=x='180 + mod(t*400, 1500)':y=428:w=60:h=7:color={accent}:t=fill,"
            # Key feature bullets
            f"drawtext=text='- Native Urdu Neural Synthesis (ur-PK)':x=200:y=470:fontsize=26:fontcolor=0xE2E8F0,"
            f"drawtext=text='- Zero-Latency Cloud Firestore Tenancy':x=200:y=520:fontsize=26:fontcolor=0xE2E8F0,"
            f"drawtext=text='- YouTube Data API v3 Private Resumable Publishing':x=200:y=570:fontsize=26:fontcolor=0xE2E8F0,"
            f"drawtext=text='- Built & Verified for LODHI TECHX Master Launch':x=200:y=620:fontsize=26:fontcolor=0x38BDF8,"
            # Bottom Subtitle Backdrop
            f"drawbox=x=80:y=890:w=1760:h=150:color=0x030712@0.90:t=fill,"
            f"drawbox=x=80:y=890:w=1760:h=150:color=0x38BDF8@0.4:t=1,"
            f"drawtext=textfile={rel_sub_path}:x=(1920-tw)/2:y=950:fontsize=28:fontcolor=0xFFFFFF"
        )

        subprocess.run([
            str(FFMPEG), "-y",
            "-f", "lavfi", "-i", f"color=c=0x080c18:s=1920x1080:d={dur:.2f}:r=30",
            "-vf", vf,
            "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
            str(scene_mp4)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        rendered_scenes.append(scene_mp4)
        print(f"Rendered Visual Scene {idx + 1}/6: {dur:.2f}s")

    print("\n=== Step 5: Concatenating Visuals and Muxing Final 1080p MP4 ===")
    concat_video_txt = temp_video_dir / "video_concat.txt"
    with open(concat_video_txt, "w", encoding="utf-8") as f:
        for p in rendered_scenes:
            escaped = str(p).replace("\\", "/")
            f.write(f"file '{escaped}'\n")

    final_mp4 = EXPORTS_DIR / "LODHI_TECHX_AI_Technology_Introduction.mp4"

    # Concatenate visuals and mux master mixed audio
    subprocess.run([
        str(FFMPEG), "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_video_txt),
        "-i", str(mixed_audio_wav),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(final_mp4)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Verify final MP4
    probe = subprocess.run([
        str(FFPROBE), "-v", "error", "-show_entries",
        "format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate",
        "-of", "json", str(final_mp4)
    ], stdout=subprocess.PIPE, text=True, check=True)
    probe_data = json.loads(probe.stdout)

    stat = os.stat(final_mp4)
    print("\n=======================================================")
    print("FINAL 1080p MASTER MP4 GENERATION COMPLETED SUCCESSFULLY")
    print("=======================================================")
    print(f"File Path: {final_mp4}")
    print(f"File Size: {stat.st_size:,} bytes ({stat.st_size / (1024*1024):.2f} MB)")
    print(f"Duration: {float(probe_data['format']['duration']):.2f} seconds")
    print(f"Streams: {len(probe_data.get('streams', []))}")
    for s in probe_data.get("streams", []):
        print(f" - {s.get('codec_name')} | {s.get('width', '')}x{s.get('height', '')} | fps: {s.get('r_frame_rate', '')}")

    # Write Project Metadata JSON
    metadata = {
        "projectId": "lodhi_techx_ai_intro_master",
        "title": "LODHI TECHX — AI Technology Introduction",
        "description": (
            "Official demonstration of NovaVid AI Studio 2.0 by LODHI TECHX.\n\n"
            "Features:\n"
            "• End-to-end autonomous AI video creation\n"
            "• Studio-grade Urdu neural voice narration\n"
            "• 1080p 60fps high-definition rendering\n"
            "• Multi-tenant cloud synchronization\n"
            "• Automated YouTube channel publishing\n\n"
            "Brand Owner: LODHI TECHX\n"
            "Website: https://novavid-ecfc8.web.app\n"
            "Privacy: Private (Acceptance Verification Test)"
        ),
        "tags": [
            "LODHI TECHX",
            "NovaVid",
            "AI Technology",
            "AI Video Creation",
            "YouTube Automation",
            "Urdu AI Voice",
            "Pakistan Tech",
            "SaaS"
        ],
        "categoryId": "28", # Science & Technology
        "privacyStatus": "private",
        "madeForKids": False,
        "language": "ur",
        "defaultAudioLanguage": "ur",
        "filePath": str(final_mp4),
        "fileSizeBytes": stat.st_size,
        "durationSeconds": float(probe_data['format']['duration']),
        "resolution": "1920x1080",
        "subtitlesFile": str(srt_file),
        "narrationAudioFile": str(full_voice_wav),
        "mixedAudioFile": str(mixed_audio_wav),
        "channelId": "UCL1USyVzIikDT-K1OIg69_w",
        "channelTitle": "Lodhi TechX"
    }

    with open(EXPORTS_DIR / "lodhi_techx_first_video_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Metadata saved to: {EXPORTS_DIR / 'lodhi_techx_first_video_metadata.json'}")

if __name__ == "__main__":
    asyncio.run(main())
