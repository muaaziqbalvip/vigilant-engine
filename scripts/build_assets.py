"""
======================================================================================
MiTV Network - Advanced Asset Downloader & Config Builder
Description: Fetches remote URLs from Firebase, downloads large media files locally,
             and handles Emoji UTF-8 encoding for FFmpeg text files.
======================================================================================
"""

import requests
import json
import os
import sys
import datetime

# --- Configuration ---
FIREBASE_URL = "https://ramadan-2385b-default-rtdb.firebaseio.com/remote_stream_assets.json"
WEATHER_API_KEY = "24271c2e457e853449590e1f5f40b806"
ASSETS_DIR = "assets"
TEXT_DIR = "scripts"

# Define Local Asset Paths
LOCAL_VIDEO = os.path.join(ASSETS_DIR, "video.mp4")
LOCAL_AUDIO = os.path.join(ASSETS_DIR, "audio.mp3")
LOCAL_LOGO = os.path.join(ASSETS_DIR, "logo.png")
LOCAL_FONT = os.path.join(ASSETS_DIR, "font.ttf")

LOCAL_TICKER = os.path.join(TEXT_DIR, "ticker.txt")
LOCAL_OVERLAY = os.path.join(TEXT_DIR, "overlay.txt")

def ensure_directories():
    """Creates necessary directories if they don't exist."""
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(TEXT_DIR, exist_ok=True)

def download_file(url, local_path, asset_name):
    """Downloads a file from a URL securely with streaming (for large files)."""
    if not url or url.strip() == "":
        print(f"[Warning] No URL provided for {asset_name}. Skipping download.")
        return False

    print(f"[*] Downloading {asset_name} from {url[:50]}...")
    try:
        # Stream=True is crucial for large video files
        with requests.get(url, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(local_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"[+] Successfully saved {asset_name} to {local_path}")
        return True
    except Exception as e:
        print(f"[-] Failed to download {asset_name}: {e}")
        return False

def fetch_firebase_config():
    """Pulls the entire schema from Firebase."""
    print("[*] Contacting Firebase RTDB...")
    try:
        response = requests.get(FIREBASE_URL, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data:
            return data
        else:
            raise ValueError("Firebase returned empty data.")
    except Exception as e:
        print(f"[-] Firebase Error: {e}")
        # Return fallback configuration
        return {
            "is_live": False,
            "ticker_text": "MiTV Network: System Offline ⚠️ Data fetch failed."
        }

def get_weather(city):
    """Fetches weather API data."""
    if not city: return ""
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    try:
        res = requests.get(url, timeout=5).json()
        temp = res['main']['temp']
        desc = res['weather'][0]['description'].title()
        return f" | 🌤️ {city}: {temp}°C, {desc} |"
    except:
        return ""

def build_text_files(config):
    """Generates the text files ensuring UTF-8 encoding for Emoji support."""
    
    is_live = config.get("is_live", True)
    base_text = config.get("ticker_text", "MiTV Network 📺")
    weather_city = config.get("weather_city", "")
    
    weather_str = get_weather(weather_city)
    
    if not is_live:
        final_ticker = "🔴 STREAM IS CURRENTLY OFFLINE. STAND BY... 🔴"
    else:
        # Combine text and emojis
        final_ticker = f"🚀 {base_text} {weather_str} ✨ " * 3 # Repeat for smooth loop

    # Write Ticker with strict UTF-8
    with open(LOCAL_TICKER, "w", encoding="utf-8") as f:
        f.write(final_ticker)
        
    # Write Top Overlay Clock Format
    overlay_text = f"MiTV Network Live"
    with open(LOCAL_OVERLAY, "w", encoding="utf-8") as f:
        f.write(overlay_text)
        
    print(f"[+] Text files generated successfully with UTF-8 Emoji support.")

def main():
    print("="*50)
    print(" MiTV Network - Pre-Flight Asset Builder")
    print("="*50)
    
    ensure_directories()
    config = fetch_firebase_config()
    
    # 1. Download Media & Fonts
    # If a file exists from a previous run on the runner, it will overwrite it.
    download_file(config.get("video_url"), LOCAL_VIDEO, "Background Video")
    download_file(config.get("audio_url"), LOCAL_AUDIO, "Background Audio")
    download_file(config.get("logo_url"), LOCAL_LOGO, "Channel Logo")
    download_file(config.get("font_url"), LOCAL_FONT, "Custom Font (Emoji)")
    
    # 2. Verify mandatory files exist locally before allowing FFmpeg to run
    missing_critical = False
    if not os.path.exists(LOCAL_VIDEO):
        print("[-] CRITICAL: video.mp4 is missing. FFmpeg will fail.")
        missing_critical = True
        
    if not os.path.exists(LOCAL_FONT):
        print("[-] CRITICAL: font.ttf is missing. Text rendering will fail.")
        # Create a blank dummy font or exit? Best to let user know.
        missing_critical = True

    # 3. Generate Text Overlays
    build_text_files(config)
    
    if missing_critical:
        print("\n[!] Warning: Missing critical assets. Check Firebase URLs.")
        # We don't exit with error code 1 here, because we still want the action to try
        # But in a real strict environment, sys.exit(1) is better.
    else:
        print("\n[+] All systems go. Assets prepared for FFmpeg.")

if __name__ == "__main__":
    main()
  
