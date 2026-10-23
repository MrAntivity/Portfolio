export const MAX_BYTES = 200 * 1024 * 1024;
export const MAX_CLIPS = 30;
export const MAX_DURATION = 20 * 60;
export const FORMATS = { mp4: 'video/mp4', mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav' };
export const mediaExtension = name => (String(name).split('.').pop() || '').toLowerCase();
export function validateMedia(file, existingBytes = 0) {
  if (!Object.hasOwn(FORMATS, mediaExtension(file.name))) throw Error('Choose MP4, MP3, FLAC, or WAV files.');
  if (!file.size || file.size + existingBytes > MAX_BYTES) throw Error('Keep the total imported media under 200 MB.');
}
export function validateClips(clips, sources, format, editing = false) {
  if (!Object.hasOwn(FORMATS, format)) throw Error('Choose an export format.');
  if (!clips.length || clips.length > MAX_CLIPS) throw Error('Add between 1 and 30 clips.');
  let duration = 0;
  for (const clip of clips) {
    const source = sources.find(s => s.id === clip.sourceId);
    if (!source) throw Error('A source file is missing. Import it again.');
    if (![clip.start, clip.end, clip.speed, clip.volume, clip.fadeIn, clip.fadeOut].every(Number.isFinite)) throw Error('Clip settings must be numbers.');
    if (clip.start < 0 || clip.end > source.duration + .001 || clip.end - clip.start < .05) throw Error('Each clip needs valid in/out points at least 0.05 seconds apart.');
    if (clip.speed < .5 || clip.speed > 2 || clip.volume < 0 || clip.volume > 2) throw Error('Speed must be 0.5–2× and volume must be 0–200%.');
    const length = (clip.end - clip.start) / clip.speed;
    if (clip.fadeIn < 0 || clip.fadeOut < 0 || clip.fadeIn + clip.fadeOut > length) throw Error('Fades cannot be longer than the clip.');
    if (!editing && format === 'mp4' && !source.hasVideo) throw Error('MP4 export needs video in every clip. Use an audio format for audio-only clips.');
    if (!editing && format !== 'mp4' && !source.hasAudio) throw Error('A selected video has no audio track. Remove it or export MP4.');
    duration += length;
  }
  if (!editing && duration > MAX_DURATION) throw Error('Keep the edited timeline under 20 minutes per export.');
  return duration;
}
export function splitClip(clip, position, newId) {
  if (!Number.isFinite(position) || position - clip.start < .05 || clip.end - position < .05) throw Error('Place the playhead inside the clip, away from its edges.');
  return [{ ...clip, end: position, fadeOut: 0, fadeIn: Math.min(clip.fadeIn, (position - clip.start) / clip.speed) },
    { ...clip, id: newId, start: position, fadeIn: 0, fadeOut: Math.min(clip.fadeOut, (clip.end - position) / clip.speed) }];
}
export function segmentArgs(clip, source, input, output, video) {
  const duration = (clip.end - clip.start) / clip.speed;
  const args = ['-ss', String(clip.start), '-t', String(clip.end - clip.start), '-i', input];
  const audio = [`atempo=${clip.speed}`, `volume=${clip.volume}`, 'aresample=48000', 'aformat=sample_fmts=s16:channel_layouts=stereo', 'asetpts=PTS-STARTPTS'];
  if (clip.fadeIn) audio.push(`afade=t=in:st=0:d=${clip.fadeIn}`);
  if (clip.fadeOut) audio.push(`afade=t=out:st=${Math.max(0, duration - clip.fadeOut)}:d=${clip.fadeOut}`);
  if (video) {
    if (!source.hasAudio) args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
    args.push('-map', '0:v:0', '-map', source.hasAudio ? '0:a:0' : '1:a:0', '-vf', `setpts=(PTS-STARTPTS)/${clip.speed},scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`, '-af', audio.join(','), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le');
  } else args.push('-map', '0:a:0', '-vn', '-af', audio.join(','), '-c:a', 'pcm_s16le');
  return [...args, '-t', String(duration), '-map_metadata', '-1', '-threads', '1', '-y', output];
}
export function concatArgs(format, list, output) {
  const args = ['-f', 'concat', '-safe', '0', '-i', list];
  if (format === 'mp4') args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart');
  else if (format === 'mp3') args.push('-vn', '-c:a', 'libmp3lame', '-b:a', '192k');
  else if (format === 'flac') args.push('-vn', '-c:a', 'flac');
  else args.push('-vn', '-c:a', 'pcm_s16le');
  return [...args, '-map_metadata', '-1', '-threads', '1', '-y', output];
}
export function exportName(name, format) {
  const base = String(name || 'edited-clip').replace(/[\r\n/\\]/g, '_').replace(/\.(mp4|mp3|flac|wav)$/i, '').trim() || 'edited-clip';
  return base.slice(0, 150) + '.' + format;
}
