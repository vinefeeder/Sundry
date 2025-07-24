#!/usr/bin/env python3

'''
A script to rename Plex Server files according to thetvdb.com listings
series_id is found on a series page e.g.
https://www.thetvdb.com/series/maigret
TheTVDB.com Series ID 77819 

use: 
python rename_tv_for_plex.py ./Maigret1960s \
  --api_key YOUR_API_KEY \
  --series_id 123456 \
  --dry-run \
  --min-score 60

remove --dry-run and adjust --min-score (match accuracy) to actively make changes.

Note you need a free API key from https://www.thetvdb.com
'''
import os
import re
import argparse
import unicodedata
from tvdb_v4_official import TVDB
from fuzzywuzzy import process

VIDEO_EXTS = {'.mkv', '.mp4', '.avi', '.mov'}


def fix_mojibake(name):
    try:
        return name.encode("latin1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def normalize_name(name):
    name = fix_mojibake(name)
    name = name.lower().replace('_', ' ')
    name = re.sub(r'[^a-z0-9 ]', '', name)
    return name.strip()


def get_all_episodes(tvdb, series_id, season_numbers):
    episode_map = {}
    seasons = tvdb.get_series_extended(series_id)["seasons"]

    for season in seasons:
        if season["type"]["type"] != "official":
            continue
        if int(season["number"]) not in season_numbers:
            continue

        season_id = season["id"]
        episodes = tvdb.get_season_extended(season_id)["episodes"]

        for ep in episodes:
            if not ep.get("number") or not ep.get("name"):
                continue
            s = int(season["number"])
            e = int(ep["number"])
            title = ep["name"]
            episode_map[f"S{s:02d}E{e:02d}"] = title

    return episode_map


def rename_files_in_folder(folder_path, episode_map, dry_run=False, min_score=70):
    files = [f for f in os.listdir(folder_path)
             if os.path.splitext(f)[1].lower() in VIDEO_EXTS]

    used = set()
    for f in files:
        base, ext = os.path.splitext(f)
        norm_base = normalize_name(base)

        match_code, match_title, match_score = None, None, 0
        for code, title in episode_map.items():
            if code in used:
                continue
            norm_title = normalize_name(title)
            score = process.extractOne(norm_base, [norm_title])[1]
            if score > match_score:
                match_code, match_title, match_score = code, title, score

        if match_score < min_score or match_code is None:
            print(f"⚠️  Skipping '{f}' — low match ({match_score})")
            continue

        new_name = f"{match_code} {match_title}{ext}"
        old_path = os.path.join(folder_path, f)
        new_path = os.path.join(folder_path, new_name)

        if dry_run:
            print(f"[DRY-RUN] Would rename: '{f}' → '{new_name}' (score {match_score})")
        else:
            print(f"Renaming '{f}' → '{new_name}' (score {match_score})")
            os.rename(old_path, new_path)

        used.add(match_code)


def main():
    parser = argparse.ArgumentParser(description="Rename TV series episode files to Plex-friendly format using TVDB metadata.")
    parser.add_argument("folder", help="Path to folder with video files")
    parser.add_argument("--api_key", required=True, help="TVDB API key")
    parser.add_argument("--series_id", type=int, required=True, help="TVDB series ID")
    parser.add_argument("--seasons", type=int, nargs="+", default=list(range(1, 100)),
                        help="Seasons to include (default: 1–99)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without renaming files")
    parser.add_argument("--min-score", type=int, default=70,
                        help="Minimum fuzzy match score to accept (default: 70)")
    args = parser.parse_args()

    tvdb = TVDB(args.api_key)
    print(f"Fetching episode data for series {args.series_id}...")
    episode_map = get_all_episodes(tvdb, args.series_id, args.seasons)

    if not episode_map:
        print("❌ No episodes found. Check your series ID and season range.")
        return

    print(f"✔ Found {len(episode_map)} episode titles across selected seasons.")
    rename_files_in_folder(args.folder, episode_map,
                           dry_run=args.dry_run, min_score=args.min_score)


if __name__ == "__main__":
    main()
