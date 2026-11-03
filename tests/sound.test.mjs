import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundEffects} from '../dist/sound.js';

function fakeAudio() {
  const contexts = [], requests = [];
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.sources = []; this.tones = []; contexts.push(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    decodeAudioData(data) { return Promise.resolve(data); }
    createGain() { return {gain: {value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}}, connect: () => this.destination}; }
    createBufferSource() {
      const source = {playbackRate: {}, connect(gain) { this.gain = gain; return gain; }, start() { this.started = true; }};
      this.sources.push(source);
      return source;
    }
    createOscillator() {
      const oscillator = {frequency: {}, connect(gain) { return gain; }, start() {}, stop() {}};
      this.tones.push(oscillator);
      return oscillator;
    }
  }
  const fetchFile = async url => { requests.push(url); return {ok: true, arrayBuffer: async () => url}; };
  return {Context, contexts, requests, fetchFile};
}

test('recorded hits and alternating bounces play at the intended distance and respect mute', async () => {
  const f = fakeAudio(); let enabled = false;
  const sound = createSoundEffects({enabled: () => enabled, AudioContextClass: f.Context, fetchFile: f.fetchFile});
  await sound.unlock();
  assert.equal(f.contexts.length, 0, 'muted game does not start audio');
  enabled = true;
  await sound.unlock();
  const ctx = f.contexts[0];
  assert.equal(f.requests.length, 3);
  sound.impact('hit', {from: 1, shot: 'drive'});
  sound.impact('hit', {from: -1, shot: 'drive'});
  sound.impact('bounce', {from: -1});
  sound.impact('bounce', {from: -1});
  assert.match(ctx.sources[0].buffer, /racket-hit\.wav$/);
  assert.ok(ctx.sources[0].gain.gain.value > ctx.sources[1].gain.gain.value, 'far-side hit is quieter');
  assert.match(ctx.sources[2].buffer, /ball-bounce-1\.wav$/);
  assert.match(ctx.sources[3].buffer, /ball-bounce-2\.wav$/);
  assert.ok(ctx.sources.every(source => source.started));
  enabled = false;
  sound.impact('hit', {from: 1}); sound.point(1);
  assert.equal(ctx.sources.length, 4);
  assert.equal(ctx.tones.length, 0);
  enabled = true; ctx.state = 'suspended';
  await sound.unlock(); sound.point(1);
  assert.equal(ctx.state, 'running');
  assert.equal(ctx.tones[0].frequency.value, 500);
  assert.equal(f.requests.length, 3, 'resuming does not reload the samples');
});

test('a failed sample load falls back to a cue and can be retried', async () => {
  const f = fakeAudio(); let fail = true;
  const sound = createSoundEffects({enabled: () => true, AudioContextClass: f.Context, fetchFile: url => fail ? Promise.reject(Error('offline')) : f.fetchFile(url)});
  await sound.unlock();
  sound.impact('hit', {from: 1});
  assert.equal(f.contexts[0].tones.length, 1);
  fail = false;
  await sound.unlock();
  sound.impact('hit', {from: 1});
  assert.equal(f.contexts[0].sources.length, 1);
});
