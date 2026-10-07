'''
www.france.tv 
A one-shot video downloader.
Use urls of the form:-
    https://www.france.tv/spectacles-et-culture/musique-hip-hop-et-rap/6731539-grand-corps-malade-au-zenith-de-lille.html
    https://www.france.tv/france-2/il-etait-une-voix-celine-dion/8763591-il-etait-une-voix-celine-dion.html
    https://www.france.tv/france-2/astrid-et-raphaelle/saison-6/7635467-le-pensionnat.html
    https://www.france.tv/france-2/capitaine-marleau/capitaine-marleau-saison-4/8812656-port-d-attache.html

set wvd location and save_path before use.
A_n_g_e_l_a Sept 2026
'''
import httpx
from pywidevine.cdm import Cdm
from pywidevine.device import Device
from pywidevine.pssh import PSSH
import re
import base64
import xml.etree.ElementTree as ET
from io import BytesIO
import subprocess
from urllib.parse import quote
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from datetime import datetime

# devlopment imports
import json
from rich.console import Console
console = Console()
# 

WVD_PATH = "/home/angela/.local/share/devine/WVDs/device.wvd"  # set valid path to wvd device
SAVE_PATH = "/home/angela/Downloads/devine/france_tv/"         # set valid path to save videos
 
N_M3U8DL_RE = 'N_m3u8DL-RE5'  # place your correct N_m3u8DL_RE name here!!
TOKEN = ""
DRM = False
client = httpx.Client(timeout=30)

'''videofactory ID only provided in Next.js embedded in main page, not in the manifest. 
So we need to extract it from the html of the main page.
Also called video_id and just id in the js.'''
def extract_video_factory_id(html: str) -> str | None:
    marker = r'\"video_factory_id\":\"'

    start = html.find(marker)
    if start == -1:
        return None

    start += len(marker)
    end = html.find(r'\"', start)
    if end == -1:
        return None

    return html[start:end]


def extract_player_config(html: str, video_id: str) -> dict:
    """Extract the volatile Magnetoscope values for this video."""

    # Next.js data is embedded with escaped quotes: \"
    # Convert it to ordinary JSON-like text first.
    clean_html = html.replace(r'\"', '"')

    marker = f'"options":{{"id":"{video_id}"'
    start = clean_html.find(marker)

    if start == -1:
        raise ValueError(
            f"Could not find Magnetoscope options for video {video_id}"
        )

    # Stay within this player's configuration so we don't accidentally
    # pick values from one of the recommended episodes.
    block = clean_html[start:start + 10000]

    # contentId is normally a string, but accept a number too.
    content_match = re.search(
        r'"contentId":(?:"([^"]+)"|(\d+))',
        block,
    )

    app_match = re.search(
        r'"app_version":"([^"]+)"',
        block,
    )

    diffusion_match = re.search(
        r'"diffusion":\{"mode":"([^"]+)"',
        block,
    )

    if not content_match:
        raise ValueError(
            "Could not extract content_id from France.tv player data"
        )

    if not app_match:
        raise ValueError(
            "Could not extract app_version from France.tv player data"
        )

    if not diffusion_match:
        raise ValueError(
            "Could not extract diffusion_mode from France.tv player data"
        )

    return {
        "content_id": content_match.group(1) or content_match.group(2),
        "app_version": app_match.group(1),
        "diffusion_mode": diffusion_match.group(1),
    }


def get_player_version(html: str) -> str:
    """Read the current Magnetoscope player version."""

    clean_html = html.replace(r'\"', '"')

    match = re.search(
        r'"playerUrl":"([^"]*main\.magnetoscope\.js[^"]*)"',
        clean_html,
    )

    if not match:
        raise ValueError("Could not find the Magnetoscope player URL")

    player_js = client.get(match.group(1), timeout=30)
    player_js.raise_for_status()

    match = re.search(
        r'getPlayerVersion",value:function\(\)\{return"([^"]+)"\}',
        player_js.text,
    )

    if not match:
        raise ValueError(
            "Could not extract the Magnetoscope player version"
        )

    return match.group(1)


def get_country_code() -> str:
    """Ask France.tv how it geolocates this connection."""
    response = client.get("https://geo-info.ftven.fr/ws/edgescape.json", timeout=30)
    response.raise_for_status()
    return response.json()["reponse"]["geo_info"]["country_code"]


def build_k7_params(html: str, video_id: str) -> dict:
    player = extract_player_config(html, video_id)

    return {
        "country_code": get_country_code(),
        "w": 1144,
        "h": 644,
        "player_version": get_player_version(html),
        "screen_w": 1920,
        "screen_h": 1200,
        "domain": "www.france.tv",
        "device_type": "desktop",
        "browser": "firefox",
        "browser_version": "155.0",
        "os": "linux",
        "diffusion_mode": player["diffusion_mode"],
        "gmt": datetime.now().astimezone().strftime("%z"),
        "content_id": player["content_id"],
        "app_version": player["app_version"],
        # urlencode/httpx converts spaces to '+', matching Magnetoscope's URL.
        "capabilities": "drm2 spr dai p2p",
    }

# Helper function to extract namespaces dynamically
def get_namespaces(xml_string):
    namespaces = dict([
        node for _, node in ET.iterparse(
            xml_string, events=['start-ns']
        )
    ])
    return namespaces

# Function to get pssh elements, filter, and print them
def parse_mpd_and_filter_pssh(mpd_content: bytes):
    # Using httpx.Client to fetch mpd response
 
    xml_data = mpd_content
    if 'denied' in xml_data.decode('utf-8'):
        print('Access denied to mpd. Check your VPN or region restrictions.')
        exit(1)

    # Convert string to BytesIO for iterparse
    xml_data_io = BytesIO(xml_data)

    # Extract namespaces dynamically
    namespaces = get_namespaces(xml_data_io)

    # Reset xml_data_io for re-parsing (as iterparse consumes the input)
    xml_data_io.seek(0)

    # Parse XML with dynamically extracted namespaces
    tree = ET.parse(xml_data_io)
    root = tree.getroot()

    # Find all pssh elements using namespaces
    pssh_elements = root.findall('.//{%s}pssh' % namespaces['cenc'])

    valid_pssh = []

    # Loop through the pssh elements and filter based on text length
    for idx, pssh_element in enumerate(pssh_elements, start=1):
        # Only consider pssh elements whose text length is < 500
        if len(pssh_element.text) < 500:
            valid_pssh.append(pssh_element.text)
            #print(f'pssh {idx}:', pssh_element.text)

    # Final message if no valid pssh elements were found
    if not valid_pssh:
        print('No valid pssh elements found for first pssh sweep of mpd. Trying next')
        return None
    else:
        return valid_pssh

def get_key(pssh, license_url):
    device = Device.load(WVD_PATH)
    cdm = Cdm.from_device(device)
    session_id = cdm.open()

    challenge = cdm.get_license_challenge(session_id, PSSH(pssh))

    headers={'nv-authorizations': TOKEN}

    license_response = client.post(license_url, headers=headers, data=challenge)
    try:
        license_response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise e

    license_content = license_response.content
    try:
        # if content is returned as JSON object:
        match = re.search(r'"(CAIS.*?)"', license_response.content.decode('utf-8'))
        if match:
            license_content = base64.b64decode(match.group(1))
    except:
        pass

    # Ensure license_content is in the correct format
    if isinstance(license_content, str):
        license_content = base64.b64decode(license_content)

    cdm.parse_license(session_id, license_content)

    keys = []
    for key in cdm.get_keys(session_id):
        if key.type == 'CONTENT':
            keys.append(f"--key {key.kid.hex}:{key.key.hex()}")

    cdm.close(session_id)
    return "\n".join(keys)

def get_drm_info(myjson, video_id):
    # 3.
    mpd_url = myjson.get('video').get("url")
    print(f"MPD URL: {mpd_url}")

    # 4.
    # prepare the json for the drm token and make the request
    thisjson ={
    "id": video_id,
    "drm_type": "widevine",
    "license_type": "online",
    "account_id": "francetv"
    }

    url = "https://k7.ftven.fr/drm-token"

    response = client.post(url, json=thisjson)


    if response.status_code != 200:
        print(f"Failed to fetch DRM token. Status code: {response.status_code}")
        exit(1)

    global TOKEN
    TOKEN = response.json().get("token")



    response = client.get(mpd_url, timeout=30)  # vpn connection, needs timeout=30

    if response.status_code != 200:
        print(f"Failed to fetch MPD. Status code: {response.status_code}")
        print(f"Response content: {response.content.decode('utf-8')}")
        exit(1)
    pssh = parse_mpd_and_filter_pssh(response.content)[0]

    lic_url = "https://api-drm.ftven.fr/v1/wvls/contentlicenseservice/v1/licenses"
            
    # 6
    keys = get_key(pssh, lic_url).lstrip('--key ')

    print(keys)

    video_title = myjson.get('meta').get("title")
    video_title = video_title + '_' + myjson['markers']['npaw']['title_episode'].replace(' ', '_')
    video_title = video_title + '_' + myjson['meta']['pre_title'].replace(' ', '_')
    print(f"Video title: {video_title}")

    return mpd_url, keys, video_title

def get_non_drm_info(myjson):
    auth_url = myjson['video']['token']['akamai']
    # extend the auth_url with the video url as a query parameter
    url = update_url_params(auth_url, {'url': myjson.get('video').get("url")})
    print(url)
    response = client.get(url, timeout=30)
    if response.status_code != 200:
        print(f"Failed to fetch master m3u8 URL. Status code: {response.status_code}")
        exit(1)
    mpd_url = response.json().get('url')
    return mpd_url

def update_url_params(url, new_params):
    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query)

    for key, value in new_params.items():
        query_params[key] = [str(value)]

    updated_query = urlencode(query_params, doseq=True)
    updated_url = urlunparse((
        parsed_url.scheme, parsed_url.netloc, parsed_url.path,
        parsed_url.params, updated_query, parsed_url.fragment
    ))
    return updated_url


def format_episode(value: str) -> str:
 
    match = re.fullmatch(r"S(\d+)\s+E(\d+)", value.strip(), re.IGNORECASE)

    if not match:
        raise ValueError(f"Invalid season/episode format: {value!r}")

    season = int(match.group(1))
    episode = int(match.group(2))

    return f"S{season:02d}E{episode:02d}"

def main():
    #####################################################################################################################
    '''
    1. Collect the video_id from the main page of the video_url.
    2. Collect k7 params to use to request video data in json form,
    3. Use the video_id to get the mpd url from the API.
    4  Collect a token by sending json to API containing the video_id.
    5. Use the mpd url to get the pssh from the mpd.
    6. Use the pssh and token as nv-authorizations in header to get the license from the license server.
    7. Use the license with the CDM to get the decryption keys.
    8. Use the decryption keys with N_m3u8DL_RE (version 5) to download the video.
    9. Use the mpd url to download the subtitles with download_subtitles.py
    '''
    #####################################################################################################################

    url = input("Enter the URL of the France.tv video: ").strip()
    # 1.
    html = client.get(url).text
    video_id = extract_video_factory_id(html)

    # 2.
    # Build the K7 request from the current France.tv player data.
    url = f"https://k7.ftven.fr/videos/{video_id}"
    params = build_k7_params(html, video_id)

    response = client.get(url, params=params, timeout=30)
    print(f"K7 URL: {response.request.url}")
    if response.status_code != 200:
        print(f"Failed to fetch video info. Status code: {response.status_code}")
        exit(1)
    myjson = response.json()

    ## development: 
    '''console.print_json(data=myjson)
    with open('video_info.json', 'w') as f:
        json.dump(myjson, f, indent=4)'''
    ## 
    # 3, 4, 5, (6), (7)
    # switch: drm or free
    if myjson.get('video').get("drm").get("active") == True:  
        print("DRM is active for this video.")
        mpd_url, keys, video_title = get_drm_info(myjson, video_id)
    else:
        print("DRM is not active for this video.")
        mpd_url = get_non_drm_info(myjson)  # master.m3u8

    video_title = myjson.get('meta').get("title")
    try:
        # additional_title sometimes missing and not all titles have a pre_title (S1 E1)
        video_title = video_title + '_' + myjson['meta']['additional_title'].replace(' ', '_')
        pre_title = format_episode(myjson['meta']['pre_title'])
        video_title = video_title + '_' + pre_title
    except:
        pass

    cmd = [
    N_M3U8DL_RE ,
    mpd_url,
    "--save-dir",  SAVE_PATH,
    "--save-name", video_title,
    "-mt",
    "-M",
    "format=mkv",
    "--auto-select",
    ]
    # for DRM video add in the decryptuon key
    if DRM:
        cmd.extend(["--key", keys])

    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd)
    # extract the vtt test stream as a sidecar for future translation via chtatGPT
    cmd = [
        "ffmpeg",
        "-loglevel", "quiet",
        "-i", 
        f"{video_title}.mkv", 
        "-map", "0:s:0",
        f"{video_title}.fr.srt",
    ]
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd)
    print(f"Subtitles saved as {video_title}.fr.srt")
    print("All done!")

if __name__ == "__main__":
    main()
