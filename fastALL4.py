''''
An alternative Channel 4 downloader using web-browser web endpoints. 
Whilst it recovers 1080p resolution video, the bitrate is not quite
as high as Android endpoints provide.
The script is fast!  After the first run, when python creates runtime files and an AES key is fetched and stored, the time to start downloading appears almost instantaneous.

A_n_g_e_l_a & Marvin  October 2025

USE: Just enter the C4 program_id found at the end of video urls eg 77297-003

'''
from httpx import Client, HTTPError
import re
import json
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7
import base64
from pywidevine.pssh import PSSH
from pywidevine.device import Device
from pywidevine.cdm import Cdm
import os
import subprocess
import struct, uuid
from concurrent.futures import ThreadPoolExecutor
import sys
import pyfiglet as PF

SERVICE_CERT_HINT = "CAQ="
KEYCACHE = "./.keycache/C4keydata.json"
n_m3u8dl = "N_m3u8DL-RE"  

# -- set this for your preferences
DOWNLOAD_DIR = "/home/angela/Downloads/devine/"
WVD_PATH = "./device.wvd"
# -- end set

# --- create tmp folder to hold subtitles
if not os.path.exists("./tmp"):
      os.makedirs("./tmp")
# --- ./tmp deleted by N_m3u8dl_re on completion

# --- create keycache folder to store AES KEY/IV
if not os.path.exists("./.keycache"):
      os.makedirs("./.keycache")
# --- 

class KeyRefreshNeeded(Exception):
    pass

# data silo
class Title():
    def __init__(self, title, episode,subtitle, key, episode_id = None):
        self.title = title
        self.episode = episode # any text for episode
        self.episode_id = episode_id  # in form S01E02
        self.subtitle = subtitle
        self.key = key # media decryption

# -- OUTLINE
# -- 1. look for cached AES KEY, IV previously obtained
# -- 2. If not found, download app.bundle.js and search for KEY,IV and store
# -- 3. Get VOD Stream data for the program_id
# -- 4. From data returned find enc_token - and decrypt with AES KEY,IV to find license url and ANOTHER token.
# -- 5. Use new token and license url to obtain a certificate.  (1st license call)
# -- 6. Create DRM Challenge and include certificate in POST request to license url (2nd license call)
# -- 7. Parse license response for media decryption KEYS

# -- decryption related --
def load_cached_keys():
    try:
        with open(KEYCACHE, "r") as f:
            data = json.load(f)
            f.close()
        KEY = data.get("KEY", "").encode()
        IV  = data.get("IV", "").encode()
        if len(KEY) != 16 or len(IV) != 16:
            raise ValueError("Bad key/iv lengths")
        return KEY, IV
    except FileNotFoundError:
        return None
    except Exception:
        # Corrupt cache: remove and refetch
        try: os.remove(KEYCACHE)
        except FileNotFoundError: pass
        return None

def save_cached_keys(KEY: bytes, IV: bytes):
    tmp = KEYCACHE + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"KEY": KEY.decode(), "IV": IV.decode()}, f)
        f.close()
    os.replace(tmp, KEYCACHE)

def fetch_fresh_keys(client):
    url = "https://static.c4assets.com/all4-player/latest/bundle.app.js"
    try:
        bundle = client.get(url, timeout=8).text
    except HTTPError as e:
        raise RuntimeError(f"fetch bundle.app.js failed: {e}")

    k_hits = re.findall(r'"bytes1":"([^"]+)"', bundle)
    v_hits = re.findall(r'"bytes2":"([^"]+)"', bundle)

    if not k_hits or not v_hits:
        raise RuntimeError("bytes1/bytes2 not found in bundle.app.js")

    KEY_s, IV_s = k_hits[0], v_hits[0]
    KEY, IV = KEY_s.encode("latin-1"), IV_s.encode("latin-1")

    if len(KEY) != 16 or len(IV) != 16:
        raise RuntimeError(f"KEY/IV wrong size ({len(KEY)}, {len(IV)}), expected 16/16")

    save_cached_keys(KEY, IV)
    return KEY, IV

def get_keys_with_cache(client):
    kv = load_cached_keys()
    if kv:
        return kv
    return fetch_fresh_keys(client)

def decrypt_message(message_b64: str, KEY: bytes, IV: bytes) -> str:
    try:
        decryptor = Cipher(algorithms.AES(KEY), modes.CBC(IV), backend=default_backend()).decryptor()
        unpadder = PKCS7(128).unpadder()
        cbytes = b64u_decode(message_b64)  
        padded = decryptor.update(cbytes) + decryptor.finalize()
        pt = unpadder.update(padded) + unpadder.finalize()
        return pt.decode("utf-8")
    except Exception as e:
        # Signal caller to refresh keys
        raise KeyRefreshNeeded from e
        
def b64u_decode(s: str) -> bytes:
    """
    Decode a URL-safe Base64 string (with '-' and '_') and
    auto-fix missing padding.
    """
    s = s.strip().replace("\n", "")
    s += "=" * (-len(s) % 4)  # pad to multiple of 4
    return base64.urlsafe_b64decode(s)
#  --- end decryption ops ---

# -- create pssh box
def make_widevine_pssh(kid_hex: str,
                       system_id: str = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
                       version: int = 0) -> str:
    """
    Build a Widevine PSSH (v0) containing one KID.
    Returns base64-encoded PSSH box.
    """
    # SystemID as 16 raw bytes (no dashes)
    sysid_bytes = uuid.UUID(system_id).bytes  # big-endian, correct for MP4/pssh

    # KID as 16 bytes
    kid_bytes = bytes.fromhex(kid_hex.replace("-", ""))
    if len(kid_bytes) != 16:
        raise ValueError("KID must be 16 bytes (32 hex chars).")

    # Widevine PSSH data: field 0x12 (repeated key_id), length 0x10 (16), then the KID
    # This is the minimal valid Widevine protobuf payload.
    data = b"\x12\x10" + kid_bytes

    # MP4 'pssh' box: size(4) + type(4) + version/flags(4) + systemID(16) + data_size(4) + data
    size = 4 + 4 + 4 + 16 + 4 + len(data)
    box = struct.pack(">I4sI16sI", size, b"pssh", version, sysid_bytes, len(data)) + data

    return base64.b64encode(box).decode("ascii")


def get_kid(transcode_id: str) -> str:
    ''' C4, uniquely, allows default_kid to be constructed,
        transcodeId is normally 7 or 8 binary digits.
        code here deals with length differences'''
    n = int(transcode_id, 10)                # decimal → int
    if not (0 <= n <= 0xFFFFFFFF):
        raise ValueError("transcode_id out of 32-bit range")
    tail = f"{n:08x}"                        # 8 hex chars, zero-padded
    return "0" * 24 + tail       
    

def generate_pssh(transcodeId: str = None):
    default_kid = get_kid(transcodeId)
    return make_widevine_pssh(default_kid)
  

# --- Widevine license helper ---
DEFAULT_HEADERS = {
    "Content-type": "application/json",
    "Accept": "*/*",
    "Referer": "https://www.channel4.com/",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0"
}

def build_drm_today_payload(request_id: str, token: str, mpd_url: str, message_b64: str = "") -> dict:
    # build payload to match C4 pattern
    payload = {}
    if token:
        payload["token"] = token
    if request_id:
        payload["request_id"] = request_id
    if mpd_url:
        payload["video"] = {"type": "ondemand", "url": mpd_url} 
    if message_b64:
        payload["message"] = message_b64
    else:
        payload['message'] = SERVICE_CERT_HINT
    return payload
    

def post_json(client, url: str, data: dict, headers: dict) -> dict:
    r = client.post(url, json=data, headers=headers)
    try:
        j = r.json()
    except Exception:
        raise RuntimeError(f"License server returned non-JSON (HTTP {r.status_code}): {r.text[:500]}")
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code} from license server: {j}")
    return j

def fetch_service_certificate(client, lic_url: str, request_id: str, lic_token: str, mpd_url: str) -> str:
    # First POST: get signed DRM service certificate
    payload = build_drm_today_payload(request_id, lic_token, mpd_url)
    j = post_json(client, lic_url, payload, DEFAULT_HEADERS)
    if not j.get("license"):
        raise RuntimeError(f"Missing 'license' field in service certificate response: {j}")
    return j["license"]

def request_license(client, lic_url: str, request_id: str, lic_token: str, mpd_url: str, challenge_bytes: bytes) -> str:
    # Second POST: base64 of the CDM challenge inside 'message'
    challenge_b64 = base64.b64encode(challenge_bytes).decode("ascii")
    payload = build_drm_today_payload(request_id, lic_token, mpd_url, message_b64=challenge_b64)
    j = post_json(client, lic_url, payload, DEFAULT_HEADERS)
    if not j.get("license"):
        raise RuntimeError(f"Missing 'license' field in license response: {j}")
    return j["license"]

def pad_number(number):
    return format(int(number), "02d")

def prompt_prog_id(default="74015-001"):
    try:
        s = input(f"Program ID ({default})?: ").strip()
        return s or default
    except (KeyboardInterrupt, EOFError):
        print("\nAborted.", file=sys.stderr)
        raise

def main(url):
    client = Client()
    
    with ThreadPoolExecutor(max_workers=1) as ex:
        key_future = ex.submit(get_keys_with_cache, client)  # disk/network in background
        if url == "":
            progId = prompt_prog_id()
        else:
            progId = url.split('/')[-1]
    

    try:
        my_data = client.get(f"https://www.channel4.com/vod/stream/{progId}").json()
    except HTTPError as e:
        raise RuntimeError(f"fetch vod stream data failed: {e}")

    vps = my_data["videoProfiles"]
    if len(vps) <= 1:
        raise RuntimeError(f"Expected at least 2 profiles; got {len(vps)}: {vps!r}")

    stream = vps[1]["streams"][0]
    # sanity: make sure it's still the one we expect
    expected = "dashwv-dyn-stream-1"
    actual = vps[1].get("name", "?")
    if actual != expected:
        raise RuntimeError(f"Profile[1] changed: expected '{expected}', got '{actual}'. Full entry: {vps[1]!r}")
    uri = stream["uri"]
    enc_token = stream["token"]
    asset_id = my_data["transcodeId"]   # both names 'asset_id' and 'transcodeId' used in code
    
    # wait for keys from threadPoolExecutor
    KEY, IV = key_future.result()
    # the stream token hides -> lic_url | lic_token  so decrypt with KEY, IV found in bundles.js
    try:
        decoded = decrypt_message(enc_token, KEY, IV)
    except KeyRefreshNeeded:
        # Refresh keys ONCE and retry decrypt
        try:
            os.remove(KEYCACHE)
        except FileNotFoundError:
            pass
        KEY, IV = fetch_fresh_keys(client)
        # --- license url and token hidden; use KEY and IV to decrypt
        decoded = decrypt_message(enc_token, KEY, IV)

    lic_url, lic_token = decoded.split("|", 1)

    # PSSH 
    pssh_b64 = generate_pssh(transcodeId=asset_id)

    # --- Widevine essentials start ---
    # --- uses a certificate to authorise  cdm key exchange ---
    # --- first negotialte certificate then get the license ---
    
    device = Device.load(WVD_PATH)
    cdm = Cdm.from_device(device)
    session_id = cdm.open()
    try:
        # 1) Service certificate (first POST, message = 'CAQ=' (found using httptoolkit and watching json exchanges))
        service_cert_b64 = fetch_service_certificate(client, lic_url, asset_id, lic_token, uri)
        # 2) Set the service certificate
        cdm.set_service_certificate(session_id, service_cert_b64)
        # 3) Build challenge
        challenge = cdm.get_license_challenge(session_id, PSSH(pssh_b64), privacy_mode=True)
        # 4) Request license (second POST with message=base64(challenge))
        license_blob = request_license(client, lic_url, asset_id, lic_token, uri, challenge)
        # 5) Parse license and dump keys
        cdm.parse_license(session_id, license_blob)
        key = None
        for k in cdm.get_keys(session_id):
            if k.type == "CONTENT":
                key = f"{k.kid.hex}:{k.key.hex()}"
        if not key:
            raise RuntimeError("No CONTENT keys in license response")

    finally:
        cdm.close(session_id)
    # --- Widevine essentials end ---
    # --- Have Key, mpd  now need
    # --- collect data for video download ---

    title = my_data["brandTitle"].replace(':','')  # ; upsets N_m3u8
    websafe_title = my_data['webSafeBrandTitle']   # for url constuction
    episode = my_data["episodeTitle"]
    subtitle = my_data["subtitlesAssets"][1]["url"]
    # -- get series and episode numbers
    vid_url = f"https://www.channel4.com/programmes/{websafe_title}/on-demand/{progId}"
    try:
        vid_cont = client.get(vid_url).text
    except HTTPError as e:
        raise RuntimeError(f"fetch episode/series data failed: {e}")

    regex = re.findall(r"name=\"title\" content=\"(.*?)\W{1,3}On\WDemand", vid_cont)
    # --- If we have episode data
    try:  
        _, epnum, _, sernum = regex[0].split(' ')
        epnum = pad_number(epnum)
        sernum = pad_number(sernum)
        episode_id = (f"S{sernum}E{epnum}")
    except:
        epnum = ''
        sernum = ''
        episode_id = ''

    if episode in title:
        episode = '' # avoid repetitive strings in programme title build

    
    # --- store subtitle file 'w' in file open will mean 
    #     over-write of existng contents - easy re-use
    my_title = Title(title, episode, subtitle, key, episode_id)

    subs = client.get(my_title.subtitle).text
    try:
        with open("./tmp/subtitles.srt", 'w') as f:
            f.write(subs)
            f.close()
    except FileNotFoundError:
        subs = None
    except Exception:
        # Corrupt cache: remove and refetch
        try: os.remove(KEYCACHE)
        except FileNotFoundError: pass
        subs = None 

    # N_m3u8DL-RE to do download
    command = ([
            n_m3u8dl,
                uri,
                #'--auto-select',
                '-sa',
                'all',
                '-sv',
                'best', 
                '-ds',
                'id="0"',
                '--save-name',
                f"{my_title.title} {my_title.episode} {my_title.episode_id}",
                '--save-dir',
                f'{DOWNLOAD_DIR}/C4/{my_title.title}/',
                '--tmp-dir',
                "./tmp",
                '--no-log',
                '--key',
                my_title.key,
                '-mt',   
                '-M',
                'format=mkv:muxer=mkvmerge',
                ])
    if subs:
        command.append("--mux-import:path=./tmp/subtitles.srt:lang=en:name='English'")
            # bastard nilaoda!! Command nothing like --help tells it!
    subprocess.run(command)

if __name__=="__main__":
    title = PF.figlet_format(' A L L 4 ', font='smslant')
    print(title)
    main("")  
