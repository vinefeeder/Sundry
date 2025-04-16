#!/bin/bash

for i in {1..8}; do
  # Pad with zero if less than 10
  ep=$(printf "%02d" $i)
  input_file="S05E${ep}.qsm.mp4"
  output_file="S05E${ep}.srt"

  # Apply MP4Box command
  MP4Box -raw "0:output=${output_file}" "${input_file}"
done
