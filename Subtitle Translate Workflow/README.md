Download a video with foreign subtitles using N_m3u8DL-RE. The subtitle is a hybrid SRT format with some colour information, (is it VTT?).

Batch extract the foreign subtitles from videos with extract_srt_from_mkv.sh

Go to https://translatesubtitles.co  and translate each srt to your preferred language. Note the srt colour information is removed by the translator.

Save each file as S0nE0n.lang.srt for example S05E07.en.srt  using  rename_subs.sh as necessary

Place the newly translated srt files back into the video folder. Remove the old extracted, foreign, srt files.

Run the python file mux_prompt to batch mux the existing videos with its new subtitle track. Note the code looks for S#_E# in the video filename. 
If your pattern is different adjust the code accordingly. Since this code was chatGPT derrived - chatGPT could do the refactor for you.

**qsm files**

If you have subtitle files in qsm.mp4 format (from yt-dlp) use the converter process2_srt.sh to batch change them to srt format before language translation
