> **Notes on my journey to get a working Content Decryption Module (CDM) and decrypting videos**
> 
> > Well, that was how it started out in March 2022, but things change and many edits later this has morphed into a how-to
> 
> > If you wish to read **the original post, it is archived here** [https://forum.videohelp.com/threads/414908-Now-out-of-date-Archived-for-reference](https://forum.videohelp.com/threads/414908-Now-out-of-date-Archived-for-reference)
> 
> _This post is the first in what has become a series about decrypting internet streamed videos '[Decryption: The Temple of Doom](https://forum.videohelp.com/threads/404994-Decryption-and-the-Temple-of-Doom)'  
> '[Decryption: The Dungeon of Despair](https://forum.videohelp.com/threads/407216-Decryption-The-Dungeon-of-Despair)' and [Decryption: The Last Crusade](https://forum.videohelp.com/threads/408557-Decryption-The-Last-Crusade)  
> The information herein is not original to me, but culled from experts in this forum and elsewhere, as I have made a journey from a confused and bewildered newbie to a confused and bewildered 'oldie' but now being able to download a few videos. I have no experience of getting the stuff behind pay-walls, but the principles of encryption and decryption are much the same everywhere._  
>   
> New methods and scripts have become available to make the whole process of grabbing videos easier; hence this rewrite.  
>   
> This post deals with:
> 
> > 1.  **Obtaining a Content Decryption Module from a working Android Device**
> > 2.  **Downloading and decrypting media streams so they become playable**
> 
> A Content Decryption Module contains a Client\_Id, that says what the device is and its capabilities are and it contain a public key certificate., The CDM also has a Private-Key. The process of key exchange is similar to that of Secure Shell (ssh) type of communication where public keys are shared and used to encrypt data for passing on to be decrypted by a private-key. Think of the Client\_Id as being the public key. A python module or collection of scripts wraps up a video stream identifier (pssh) with your client\_Id and sends it to license server on the content-providers network. The license server reads the pssh and client\_id and uses your client\_Id to encrypt data to respond to your request. Pywidevine takes your private key and decrypts the message to deliver decryption keys. The CDM public/private\_key pair are unique and indispensable.  
>   
> If you have picked up a CDM from one of the many give-aways dotted around this website, then jump to the Decrypting section. If you wish to liberate your own then continue here. In the following I can only assume you have a rooted or pre-rooted device - if not go to xda-developers.com and find out how to root your device.  
>   
> **Obtaining a Content Decryption Module from a working Android Device - Real or Virtual**  
> **This section is relevant if you have an unlocked and rooted physical OR virtual Android device**  
> 
> > _Note if you do not have access to a physical device then a virtual device can also be made to give up its CDM see [Dumping-Your-own-L3-CDM-with-Android-Studio"](http://[URL="https://forum.videohelp.com/threads/408031-Dumping-Your-own-L3-CDM-with-Android-Studio)  
> > The method is newly described here, since June 2024, and easier that that described at Dumping-Your-own-L3-CDM-with-Android-Studio - although by all means use that to set-up a virtual Android device._
> 
> The method of extracting your own CDM has changed for the better since the advent of **KeyDive** \> [https://github.com/hyugogirubato/KeyDive](https://github.com/hyugogirubato/KeyDive) which uses **Magisk** modules to run **Frida** scripts on your phone or Android device. Using Magisk saves your time and effort. Using keydive ensures the python script, javascript and Frida all work in well-timed harmony.  
> 
> *   **Install Magisk to your Android Device**
> 
> > Frida-server is software that runs on the device, phone, tablet or TV-box and intercepts certain functions that run on the device while decrypting and playing a video.  
> > Magisk is way of giving ADB root permissions on your Android device and hosting special software- and you surely have it already - otherwise, why are you here?. See xda-developers on how to root your device if not rooted already. When you've done that install magisk.apk from here [https://github.com/topjohnwu/Magisk/releases/tag/v27.0](https://github.com/topjohnwu/Magisk/releases/tag/v27.0)  
> >   
> > Once installed find 'settings' in the Magisk App and select 'Superuser Access' and set it to 'Apps and ADB'. Then reboot your device.
> 
> *   **Install keydive to your PC**
> 
> > With your rooted phone, tablet or TV-Box, now is the time to follow instructions at [https://github.com/hyugogirubato/KeyDive/blob/main/README.md](https://github.com/hyugogirubato/KeyDive/blob/main/README.md). It will dump a Client iD and Private Key, (a CDM), from any Android device, up to and including Android 14 at the time of this edit. Although Android 14 _may_ need extra files to be pulled off the phone and analysed using Ghidra, [https://github.com/NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra)  
> >   
> > But before we do that make sure you also install the python module, 'frida', **to your PC** so keydive has access.  
> > 
> > Code:
> > 
> > pip install frida
> 
> **The guide to CDM extraction given at KeyDive on Github is full and comprehensive and copes with most situations. I've extracted a CDM from a google Pixel 6a running Android SDK34 (Android 14)** .  
> Download the latest version of Keydive [https://github.com/hyugogirubato/KeyDive/releases](https://github.com/hyugogirubato/KeyDive/releases)  
> Read installation documents [https://github.com/hyugogirubato/KeyDive/blob/main/README.md](https://github.com/hyugogirubato/KeyDive/blob/main/README.md)  
> Find modules Keydive needs installed as Magisk modules: see here [https://github.com/hyugogirubato/KeyDive/blob/main/docs/PACKAGE.md#liboemcrypto-disabler](https://github.com/hyugogirubato/KeyDive/blob/main/docs/PACKAGE.md#liboemcrypto-disabler)  
>   
> You need to install magiskFrida as a module to your phone so download the linked latest release as a zip and  
> 
> Code:
> 
> adb push file.zip /sdcard/
> 
> In magisk on your device select modules , 'Install from storage' locate the zip and install. If you think you need liboemcrypto\_disabler install that too, following a similar process.  
> Your phone will now have this:-  
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=79649)  
> \[Attachment 79649 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=79649)  
>   
> **Use KeyDive to extract a CDM from your device**  
>   
> Note deviceID below is the adb ID that gets printed if you issue the command  
> 
> Code:
> 
> adb devices
> 
> while adb is connected to your device  
>   
> To run keydive  
> 
> Code:
> 
> python keydive.py -a -d <deviceID> -w
> 
> The -a switch tells keydive to automatically open your phone browser and load the bitmovin.com/demos/drm page.  
>   
> The -w switch asks keydive to produce a WideVine Descriptor file (wvd) this file may be linked to in any script that uses pywidevine, (a python module to get keys), and is a compact way of accessing your newly liberated Content Decryption Module.  
>   
> Once you have a device.wvd file, (your CDM), name it something short and simple and save it somewhere safe on your system; you wlll link to it from scripts.  
>   
> if your device is running Android SDK 34 you will need to use ghidra decompiler to produce a functions.xml file ot look here to see if your device has a functions file posted [https://forum.videohelp.com/threads/414789-KeyDive-Beyond-Android-SDK-33](https://forum.videohelp.com/threads/414789-KeyDive-Beyond-Android-SDK-33)  
>   
> And that is it you now should have a working CDM in the form of a ClientId and Private\_key.pem tucked away in devices at the root of the Keydive folder. Since the WVD is shorthand for both ClientID and Private\_key.pem - you will be unlikely to use these directly again. But keep them to re-create the WVD if ever it gets deleted by mistake.  
>   
>   
> **Decryption**  
>   
> _This section shows how to use your new found CDM_  
> There are two ways you will see referenced to get keys; using WKS-KEYS or Pywidevine. Any scripts you may find will use one or the other. However please regard WKS-KEYS as historic and replaced by pywidevine.  
>   
> It is pywidevine that uses the wvd file you have saved. If you haven't yet created a wvd file then see below in the annex and then return here.  
>   
> Open Firefox or Chrome and navigate back to [https://bitmovin.com/demos/drm](https://bitmovin.com/demos/drm) and open web developer tools (ctrl+shift+c) and click on the network tab  
>   
> In the Network tab filter bar, filer for mpd  
>   
> Play the video on the site - you may need to ctrl+R to refresh the page before you see a single entry.  
> In the left hand panel click on url and select copy URL - (see image below)  
> Paste the url in a new tab in your browser Firefox or Chrome and a small file will be downloaded. Click on the file from the browser and it will open in Chrome.  
>   
> The mpd file is a Media Presentation Description which has details to access the media.  
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=79675)  
> \[Attachment 79675 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=79675)  
>   
> 
> Code:
> 
> curl https://bitmovin-a.akamaihd.net/content/art-of-motion\_drm/mpds/11331.mpd
> 
> it will print to your command window, look for <cenc : pssh> and text starting with AAAA to </cenc : pssh> Copy it. (extra spaces in cenc ~ pssh to avoid unwanted smiley faces!! )  
>   
> The license server is the place we send an encrypted message containing the pssh and details of our wvd. The compiled data is called a challenge. When the pywidevine module receives a response, it is an encrypted message and it needs the CDM to decrypt it.  
>   
> To find the license URL click on the network tab, then in the filter URLs: type in method:POST. Under the 'domain' look for the licensing server, in this case it's [https://cwip-shaka-proxy.appspot.com/no\_auth](https://cwip-shaka-proxy.appspot.com/no_auth) right click on this value and copy value -> copy URL and paste this for later reference.  
>   
> Now we have everything we need, let's go ahead and run script to obtain keys.  
>   
> keydive produced a file ending 'wvd' in a folder beneath devices - may be quite a long path. Go down through the folders and copy the wvd file to a more accessible place and rename as you wish to indicate which device it came from; make sure to have the wvd extension.  
>   
> To find keys from simple sites that need no headers or extra data and uses bytes for sending data we may use a feature of pywidevine.  
>   
> 
> Code:
> 
>  pywidevine license -t STREAMING /<full or relative path to your>/device.wvd   PSSH License\_URL
> 
> results in 5 sets of keys being returned one set for each of the screen resolutions offered by bitmovin  
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=79679)  
> \[Attachment 79679 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=79679)  
> Remember this; for simple sites it it a quick and easy way to get keys.  
>   
> **Practice Download of Video; Getting Keys and Decrypting**  
>   
> This Irish site - mainly Gaelic language - is easy for beginners - and is reported as available from Europe and the USA and I expect everywhere.  
> To get your own keys for the first time, I suggest you look at [https://tg4.ie](https://tg4.ie) - it is the most simple real site I know. Select any video and play Hold both crtl and shift while pressing C to open the web-developer tools for your browser (firefox or chrome)  
>   
> Now you can still interact with the screen while filtering and intercepting web-traffic. Filter for mpd see here by going to the network tab and adding mpd to the filter.  
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=79625)  
> \[Attachment 79625 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=79625)  
> Click on the url and save it. The mpd (Media Presentation Description) file that has data for the browser to read and download the video in fragments.  
>   
> It looks like this (now out of date) mpd
> 
> Code:
> 
> https://manifest.prod.boltdns.net/manifest/v1/dash/live-baseurl/bccenc/1555966122001/38dfe47f-f6c1-45d0-933c-affb932deaac/6s/manifest.mpd?fastly\_token=NjY4NDIzYmRfNGFkMGE4ZDdjY2IxOTEwZjFhNDJjMmYyYjAyOWYzMjg2YTRlY2I0ZjAzMWI0Yjg5MTE5MzgxZTdlNzE0N2YzMw%3D%3D
> 
> Use one of the methods described above and search for the pssh starting 'AAAA' and copy it. I prefer curl from the command line  
> The mpd file will usually list a pssh and sometimes a license url. The license url may be found by filtering the network traffic for 'lic' Choose the filter in web developer tools (ctrl+shift+c) to be method:POST  
>   
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=79627)  
> \[Attachment 79627 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=79627)  
>   
> You will need to save TWO things for certain and MAYBE THREE:
> 
> 1.  PSSH
> 2.  The License URL, and possibly, for more complex sites
> 3.  The cURL of the license
> 
> But, for now with the tg4.ie practice-site, we only need PSSH and License URL.  
>   
> Downloaded the video with a modern down-loader:- N\_m3u8DL-RE found at [https://github.com/nilaoda/N\_m3u8DL-RE/releases](https://github.com/nilaoda/N_m3u8DL-RE/releases) :-  
> Unpack the binary and give it execute permissions (chmod +x <filename>) and make sure the binary is in your system's PATH  
>   
> So here is the sequence:-
> 
> 1.  Site URL  
>     
>     Code:
>     
>     https://www.tg4.ie/en/player/online-boxsets/play/?pid=6281115686001&series=An%20Cuan&genre=Faisneis
>     
> 2.  MPD - describes the media and how to get it.  
>     Developer Tools (F12 in your browser) select Network tab and **enter 'mpd' in the filter box.** Then start the video. Copy the url. It will look _similar_ to this, BUT DO NOT USE THIS ONE, get a fresh copy. as it carries a token, which needs to be fresh each use.  
>     
>     Code:
>     
>     https://manifest.prod.boltdns.net/manifest/v1/dash/live-baseurl/bccenc/1555966122001/982ce523-a4b1-4a94-91c6-c7a9a8b082f8/6s/manifest.mpd?fastly\_token=NjNlNjNlYzhfN2YyY2QxMGFjMzMzMDY0ZGE2ZjFiYzY3ZDViMzI3YmQxMjM0ZWVhMzgyMjVkNmY1YzE0NzJlNDUwMGUyNTg1NA%3D%3D
>     
> 3.  PSSH found by inspecting the contents of mpd. Network tab - filter on 'mpd' click on the link and look under 'Response' for a string starting AAAA  
>     
>     Code:
>     
>     AAAAVnBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAADYIARIQ8hNTzeGOTayckD5Lc4sBSBoNd2lkZXZpbmVfdGVzdCIIMTIzNDU2NzgyB2RlZmF1bHQ=
>     
>     PSSH remains the same for this media.
> 4.  License URL - found by filtering on 'lic' in Network tab of Developer Tools carries a token which needs to be fresh each use. It looks similar to this - BUT DO NOT USE THIS ONE, get a fresh copy.  
>     
>     Code:
>     
>     https://manifest.prod.boltdns.net/license/v1/cenc/widevine/1555966122001/982ce523-a4b1-4a94-91c6-c7a9a8b082f8/f21353cd-e18e-4dac-9c90-3e4b738b0148?fastly\_token=NjNlNGRjNDhfMzJmMTZhMWVmMmVlYTM1OTdmZTk4NjI0ZTI1M2E5ODYzZTY0NDAyOGEwZTc5MzVhYzkyZDNkZGNmNmY4OWJiNA%3D%3D
>     
> 5.  Download encrypted files:  
>     \[code\]
>     
>     Code:
>     
>     N\_m3u8DL-RE <your MPD url found at item 2>  --save-name encrypted
>     
> 6.  Individually decrypt the audio and video streams using mp4decrypt and the keys you have just obtained!  
>     
>     Code:
>     
>     mp4decrypt --key f21353cde18e4dac9c903e4b738b0148:e564eb646db649ea07e85700765d2349  <encrypted.mp4>  <myvideo.mp4>
>     
>     Code:
>     
>     mp4decrypt --key f21353cde18e4dac9c903e4b738b0148:e564eb646db649ea07e85700765d2349  <encrypted.m4a>  <myaudio.m4a>
>     
> 7.  Merge audio and video with ffmpeg  
>     
>     Code:
>     
>     ffmpeg -i myvideo.mp4 -i myaudio.m4a -vcodec copy -acodec copy myWatchableMovie.mp4
>     
> 
>   
> When you have digested the above and got your CDM, tried a few keys, [The Dungeon of Despair](https://forum.videohelp.com/threads/407216-Decryption-The-Dungeon-of-Despair) awaits your pleasure!! And is that isn't enough for you then [Downloading-and-Decryption-on-your-Android-Phone](https://forum.videohelp.com/threads/405466-Downloading-and-decryption-on-your-Android-phone) might occupy your mind for a while.  
>   
> **Annex:**  
> **Running python scripts in a special Python environment.**  
>   
> Python has a problem. After lots of script downloads and installing all the necessary module or extra libraries to make the script run you can arrive at a situation where one script needs a 'pip install mybigmodule==10.2.21' but you have another script on your system that must use mybigmodule<=9.5.0. So if you follow the direction for one script it stops the other from working.  
>   
> The solution is to create a named python virtual environment (venv) in which to run the first script and another named virtual environment to run second, etc. NOTE: Most all operating systems now enforce the use of a virtual python environment. But each would require its own Terminal Session. I.e. one env would not know of the other.  
>   
> \### General Considerations  
> 1\. \*\*Activation\*\*: The venv needs to be activated in each terminal session where you want to use it. This involves running a specific activation script that sets up the environment for that session.  
> 2\. \*\*Path to the venv\*\*: When the venv is activated, it modifies the \`PATH\` environment variable to point to the venv's \`bin\` or \`Scripts\` directory, where the Python executable and installed packages reside.  
>   
> \### Operating System-Specific Details  
>   
> \#### Windows  
> \- \*\*Activation\*\*: Typically, you activate a venv with the command:  
> 
> Code:
> 
>   .\\venv\\Scripts\\activate
> 
> \- \*\*Usage\*\*: Once activated, you can use the venv from any directory. You can open a terminal, navigate to any folder, and run the activation script to start using the venv.  
>   
> \#### macOS and Linux  
> \- \*\*Activation\*\*: You activate a venv with the command:  
> 
> Code:
> 
>   source venv/bin/activate
> 
> \- \*\*Usage\*\*: Similar to Windows, after activating the venv, you can use it from any directory. You can open a terminal, navigate to any folder, and run the activation script to start using the venv.  
>   
> \### Practical Workflow  
> 1\. \*\*Create the venv\*\*:  
> 
> Code:
> 
>    python -m venv /path/to/new/venv
> 
> Replace \`/path/to/new/venv\` with the desired path.  
>   
> 2\. \*\*Activate the venv\*\*:  
> \- On Windows:  
> 
> Code:
> 
>      .\\path\\to\\new\\venv\\Scripts\\activate
> 
> \- On macOS and Linux:  
> 
> Code:
> 
>      source /path/to/new/venv/bin/activate
> 
> 3\. \*\*Using the venv\*\*:  
> Once activated, you can navigate to any directory and use Python and pip commands within the context of the venv.  
>   
> \### Example Workflow  
>   
> 1\. Create a venv in \`~/my\_project/venv\`:  
> 
> Code:
> 
>    python -m venv ~/my\_project/venv
> 
> 2\. Activate the venv:  
> \- On Windows:  
> 
> Code:
> 
>      .\\my\_project\\venv\\Scripts\\activate
> 
> \- On macOS and Linux:  
> 
> Code:
> 
>      source ~/my\_project/venv/bin/activate
> 
> 3\. Navigate to another directory and use the venv:  
> 
> Code:
> 
>    cd ~/another\_project
>    python -m pip install requests
> 
> 'venv' is the process to create a new environment and 'env' is the name of the environment; it is a folder. Each large python suite of scripts would best have its own env. So good practice would be create a folder for those scripts 'UKTV' for example inside UKTV create an env folder to contain all the new python moules you'll be using. Then unpack your scripts here too so for example the folder UK-FTA.  
>   
> So now your folder UKTV contains the basic python modules your scripts will need. Extras - like mybigmodule==20.0.0 can now be installed and will only be seen locally is this folder structrure  
> 
> Code:
> 
> .
> └── UKTV
>     ├── env
>     │\*\* ├── bin
>     │\*\* ├── include
>     │\*\* │\*\* └── python3.12
>     │\*\* ├── lib
>     │\*\* │\*\* └── python3.12
>     │\*\* │\*\*     └── site-packages
>     │\*\* │\*\*         ├── pip
>     │\*\* │\*\*         │\*\* ├── \_internal
>     │\*\* │\*\*         │\*\* │\*\* ├── cli
>     │\*\* │\*\*         │\*\* │\*\* ├── commands
>     │\*\* │\*\*         │\*\* │\*\* ├── distributions
>     │\*\* │\*\*         │\*\* │\*\* ├── index
>     │\*\* │\*\*         │\*\* │\*\* ├── locations
>     │\*\* │\*\*         │\*\* │\*\* ├── metadata
>     │\*\* │\*\*         │\*\* │\*\* │\*\* └── importlib
>     │\*\* │\*\*         │\*\* │\*\* ├── models
>     │\*\* │\*\*         │\*\* │\*\* ├── network
>     │\*\* │\*\*         │\*\* │\*\* ├── operations
>     │\*\* │\*\*         │\*\* │\*\* │\*\* ├── build
>     │\*\* │\*\*         │\*\* │\*\* │\*\* └── install
>     │\*\* │\*\*         │\*\* │\*\* ├── req
>     │\*\* │\*\*         │\*\* │\*\* ├── resolution
>     │\*\* │\*\*         │\*\* │\*\* │\*\* ├── legacy
>     │\*\* │\*\*         │\*\* │\*\* │\*\* └── resolvelib
>     │\*\* │\*\*         │\*\* │\*\* ├── utils
>     │\*\* │\*\*         │\*\* │\*\* └── vcs
>     │\*\* │\*\*         │\*\* └── \_vendor
>     │\*\* │\*\*         │\*\*     ├── cachecontrol
>     │\*\* │\*\*         │\*\*     │\*\* └── caches
>     │\*\* │\*\*         │\*\*     ├── certifi
>     │\*\* │\*\*         │\*\*     ├── chardet
>     │\*\* │\*\*         │\*\*     │\*\* ├── cli
>     │\*\* │\*\*         │\*\*     │\*\* └── metadata
>     │\*\* │\*\*         │\*\*     ├── colorama
>     │\*\* │\*\*         │\*\*     │\*\* └── tests
>     │\*\* │\*\*         │\*\*     ├── distlib
>     │\*\* │\*\*         │\*\*     ├── distro
>     │\*\* │\*\*         │\*\*     ├── idna
>     │\*\* │\*\*         │\*\*     ├── msgpack
>     │\*\* │\*\*         │\*\*     ├── packaging
>     │\*\* │\*\*         │\*\*     ├── pkg\_resources
>     │\*\* │\*\*         │\*\*     ├── platformdirs
>     │\*\* │\*\*         │\*\*     ├── pygments
>     │\*\* │\*\*         │\*\*     │\*\* ├── filters
>     │\*\* │\*\*         │\*\*     │\*\* ├── formatters
>     │\*\* │\*\*         │\*\*     │\*\* ├── lexers
>     │\*\* │\*\*         │\*\*     │\*\* └── styles
>     │\*\* │\*\*         │\*\*     ├── pyparsing
>     │\*\* │\*\*         │\*\*     │\*\* └── diagram
>     │\*\* │\*\*         │\*\*     ├── pyproject\_hooks
>     │\*\* │\*\*         │\*\*     │\*\* └── \_in\_process
>     │\*\* │\*\*         │\*\*     ├── requests
>     │\*\* │\*\*         │\*\*     ├── resolvelib
>     │\*\* │\*\*         │\*\*     │\*\* └── compat
>     │\*\* │\*\*         │\*\*     ├── rich
>     │\*\* │\*\*         │\*\*     ├── tenacity
>     │\*\* │\*\*         │\*\*     ├── tomli
>     │\*\* │\*\*         │\*\*     ├── truststore
>     │\*\* │\*\*         │\*\*     ├── urllib3
>     │\*\* │\*\*         │\*\*     │\*\* ├── contrib
>     │\*\* │\*\*         │\*\*     │\*\* │\*\* └── \_securetransport
>     │\*\* │\*\*         │\*\*     │\*\* ├── packages
>     │\*\* │\*\*         │\*\*     │\*\* │\*\* └── backports
>     │\*\* │\*\*         │\*\*     │\*\* └── util
>     │\*\* │\*\*         │\*\*     └── webencodings
>     │\*\* │\*\*         └── pip-23.3.2.dist-info
>     │\*\* └── lib64 -> lib
>     └── UK-FTA
>         ├── Downloads
>         │\*\* └── Finished
>         │\*\*     └── RakutenTV
>         ├── ukfta
>         │\*\* ├── bbc\_dl
>         │\*\* ├── c4\_dl
>         │\*\* │\*\* └── tmp
>         │\*\* ├── configs
>         │\*\* ├── itv\_dl
>         │\*\* ├── my5\_dl
>         │\*\* │\*\* └── keys
>         │\*\* ├── stv\_dl
>         │\*\* ├── tmp
>         │\*\* ├── tptvencore
>         │\*\* └── uktvp
>         └── WVD
> 
> 'venv creates a folder env there it stores all the 'extra' modules you download to run a script. If you no longer want the environment - just delete the 'env' folder.  
>   
> \### Summary  
> You are not confined to the folder where the venv was created. You can activate and use the venv from any directory. The activation process is slightly different across operating systems, but the general principle remains the same.  
>   
> Now following the above method you can create as many enviroments as needed to keep each library of scripts safely apart from each other on your system.  
>   
> Just remember to start the necessary environment before running your script.  
>   
> **Create a wvd file by hand from ClientID and Private-key.pem**  
> 
> Code:
> 
> pywidevine create-device -k device\_private\_key  -c device\_client\_id\_blob -t ANDROID -l3 -o WVD
> 
> for me it responded  
> 
> /home/angela/Programming/WKS-KEYS/pywidevine/L3/cdm/devices/emulator\_1/WVD/google\_aosp\_on\_ia\_emulator\_14.0.0\_d6xxxxx4\_l3.wvd
> 
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=74182)  
> \[Attachment 74182 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=74182)  
> It works the same on linux and Windows  
>   
> Now when you wish to run a script that does not use WKS-KEYS you activate the environment pywidevine is installed in and install any scripts plus its required modules. They are functionally separate from anything outside the env(iroment).  
> Most scripts that use a wvd file to access your key and blob will need to know its location.  
>   
> Mine now looks like this for an emulator key/blob /home/angela/Programming/WKS-KEYS/pywidevine/L3/cdm/devices/emulator\_1/WVD/google\_aosp\_on\_ia\_emulator\_14.0.0\_d6ixxxxxx64\_l3.w vd  
>   
> Now you need an l3.py to use for simple keys. It is a python program. It runs from the command line. At first run it will complain of missing modules, unless you have used python scripts before.  
> 
> Code:
> 
> (python -m) pip install pywidevine httpx
> 
> should do. If not read the error message and use pip to install any other missing modules. (some systems may need python - m before the pip command.  
>   
> Before using the program you need to know briefly of 'headers' . In any http comunication there is the html of the message but also meta-data that passes between client and server it is contained in section called headers.  
> The may look like this or be more complex.  
> 
> Code:
> 
> headers = {
> 'User-Agent': 'Mozilla/5.0 (X11; Linux x86\_64; rv:127.0) Gecko/20100101 Firefox/127.0',
>  'Accept': '\*/\*', 'Accept-Language': 'en-GB,en;q=0.5', 'Accept-Encoding': 'gzip, deflate, br, zstd', 
> 'Access-Control-Request-Method': 'POST',
>  'Access-Control-Request-Headers': 'content-type', 
> 'Referer': 'https://uktvplay.co.uk/', 
> 'Origin': 'https://uktvplay.co.uk',
>  'DNT': '1', 'Connection': 'keep-alive', 
> 'Sec-Fetch-Dest': 'empty', 
> 'Sec-Fetch-Mode': 'cors', 
> 'Sec-Fetch-Site': 'cross-site', 
> 'Priority': 'u=4', 'TE': 'trailers'
> }
> 
> to run the code below you will need a headers file. And the best way to get one is to copy the 'license url as cURL' an paste to curlconverter .com as above in the last image. For simple sites just copy "headers = { ...... } and save it to a file in the same folder called headers.py. It gets imported into l3.py below.  
> [![Image](https://forum.videohelp.com/attachment.php?attachmentid=79837)  
> \[Attachment 79837 - Click to enlarge\]](https://forum.videohelp.com/attachment.php?attachmentid=79837)  
> Copy similar headers as highlighted in to your headers.py  
>   
> l3.py  
> 
> PHP Code:
> 
> `` `import logging   from pywidevine.cdm import Cdm   from pywidevine.device import Device   from pywidevine.pssh import PSSH   import httpx      logging.basicConfig(level=logging.DEBUG)   logger = logging.getLogger(__name__)      WVD_PATH = "/home/angela/Programming/WKS-KEYS/device.wvd"   from headers import headers      def get_key(pssh, license_url):    logger.debug("Loading device...")    device = Device.load(WVD_PATH)    cdm = Cdm.from_device(device)    session_id = cdm.open()    logger.debug("Session opened...")    challenge = cdm.get_license_challenge(session_id, PSSH(pssh))    response = httpx.post(license_url, data=challenge, headers=headers)    cdm.parse_license(session_id, response.content)    keys = []    logger.debug("Retrieving keys...")       for key in cdm.get_keys(session_id):        logger.debug(f"Key found: {key.kid.hex}:{key.key.hex()}, Type: {key.type}")           if key.type == 'CONTENT':            keys.append(f"--key {key.kid.hex}:{key.key.hex()}")    cdm.close(session_id)    logger.debug("Session closed...")       return "\n".join(keys)      if __name__ == "__main__":    pssh_str = input("PSSH? ")    lic_url = input("License URL? ")    result = get_key(pssh_str, lic_url)    logger.debug("Result:")       print(result)` `` 
> 
>   
> That's all I know!  
>   
> **Please follow netiquette and ask your questions here in this thread, so all may benefit.**  
>   
> Some 18 months after posting this my python coding has improved to the extent I can now produce AIO single, series or part-series down-loaders with a site search function.  
>   
> [https://forum.videohelp.com/threads/411884-UK-Free-to-Air-Downloader](https://forum.videohelp.com/threads/411884-UK-Free-to-Air-Downloader)  
> [https://forum.videohelp.com/threads/412382-More-Android-Phone-Stuff](https://forum.videohelp.com/threads/412382-More-Android-Phone-Stuff)  
>   
> And Finally  
> A noobs starter pack. This contains a script that will download _any mpd_ encrypted with Widevine. Use it wisely  
> [https://files.videohelp.com/u/301890/hellyes2.zip](https://files.videohelp.com/u/301890/hellyes2.zip)  
>   
> For more detail of the Widevine to help you understand the process see '[Decryption: The Dungeon of Despair](https://forum.videohelp.com/threads/407216-Decryption-The-Dungeon-of-Despair)'
