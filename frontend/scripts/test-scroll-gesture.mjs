import { createWheelGesture } from '../src/utils/scrollGesture.js'

// Simulates a stream of wheel events (list of [timeMs, deltaY]) and counts the steps the recogniser takes.
const run = (events) => { const g = createWheelGesture(); const steps = []; for (const [t, dy] of events) { const s = g.push(dy, t); if (s) steps.push([Math.round(t), s]); } return steps }
const decay = (t0, start, n, k, every = 16, sign = 1) => Array.from({ length: n }, (_, i) => [t0 + i * every, sign * (Math.round(start * Math.pow(k, i)) || 1)])
const cases = []
const check = (name, events, expected) => { const steps = run(events); cases.push({ name, pass: steps.length === expected.length && steps.every((s, i) => s[1] === expected[i]), steps: JSON.stringify(steps), expected: JSON.stringify(expected) }) }

check('one mouse notch (100px)', [[0, 100]], [1])
check('mouse notch up', [[0, -100]], [-1])
check('fast mouse spin: 12 notches 30ms apart', Array.from({ length: 12 }, (_, i) => [i * 30, 100]), [1])
check('mouse: three notches 400ms apart = three cards', [[0, 100], [400, 100], [800, 100]], [1, 1, 1])
check('touchpad flick, 60 momentum events decaying 80px -> 1px', decay(0, 80, 60, 0.93), [1])
check('touchpad flick, very long tail (140 events, 3 px at the end)', decay(0, 120, 140, 0.97), [1])
check('slow gentle touchpad scroll (4px x 25 events)', Array.from({ length: 25 }, (_, i) => [i * 16, 4]), [1])
check('tiny movement (5 + 5 px)', [[0, 5], [16, 5]], [])
check('reverse direction during a flick = one step each way', [...decay(0, 80, 20, 0.9), ...decay(400, 80, 20, 0.9, 16, -1)], [1, -1])
check('two flicks separated by a natural pause (350ms)', [...decay(0, 80, 15, 0.88), ...decay(15 * 16 + 350, 80, 15, 0.88)], [1, 1])
check('three flicks with natural pauses', [...decay(0, 80, 15, 0.88), ...decay(800, 80, 15, 0.88), ...decay(1600, 80, 15, 0.88)], [1, 1, 1])
check('a new strong flick on top of the previous flick\'s momentum', [...decay(0, 90, 40, 0.95).slice(0, 25), ...[30, 120, 140, 120, 80, 40, 20].map((d, i) => [25 * 16 + i * 16, d])], [1, 1])
check('momentum alone never gives a second card (long 2.5 s tail)', decay(0, 100, 160, 0.975), [1])
check('Windows mouse with smooth scrolling: 100px split in 8 events of 12px', Array.from({ length: 8 }, (_, i) => [i * 16, 12.5]), [1])
check('macOS flick: bell-shaped deltas (ramp up then decay)', [...[3, 8, 20, 40, 60, 70, 65].map((d, i) => [i * 16, d]), ...decay(7 * 16, 60, 50, 0.92)], [1])
check('immediate reaction: step is taken on the first events (not after the gesture)', [[0, 30]], [1])

let failed = 0
for (const c of cases) { if (!c.pass) failed++; console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  steps=${c.steps}${c.pass ? '' : '  expected=' + c.expected}`) }
console.log(`\n${cases.length - failed}/${cases.length} passed`)
process.exit(failed ? 1 : 0)
