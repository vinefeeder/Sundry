n.import os
import re
import subprocess

def prompt(msg, default=None):
    prompt_str = f"{msg} [{'Enter' if default is None else default}]: "
    val = input(prompt_str).strip()
    return val if val else default

def parse_episode_range(input_str):
    parts = re.split(r'[,\s]+', input_str)
    episodes = set()
    for part in parts:
        if '-' in part:
            start, end = map(int, part.split('-'))
            episodes.update(range(start, end + 1))
        else:
            episodes.add(int(part))
    return sorted(episodes)

def main():
    print("🎬 Subtitle Muxer")

    folder = prompt("Enter path to folder with video and SRT files", ".")
    prefix = prompt("Enter video filename prefix before episode number (e.g., Astrid_et_Raphaelle_S5_E)")
    episode_input = prompt("Enter episode numbers (e.g. 1-8 or 1,3,5)")
    srt_pattern = prompt("Enter subtitle pattern (use ## for episode, e.g., S05E##.en.srt)")
    output_suffix = prompt("Enter suffix to add to output files (e.g., _en.mkv)", "_en.mkv")

    episodes = parse_episode_range(episode_input)

    for ep in episodes:
        ep_pad = f"{ep:02d}"
        short_ep = f"E{ep}"
        srt_filename = srt_pattern.replace("##", ep_pad)
        try:
            video_match = [f for f in os.listdir(folder) if f.startswith(f"{prefix}{ep}") and f.endswith(".mkv")]
            if not video_match:
                print(f"⚠️  No video found for episode {ep}")
                continue
            video_file = video_match[0]
            output_file = os.path.splitext(video_file)[0] + output_suffix

            print(f"🎞️  Muxing {video_file} + {srt_filename} → {output_file}")

            subprocess.run([
                "mkvmerge", "-o", os.path.join(folder, output_file),
                os.path.join(folder, video_file),
                "--language", "0:eng", "--track-name", "0:English Subtitles",
                os.path.join(folder, srt_filename)
            ])
        except Exception as e:
            print(f"❌ Error processing episode {ep}: {e}")

    print("\n✅ Done!")

if __name__ == "__main__":
    main()
