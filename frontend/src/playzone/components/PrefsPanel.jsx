import { Gauge, Music, Smartphone, Volume2 } from 'lucide-react'
import { usePrefs, useSetPref } from '../prefs.js'

const Toggle = ({ icon: Icon, label, checked, onChange, id }) => (
  <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5">
    <span className="flex items-center gap-3 font-semibold"><Icon className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />{label}</span>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-6 accent-[#fbbf24]" />
  </label>
)

/** Sound and graphics preferences. They are saved on this device now and will be used by the games when they exist. */
export default function PrefsPanel() {
  const p = usePrefs()
  const set = useSetPref()
  return (
    <section aria-labelledby="pz-prefs-title" className="pz-glass p-5 sm:p-7">
      <h3 id="pz-prefs-title" className="font-display text-xl font-bold">Sound & graphics</h3>
      <p className="pz-soft mt-1 text-sm">Saved on this device only. The games will use these settings when they launch.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Toggle id="pz-sound" icon={Volume2} label="Sound effects" checked={p.sound} onChange={(v) => set('sound', v)} />
        <Toggle id="pz-music" icon={Music} label="Music" checked={p.music} onChange={(v) => set('music', v)} />
        <Toggle id="pz-haptics" icon={Smartphone} label="Vibration on touch devices" checked={p.haptics} onChange={(v) => set('haptics', v)} />
        <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
          <label htmlFor="pz-volume" className="flex items-center justify-between gap-3 font-semibold"><span className="flex items-center gap-3"><Volume2 className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />Volume</span><span aria-hidden="true">{p.volume}%</span></label>
          <input id="pz-volume" type="range" min="0" max="100" step="5" value={p.volume} onChange={(e) => set('volume', Number(e.target.value))} className="mt-2 w-full" aria-valuetext={`${p.volume} percent`} />
        </div>
      </div>
      <fieldset className="mt-4">
        <legend className="flex items-center gap-2 font-semibold"><Gauge className="size-5 text-[var(--pz-blue)]" aria-hidden="true" />Graphics quality</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="group">
          {[['auto', 'Auto'], ['high', 'High'], ['low', 'Battery saver']].map(([v, label]) => (
            <button key={v} type="button" aria-pressed={p.graphics === v} onClick={() => set('graphics', v)} className="pz-tab">{label}</button>
          ))}
        </div>
        <p className="pz-soft mt-2 text-xs">“Battery saver” will reduce effects for slower phones. Reduced-motion settings on your device are always respected.</p>
      </fieldset>
    </section>
  )
}
