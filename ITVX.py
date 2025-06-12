# Cleaned and refactored version of ITVX.py for public release
# A_n_g_e_l_a  June 2025 

import re
import subprocess
import json
import glob
import os
from base64 import b64encode
from pathlib import Path
import httpx
from httpx import Client, Cookies
from selectolax.lexbor import LexborHTMLParser
from scrapy import Selector
from rich.console import Console
from beaupy.spinners import Spinner, DOTS
from termcolor import colored
import pyfiglet as PF
import jmespath

########     BEFORE USE   #############
########  configure paths  ############
#######################################

WVD_PATH =  "/home/angela/Programming/gits/device.wvd"  # location of widevine wvd file
SAVE_PATH = Path('./')  # current folder or set your own 

#######################################
#######################################

SAVE_PATH.mkdir(exist_ok=True, parents=True)

console = Console()
SUBS = False
spinner = Spinner(DOTS)

class ITV:
    def __init__(self):
        self.client = Client(
            headers={
                "User-Agent": "okhttp/4.9.3",
                "Accept-Language": "en-US,en;q=0.8",
                "Origin": "https://www.itv.com",
                "Connection": "keep-alive",
            },
            timeout=httpx.Timeout(10.0, connect=60.0),
        )
        self.cookies = Cookies()

    def rinse(self, string):
        string = re.sub(r'[^\w\s-]', '', string)
        string = string.replace(' ', '_').replace('&', 'and').replace(':-', '')
        string = string.replace('_-_', '_').replace(':', '').replace('_Content', '')
        string = re.sub(r'(S\d{1,2})_(E\d{1,2})', r'\1\2', string)
        return string

    def get_pssh(self, mpd_url):
        r = self.client.get(mpd_url)
        r.raise_for_status()
        kid = LexborHTMLParser(r.text).css_first('ContentProtection').attributes.get('cenc:default_kid').replace('-', '')
        s = f'000000387073736800000000edef8ba979d64acea3c827dcd51d21ed000000181210{kid}48e3dc959b06'
        return b64encode(bytes.fromhex(s)).decode()

    def get_key(self, pssh, license_url):
        from pywidevine.cdm import Cdm
        from pywidevine.device import Device
        from pywidevine.pssh import PSSH

        device = Device.load(WVD_PATH)
        cdm = Cdm.from_device(device)
        session_id = cdm.open()
        challenge = cdm.get_license_challenge(session_id, PSSH(pssh))
        response = httpx.post(license_url, data=challenge)
        cdm.parse_license(session_id, response.content)
        keys = [f"{k.kid.hex}:{k.key.hex()}" for k in cdm.get_keys(session_id) if k.type == 'CONTENT']
        cdm.close(session_id)
        return ":".join(keys)

    def get_data(self, url):
        spinner.start()

        headers = {'Referer': 'https://www.itv.com/'}
        if url.count('/') != 6:
            initresp = self.client.get(url, headers=headers, follow_redirects=True)
            sel = Selector(text=initresp.text)
            myjson = json.loads(re.search(r'\s*({.*})\s*', sel.xpath('//*[@id="__NEXT_DATA__"]').get()).group())
            episodeId = myjson['props']['pageProps']['seriesList'][0]['titles'][0]['encodedEpisodeId']['letterA']
            res = jmespath.search('{programmeSlug: programmeSlug, programmeId: programmeId}', myjson['query'])
            url = f"https://www.itv.com/watch/{res['programmeSlug']}/{res['programmeId']}/{episodeId}"

        r = self.client.get(url, follow_redirects=True)
        self.cookie_header_value = "; ".join([f"{c.name}={c.value}" for c in self.client.cookies.jar])

        sel = Selector(text=r.text)
        myjson = json.loads(re.search(r'\s*({.*})\s*', sel.xpath('//*[@id="__NEXT_DATA__"]').get()).group())
        myjson = myjson['props']['pageProps']

        res = jmespath.search("""
            episode.{
                episode: episode,
                eptitle: episodeTitle,
                series: series,
                description: description,
                channel: channel,
                content: contentInfo
            }
        """, myjson)

        title = jmespath.search("programme.title", myjson)
        episode = res['episode']
        episodetitle = res['eptitle'] or res['description'].split()[:6]
        channel = res['channel']
        series = res['series']

        extendtitle = f"{episodetitle}_{channel}_S{series}E{episode}"
        magni_url = jmespath.search('[ seriesList.[*].titles.[*].playlistUrl , episode.playlistUrl]', myjson)
        magni_url = (next (item for item in magni_url if item is not None))

        payload = json.dumps({
            "client": {"id": "lg"},
            "device": {"deviceGroup": "ctv"},
            "variantAvailability": {
                "player": "dash",
                "featureset": ["mpeg-dash", "widevine", "outband-webvtt", "hd", "single-track"],
                "platformTag": "ctv",
                "drm": {"system": "widevine", "maxSupported": "L3"}
            }
        })

        headers = {
            "Accept": "application/vnd.itv.vod.playlist.v4+json",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Content-Type": "application/json",
            "Content-Length": str(len(payload)),
            "Cookie": self.cookie_header_value,
            "Host": "magni.itv.com",
            "User-Agent": "okhttp/4.9.3"
        }

        r = self.client.post(magni_url, headers=headers, content=payload)
        return title, extendtitle, r.json()

    def download(self, url, index):
        title, extendtitle, data = self.get_data(url)
        compositetitle = title + ' ' + extendtitle
        video = data['Playlist']['Video']
        media = video['MediaFiles']

        videoname = self.rinse(re.sub(r"(\d+)", lambda m: format(int(m.group(1)), "02d"), ''.join(c for c in compositetitle if c.isprintable())))
        folder = self.rinse(title or 'specials')

        try:
            subs_url = video['Subtitles'][0]['Href']
            subs = self.client.get(subs_url)
            if subs.status_code == 200:
                SUBS = True
                with open(f"{videoname}.subs.vtt", "wb") as f:
                    f.write(subs.content)
                os.system(f"ffmpeg -loglevel quiet -hide_banner -i ./{videoname}.subs.vtt  ./{videoname}.subs.srt")
        except:
            SUBS = False
        mpd_url = media[0]['Href']
        lic_url = media[0]['KeyServiceUrl']
        pssh = self.get_pssh(mpd_url)
        key = self.get_key(pssh, lic_url)
        subs_opt = f"--mux-import:path=./{videoname}.subs.srt:lang=eng:name='English'" if SUBS else '--no-log'
        out_path = Path(f"{SAVE_PATH}/ITV/{folder}")
        out_path.mkdir(exist_ok=True, parents=True)
        videoname = f"{index}.{videoname}" if isinstance(index, int) else videoname

        command = [
            "N_m3u8DL-RE", mpd_url, "--append-url-params", "--auto-select",
            "--save-name", videoname,
            "--save-dir", str(out_path), "--tmp-dir", "./", "-mt",
            "--key", key,
            "-M", "format=mkv:muxer=mkvmerge",
            subs_opt
        ]
        spinner.stop()
        subprocess.run(command)
        print(f"[info] File saved to {out_path}/{videoname}.mkv")

        if SUBS:
            for f in glob.glob("*.vtt") + glob.glob("*.srt"):
                os.remove(f)

    def run(self):
        while True:
            url = input("Enter video url for download.\n")
            if 'watch' in url:
                self.download(url, 'No')
                break
            print("A correct download url has 'watch/<video-title>/<alpha-numeric>' in it.")


if __name__ == "__main__":
    title = PF.figlet_format(' I T V X ', font='smslant')
    print(colored(title, 'green'))
    print(colored("A Single ITVX Downloader:\n\n", 'red'))
    ITV().run()

