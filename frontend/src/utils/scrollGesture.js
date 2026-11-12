// Turns a stream of wheel / touchpad events into discrete "steps": exactly ONE step per gesture, taken at the START of the gesture.
//
// A mouse wheel notch, a fast spin of the wheel and a touchpad flick with a long tail of momentum events all count as one gesture each. What makes the next gesture start:
//   - a pause in the stream (no event for `newGestureGap` ms),
//   - a change of direction, or
//   - a new, clearly stronger flick on top of the decaying momentum of the previous one.
// There is no timer that swallows input: a new gesture is recognised the moment it begins, so nothing is ever "lost" and the visitor never has to scroll twice.
// (`minStepGap` only stops two steps from being taken within a few frames of each other; it is shorter than the card animation.)
export function createWheelGesture({ trigger = 28, newGestureGap = 120, minStepGap = 280, flickFactor = 1.6, flickMin = 40 } = {}) {
  let acc = 0
  let last = -Infinity
  let dir = 0
  let stepped = false
  let recent = []
  let lastStep = -Infinity
  return {
    /** Feed one wheel event (`dy` in px, `now` in ms). Returns 1 (down), -1 (up) or 0 (no step). */
    push(dy, now) {
      const mag = Math.abs(dy)
      if (mag < 1) return 0
      const d = dy > 0 ? 1 : -1
      const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0
      const freshFlick = stepped && now - lastStep >= minStepGap && recent.length >= 3 && mag >= flickMin && mag > avg * flickFactor // (the ramp-up of the SAME flick comes within a few frames of its step, so it is not mistaken for a new one)
      if (now - last > newGestureGap || d !== dir || freshFlick) { acc = 0; stepped = false; recent = [] }
      last = now
      dir = d
      recent.push(mag)
      if (recent.length > 6) recent.shift()
      if (stepped) return 0 // the rest of a gesture that already moved the card (its momentum)
      acc += dy
      if (Math.abs(acc) >= trigger && now - lastStep >= minStepGap) { stepped = true; acc = 0; lastStep = now; return d }
      return 0
    },
    /** A step taken by something else (keys, touch) counts for the minimum gap. */
    noteStep(now) { lastStep = now },
    get lastStep() { return lastStep },
  }
}
