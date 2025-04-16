#!/bin/bash

for file in *.qsm.mp4; do
  base="${file%.mkv}"
  output="${base}.qsm"

  echo "📤 Extracting QSM subtitle from $file → $output"

  # Assuming subtitle track is ID 0 (adjust if needed)
  MP4Box -raw 0:output="$output" "$file"
done
