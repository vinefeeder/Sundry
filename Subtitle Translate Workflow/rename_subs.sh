#!/bin/bash

for f in *.srt; do
  if [[ "$f" =~ _S([0-9]+)_E([0-9]+)\.srt$ ]]; then
    season=$(printf "%02d" "${BASH_REMATCH[1]}")
    episode=$(printf "%02d" "${BASH_REMATCH[2]}")
    newname="S${season}E${episode}.en.srt"
    echo "🔁 Renaming '$f' → '$newname'"
    mv "$f" "$newname"
  else
    echo "⚠️  Skipping '$f' (no match)"
  fi
done
