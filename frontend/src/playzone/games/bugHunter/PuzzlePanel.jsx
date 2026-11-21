import { useEffect, useState } from 'react'
import { Heart, X } from 'lucide-react'
import { POWER_BAND, PUZZLE_INFO, tileConnections } from './puzzles.js'

// The holographic repair panel. It only shows the puzzle state (puzzles.js owns the rules) and sends the player's taps back as actions. The world is paused while it is open.
const NODE_COLORS = ['#f472b6', '#22d3ee', '#fbbf24', '#4ade80']

const Tile = ({ tile }) => {
  const dirs = tileConnections(tile)
  const seg = { 0: [20, 20, 20, 0], 1: [20, 20, 40, 20], 2: [20, 20, 20, 40], 3: [20, 20, 0, 20] }
  return <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true">{dirs.map((d) => <line key={d} x1={seg[d][0]} y1={seg[d][1]} x2={seg[d][2]} y2={seg[d][3]} stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />)}<circle cx="20" cy="20" r="4.5" fill="#a5f3fc" /></svg>
}

export default function PuzzlePanel({ controller, hud }) {
  const [, force] = useState(0)
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 90); return () => clearInterval(id) }, [])
  const pz = controller.state.game.puzzle
  if (!pz) return null
  const p = pz.p
  const info = PUZZLE_INFO[p.type]
  const act = (a) => { controller.puzzleAction(a); force((n) => n + 1) }
  const tries = p.attempts !== undefined ? <span className="flex items-center gap-0.5" aria-label={`${p.attempts} tries left`}>{[0, 1, 2].map((i) => <Heart key={i} className={`size-4 ${i < p.attempts ? 'fill-rose-400 text-rose-300' : 'text-white/30'}`} aria-hidden="true" />)}</span> : null

  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#050516]/75 p-2.5 backdrop-blur-[2px] sm:p-4" role="dialog" aria-modal="true" aria-label={info.title}>
      <div className="my-auto w-full max-w-md rounded-3xl border border-cyan-300/50 bg-[#0b1030]/90 p-4 text-center shadow-[0_0_60px_-10px_rgba(34,211,238,0.6)] sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="text-left"><p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cyan-300">{hud.puzzleLabel || 'System repair'}</p><h3 className="font-display text-xl font-extrabold sm:text-2xl">{info.title}</h3></div>
          <button type="button" onClick={controller.closePuzzle} aria-label="Close the repair panel" className="pz-btn pz-btn-ghost !min-h-10 !px-3"><X className="size-5" /></button>
        </div>
        <p className="mt-1 text-left text-sm text-cyan-50/90">{info.how}</p>

        <div className="mt-4">
          {p.type === 'circuit' && (
            <div className="mx-auto" style={{ width: `${Math.min(18, p.n * 4.6)}rem` }}>
              <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${p.n}, 1fr)` }}>
                {p.tiles.map((row, r) => row.map((t, c) => (
                  <button key={`${r}${c}`} type="button" onClick={() => act({ type: 'rotate', r, c })} aria-label={`Rotate tile row ${r + 1} column ${c + 1}`} className="aspect-square rounded-lg border border-cyan-300/30 bg-[#0e1a44] p-1 transition hover:border-cyan-200 active:scale-95"><Tile tile={t} /></button>
                )))}
              </div>
              <div className="mt-2 flex justify-between text-xs font-bold"><span className="text-amber-300">⚡ Power in: row {p.startRow + 1}</span><span className="text-emerald-300">Socket: row {p.endRow + 1} ▶</span></div>
            </div>
          )}

          {p.type === 'align' && (
            <div>
              <div className="flex flex-wrap justify-center gap-4">
                {p.values.map((v, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="relative grid size-20 place-items-center rounded-full border-2 border-cyan-300/60 bg-[#0e1a44]" aria-label={`Dial ${i + 1} at position ${v}`}>
                      <span className="absolute top-0.5 text-[0.6rem] text-emerald-300">▲</span>
                      <div className="h-8 w-1 origin-bottom rounded bg-cyan-300 transition-transform" style={{ transform: `translateY(-8px) rotate(${v * 60}deg)`, transformOrigin: '50% 100%' }} />
                    </div>
                    <button type="button" className="pz-btn pz-btn-primary !min-h-10 !px-4 text-sm" onClick={() => act({ type: 'turn', dial: i })}>Turn {i + 1}</button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold text-cyan-200">Moves left: {Math.max(0, p.limit - p.moves)}</p>
            </div>
          )}

          {p.type === 'nodes' && (
            <div>
              <div className="mx-auto grid max-w-[16rem] grid-cols-2 gap-3">
                {NODE_COLORS.map((col, i) => (
                  <button key={i} type="button" disabled={p.phase !== 'input'} onClick={() => act({ type: 'press', node: i })} aria-label={`Server node ${i + 1}`} className="aspect-square rounded-2xl border-2 transition active:scale-95 disabled:cursor-wait" style={{ borderColor: col, background: p.lit === i ? col : `${col}33`, boxShadow: p.lit === i ? `0 0 30px ${col}` : 'none' }} />
                ))}
              </div>
              <p className="mt-3 flex items-center justify-center gap-3 text-sm font-bold">{p.phase === 'show' ? 'Watch the pattern…' : `Your turn: ${p.input.length}/${p.sequence.length}`} {tries}</p>
            </div>
          )}

          {p.type === 'switches' && (
            <div>
              <div className="flex flex-wrap justify-center gap-3">
                {p.volts.map((v, i) => (
                  <button key={i} type="button" onClick={() => act({ type: 'flip', i })} aria-pressed={p.on[i]} aria-label={`Breaker ${v} volts, ${p.on[i] ? 'on' : 'off'}`} className={`flex w-16 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 transition active:scale-95 ${p.on[i] ? 'border-emerald-300 bg-emerald-400/20' : 'border-cyan-300/40 bg-[#0e1a44]'}`}>
                    <span className={`h-8 w-3 rounded ${p.on[i] ? 'bg-emerald-300' : 'bg-slate-500'}`} /><span className="text-sm font-extrabold tabular-nums">{v} V</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-center justify-center gap-3 text-sm font-bold">Lowest voltage first {tries}</p>
            </div>
          )}

          {p.type === 'power' && (
            <div>
              <div className="flex justify-center gap-5">
                {p.bars.map((b, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-4 text-lg" onClick={() => act({ type: 'pulse', i, dir: 1 })} aria-label={`Raise bar ${i + 1}`}>+</button>
                    <div className="relative h-36 w-9 overflow-hidden rounded-lg border border-cyan-300/50 bg-[#0e1a44]" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b.v)} aria-label={`Power bar ${i + 1}`}>
                      <div className="absolute inset-x-0 bg-emerald-400/25" style={{ bottom: `${POWER_BAND[0]}%`, height: `${POWER_BAND[1] - POWER_BAND[0]}%` }} />
                      <div className={`absolute inset-x-0 bottom-0 ${b.v >= POWER_BAND[0] && b.v <= POWER_BAND[1] ? 'bg-emerald-300' : 'bg-amber-400'}`} style={{ height: `${Math.max(0, Math.min(100, b.v))}%`, opacity: 0.85 }} />
                    </div>
                    <button type="button" className="pz-btn pz-btn-ghost !min-h-10 !px-4 text-lg" onClick={() => act({ type: 'pulse', i, dir: -1 })} aria-label={`Lower bar ${i + 1}`}>−</button>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((p.stableT / p.goalT) * 100)} aria-label="Stability"><div className="h-full bg-emerald-300" style={{ width: `${Math.min(100, (p.stableT / p.goalT) * 100)}%` }} /></div>
              <p className="mt-2 flex items-center justify-center gap-3 text-sm font-bold">Hold all three in the green band for 3 s {tries}</p>
            </div>
          )}
        </div>
        {hud.repairMsg && <p className="mt-3 rounded-lg bg-black/30 px-3 py-1.5 text-sm font-bold text-amber-200" role="status">{hud.repairMsg}</p>}
      </div>
    </div>
  )
}
