import os
import re
import subprocess

def prompt(msg, default=None):
    prompt_str = f"{msg} [{'Enter' if default is None else default}]: "
    val = input(prompt_str).strip()
    return val if val else default

def extract_season_episode(filename):
    match = re.search(r"S(\d+)_E(\d+)", filename)
    if match:
        season = int(match.group(1))
        episode = int(match.group(2))
        return season, episode
    return None, None

def main():
    print("🎬 Subtitle Muxer (Refactored for variable video names)")

    folder = prompt("Enter path to folder with video and SRT files", ".")
    subtitle_pattern = prompt("Enter subtitle pattern (use ## for episode, e.g., S##E##.en.srt)", "S##E##.en.srt")
    output_suffix = prompt("Enter suffix to add to output files", "_en.mkv")

    files = [f for f in os.listdir(folder) if f.endswith(".mkv")]

    for video_file in files:
        season, episode = extract_season_episode(video_file)
        if season is None or episode is None:
            print(f"⚠️  Skipping '{video_file}' (no S#_E# found)")
            continue
        
        subtitle_file = subtitle_pattern.replace("##", f"{episode:02d}")

        video_path = os.path.join(folder, video_file)
        subtitle_path = os.path.join(folder, subtitle_file)

        if not os.path.exists(subtitle_path):
            print(f"⚠️  Subtitle file not found: {subtitle_file}")
            continue

        base = os.path.splitext(video_file)[0]
        output_file = os.path.join(folder, base + output_suffix)

        print(f"🎞️  Muxing: {video_file} + {subtitle_file} → {os.path.basename(output_file)}")

        subprocess.run([
            "mkvmerge", "-o", output_file,
            video_path,
            "--language", "0:eng", "--track-name", "0:English Subtitles",
            subtitle_path
        ])

    print("\n✅ Done!")

if __name__ == "__main__":
    main()
