#!/bin/bash

# assuming videofile  is from N_m3u8DL-RE
# with the subtitle being close to srt format

for file in *.mkv; do
  echo "🔍 Inspecting $file"

  # Get subtitle track IDs (assuming srt = text subtitle)
  sub_id=$(mkvmerge -i "$file" | grep 'subtitles' | awk '{print $3}' | sed 's/://')

  if [ -n "$sub_id" ]; then
    base="${file%.mkv}"
    output="${base}.srt"
    echo "📤 Extracting subtitle track $sub_id from $file → $output"
    mkvextract tracks "$file" "${sub_id}:${output}"
  else
    echo "⚠️  No subtitle track found in $file"
  fi
done
