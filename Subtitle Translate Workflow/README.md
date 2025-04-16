Download a video with subtitles using N_m3u8DL-RE. The subtitle is a hybrid SRT format with some colour information.

Batch extract subtitles from videos with extract_srt_from_mkv.sh

Go to https://translatesubtitles.co  and translate each srt to your preferred language. Note the srt colour information is removed by the translator.

Save each file as S0nE0n.lang.srt for example S05E07.en.srt

Place the newly translated srt files back into the video folder. Remove the old srt files

Run the python file mux_prompt to batch mux the existing videos with its new subtitle track

**qsm files**

If you have subtitle files in qsm.mp4 format (from yt-dlp) use the converter process2_srt.sh to batch change them to srt format before language translation
