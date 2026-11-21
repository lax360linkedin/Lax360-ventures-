// Catch the Stars: sound. Every effect and the music are SYNTHESISED here with the Web Audio API (oscillators and noise), so the game ships no audio files and there is nothing to license.
// Browsers only allow audio after a tap or key press: the context is created by `unlock()`, which the Start button calls. Effects follow the "Sound effects" preference, the music follows
// "Music", and both follow the Volume setting; a muted game stays silent.

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16] // a major pentatonic run (semitones above the root)
const midi = (n) => 440 * 2 ** ((n - 69) / 12)

export function createAudio(getPrefs) {
  let ctx = null
  let master = null
  let musicTimer = null
  let nextNote = 0
  let step = 0
  let noiseBuf = null
  let boss = false // Bug Hunter boss fights switch the music to a faster, darker pattern

  const prefs = () => getPrefs()
  const ready = () => ctx && ctx.state !== 'closed'

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return false
      ctx = new AC()
      master = ctx.createGain()
      master.connect(ctx.destination)
      const n = ctx.sampleRate * 0.5
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < n; i += 1) d[i] = Math.random() * 2 - 1
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    applyVolume()
    return true
  }
  function applyVolume() { if (master) master.gain.value = Math.max(0, Math.min(1, prefs().volume / 100)) * 0.7 }

  function tone({ freq, to, dur = 0.15, type = 'sine', gain = 0.25, at = 0, attack = 0.005 }) {
    if (!ready()) return
    const t = ctx.currentTime + at
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.setValueAtTime(freq, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(master)
    o.start(t); o.stop(t + dur + 0.05)
  }
  function noise({ dur = 0.3, freq = 800, gain = 0.4, at = 0 }) {
    if (!ready()) return
    const t = ctx.currentTime + at
    const s = ctx.createBufferSource(); s.buffer = noiseBuf
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 3, t); f.frequency.exponentialRampToValueAtTime(freq, t + dur)
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g); g.connect(master)
    s.start(t); s.stop(t + dur + 0.05)
  }
  const fx = (fn) => () => { if (prefs().sound && ready()) { applyVolume(); fn() } }

  const effects = {
    star: fx(() => tone({ freq: 740, to: 1180, dur: 0.14, type: 'triangle', gain: 0.22 })),
    golden: fx(() => { tone({ freq: 880, to: 1320, dur: 0.16, type: 'triangle', gain: 0.24 }); tone({ freq: 1320, to: 1760, dur: 0.2, type: 'sine', gain: 0.16, at: 0.07 }) }),
    diamond: fx(() => { [1046, 1318, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'sine', gain: 0.18, at: i * 0.055 })) }),
    heart: fx(() => { tone({ freq: 523, dur: 0.18, type: 'sine', gain: 0.22 }); tone({ freq: 784, dur: 0.28, type: 'sine', gain: 0.22, at: 0.1 }) }),
    bomb: fx(() => { noise({ dur: 0.45, freq: 500, gain: 0.55 }); tone({ freq: 160, to: 45, dur: 0.4, type: 'sawtooth', gain: 0.3 }) }),
    powerup: fx(() => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'square', gain: 0.1, at: i * 0.06 })) }),
    tick: fx(() => tone({ freq: 880, dur: 0.07, type: 'square', gain: 0.1 })),
    go: fx(() => tone({ freq: 660, to: 990, dur: 0.22, type: 'triangle', gain: 0.22 })),
    win: fx(() => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.2, at: i * 0.1 })) }),
    // LAXBOT Jump reuses this synthesiser: short, original effects
    jump: fx(() => tone({ freq: 330, to: 620, dur: 0.16, type: 'square', gain: 0.1 })),
    doubleJump: fx(() => { tone({ freq: 500, to: 900, dur: 0.14, type: 'square', gain: 0.1 }); tone({ freq: 760, to: 1300, dur: 0.16, type: 'triangle', gain: 0.12, at: 0.05 }) }),
    land: fx(() => noise({ dur: 0.1, freq: 300, gain: 0.18 })),
    coin: fx(() => { tone({ freq: 988, dur: 0.07, type: 'square', gain: 0.1 }); tone({ freq: 1319, dur: 0.16, type: 'square', gain: 0.1, at: 0.06 }) }),
    checkpoint: fx(() => { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.16, at: i * 0.08 })) }),
    bounce: fx(() => tone({ freq: 260, to: 780, dur: 0.22, type: 'sine', gain: 0.22 })),
    // Bug Hunter reuses this synthesiser
    netThrow: fx(() => { tone({ freq: 420, to: 1500, dur: 0.18, type: 'sine', gain: 0.14 }); noise({ dur: 0.12, freq: 2000, gain: 0.08 }) }),
    capture: fx(() => { [660, 880, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.16, at: i * 0.05 })) }),
    shieldPop: fx(() => { tone({ freq: 1200, to: 300, dur: 0.2, type: 'square', gain: 0.1 }); noise({ dur: 0.15, freq: 1500, gain: 0.2 }) }),
    skitter: fx(() => { tone({ freq: 1800 + Math.random() * 600, dur: 0.03, type: 'square', gain: 0.03 }) }),
    zap: fx(() => { noise({ dur: 0.25, freq: 2500, gain: 0.3 }); tone({ freq: 90, dur: 0.25, type: 'sawtooth', gain: 0.2 }) }),
    alarm: fx(() => { tone({ freq: 500, dur: 0.12, type: 'square', gain: 0.1 }); tone({ freq: 380, dur: 0.14, type: 'square', gain: 0.1, at: 0.14 }) }),
    // Puzzle Pop reuses this synthesiser
    select: fx(() => tone({ freq: 880, to: 1100, dur: 0.07, type: 'sine', gain: 0.16 })),
    bad: fx(() => { tone({ freq: 220, to: 150, dur: 0.18, type: 'sawtooth', gain: 0.12 }) }),
    rocket: fx(() => { tone({ freq: 300, to: 1800, dur: 0.35, type: 'sawtooth', gain: 0.1 }); noise({ dur: 0.3, freq: 1200, gain: 0.15 }) }),
    boom: fx(() => { noise({ dur: 0.4, freq: 450, gain: 0.5 }); tone({ freq: 140, to: 50, dur: 0.35, type: 'sine', gain: 0.35 }) }),
    rainbowFx: fx(() => { [523, 659, 784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.25, type: 'triangle', gain: 0.14, at: i * 0.05 })) }),
    gameOver: fx(() => { [440, 392, 330, 262].forEach((f, i) => tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.22, at: i * 0.18 })) }),
  }

  // Music: a soft arpeggio scheduled a little ahead of time (so it never stutters when the page is busy). It runs only while playing.
  function musicTick() {
    if (!ready() || !prefs().music) return
    applyVolume()
    while (nextNote < ctx.currentTime + 0.35) {
      const bar = Math.floor(step / 8)
      const root = (boss ? [50, 50, 53, 48] : [57, 53, 55, 52])[bar % 4]
      const n = root + SCALE[(step * 3 + (bar % 2)) % SCALE.length]
      const t0 = nextNote - ctx.currentTime
      tone({ freq: midi(n), dur: boss ? 0.24 : 0.42, type: boss ? 'sawtooth' : 'sine', gain: boss ? 0.04 : 0.055, at: Math.max(0, t0), attack: 0.02 })
      if (step % 8 === 0) tone({ freq: midi(root - 12), dur: 1.4, type: 'triangle', gain: 0.06, at: Math.max(0, t0), attack: 0.05 })
      nextNote += boss ? 0.17 : 0.25; step += 1
    }
  }
  function startMusic() {
    if (musicTimer || !ready()) return
    nextNote = ctx.currentTime + 0.05; step = 0
    musicTimer = setInterval(musicTick, 120)
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null }

  const pop = (n = 1) => { if (prefs().sound && ready()) { applyVolume(); const f = 520 * 2 ** (Math.min(n, 8) / 12 * 2); tone({ freq: f, to: f * 1.5, dur: 0.13, type: 'triangle', gain: 0.2 }); tone({ freq: f * 2, dur: 0.1, type: 'sine', gain: 0.08, at: 0.04 }) } }
  return {
    setBoss(on) { boss = !!on }, pop, unlock, startMusic, stopMusic, applyVolume, ...effects,
    suspend() { stopMusic(); if (ready() && ctx.state === 'running') ctx.suspend().catch(() => {}) },
    resume() { if (ready() && ctx.state === 'suspended') ctx.resume().catch(() => {}) },
    dispose() { stopMusic(); if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {}); ctx = null; master = null },
  }
}
