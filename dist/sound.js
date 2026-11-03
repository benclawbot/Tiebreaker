const files = [
  './assets/audio/racket-hit.wav',
  './assets/audio/ball-bounce-1.wav',
  './assets/audio/ball-bounce-2.wav',
];

export function createSoundEffects({enabled, AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, fetchFile = globalThis.fetch}) {
  let context, loading, buffers, nextBounce = 0;

  function unlock() {
    if (!enabled() || !AudioContextClass) return Promise.resolve();
    try {
      context ||= new AudioContextClass();
      if (context.state !== 'running') Promise.resolve(context.resume()).catch(() => {});
      loading ||= Promise.all(files.map(async url => {
        const response = await fetchFile(url);
        if (!response.ok) throw new Error('Could not load ' + url);
        return context.decodeAudioData(await response.arrayBuffer());
      })).then(decoded => { buffers = decoded; }).catch(() => { loading = null; });
      return loading;
    } catch {
      return Promise.resolve();
    }
  }

  function tone(frequency, duration) {
    if (!enabled() || !context || context.state !== 'running') return;
    try {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {}
  }

  function impact(kind, event) {
    if (!enabled() || !context || context.state !== 'running') return;
    if (!buffers) return tone(kind === 'hit' ? 390 : 180, kind === 'hit' ? .07 : .045);
    try {
      const source = context.createBufferSource(), gain = context.createGain();
      const near = kind === 'hit' ? event.from === 1 : event.from === -1;
      const index = kind === 'hit' ? 0 : 1 + (nextBounce++ % 2);
      source.buffer = buffers[index];
      source.playbackRate.value = kind === 'hit' ? (event.serve ? .97 : event.shot === 'lift' ? 1.04 : event.shot === 'lob' ? .98 : 1) : 1;
      gain.gain.value = (kind === 'hit' ? .65 : .5) * (near ? 1 : .68);
      source.connect(gain).connect(context.destination);
      source.start();
    } catch {}
  }

  return {unlock, impact, point: winner => tone(winner === 1 ? 500 : 220, .15)};
}
