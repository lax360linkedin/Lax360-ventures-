import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import HunterBot from './HunterBot.jsx'
import { createBossMesh, createBugMesh, disposeCreatureAssets, makeCreatureAssets, updateBossMesh, updateBugMesh } from './creatures.js'
import { THEMES } from './levels.js'
import { barrierState, laserPos, liftTop } from './logic.js'
import { POWERUPS } from './config.js'

// The 3D scene of Bug Hunter. It only DRAWS: logic.js decides where everything is. Neon materials are shared, the floor is one big grid plane, bugs come from a small pool of groups
// updated every frame, particles are one InstancedMesh, and everything is disposed with the scene.

const dummy = new THREE.Object3D()
const tmp = new THREE.Color()
const v3 = new THREE.Vector3()
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function skyTexture(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256
  const g = cv.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0, stops[0]); grd.addColorStop(0.55, stops[1]); grd.addColorStop(1, stops[2]); g.fillStyle = grd; g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t
}
function gridTexture(line, bg) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128
  const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 128, 128)
  g.strokeStyle = line; g.lineWidth = 3; g.globalAlpha = 0.9; g.strokeRect(1.5, 1.5, 125, 125)
  g.globalAlpha = 0.35; g.lineWidth = 1; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke()
  g.globalAlpha = 0.8; g.fillStyle = line; for (const [x, y] of [[20, 20], [100, 90], [64, 64]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill() } // circuit nodes
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t
}
function arrowTexture() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64
  const g = cv.getContext('2d'); g.clearRect(0, 0, 64, 64); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(14, 12); g.lineTo(46, 32); g.lineTo(14, 52); g.lineTo(24, 32); g.fill()
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}
const glowTexture = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.3)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv) }

function useAssets(level) {
  return useMemo(() => {
    const th = THEMES[level.theme]
    const grid = gridTexture(th.grid, th.floor); grid.repeat.set(level.size, level.size)
    const arrow = arrowTexture()
    const glow = glowTexture()
    const geo = { box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1), sphere: new THREE.SphereGeometry(1, 14, 10), ico: new THREE.IcosahedronGeometry(0.4, 0), torus: new THREE.TorusGeometry(1, 0.07, 10, 36), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), bit: new THREE.OctahedronGeometry(0.1, 0), orb: new THREE.SphereGeometry(0.22, 10, 8) }
    const mat = {
      floor: new THREE.MeshStandardMaterial({ map: grid, color: '#ffffff', roughness: 0.35, metalness: 0.5, emissive: th.grid, emissiveMap: grid, emissiveIntensity: 0.55 }),
      wall: new THREE.MeshStandardMaterial({ color: '#141133', roughness: 0.35, metalness: 0.6, emissive: th.accent, emissiveIntensity: 0.08 }),
      trim: new THREE.MeshBasicMaterial({ color: th.accent }),
      plat: new THREE.MeshStandardMaterial({ color: '#1b1650', roughness: 0.3, metalness: 0.6, emissive: th.accent, emissiveIntensity: 0.18 }),
      barrier: new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      laser: new THREE.MeshBasicMaterial({ color: '#ff2b6d', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      current: new THREE.MeshBasicMaterial({ map: arrow, color: th.accent, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }),
      console: new THREE.MeshStandardMaterial({ color: '#1f1b4d', roughness: 0.3, metalness: 0.7 }),
      holo: new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      ring: new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      pickup: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.2 }),
      orb: new THREE.MeshBasicMaterial({ color: '#67e8f9' }),
      glow: new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      bit: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      net: new THREE.MeshBasicMaterial({ color: '#67e8f9', wireframe: true, transparent: true, opacity: 0.9 }),
      reticle: new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.9, depthWrite: false }),
      orbBall: new THREE.MeshBasicMaterial({ color: '#fb7185' }),
      portal: new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    }
    return { th, geo, mat, tex: { grid, arrow, glow } }
  }, [level])
}
function disposeAssets(a) { Object.values(a.geo).forEach((g) => g.dispose()); Object.values(a.mat).forEach((m) => m.dispose()); Object.values(a.tex).forEach((t) => t.dispose()) }

export default function Scene({ controller, quality }) {
  const { scene, camera, size, gl } = useThree()
  const g0 = controller.state.game
  const level = g0.level
  const a = useAssets(level)
  const th = a.th
  const creature = useMemo(() => makeCreatureAssets(), [])
  const sky = useMemo(() => skyTexture(th.sky), [th])
  const bugPool = useRef([]); const bossRef = useRef(); const liftRefs = useRef([]); const barrierRefs = useRef([]); const laserRefs = useRef([]); const stationRefs = useRef([]); const pickupRefs = useRef([])
  const orbM = useRef(); const cpRefs = useRef([]); const exitRef = useRef(); const bitM = useRef(); const netRef = useRef(); const reticle = useRef(); const projM = useRef(); const sunRef = useRef(); const sunTarget = useRef()
  const parts = useRef(Array.from({ length: 160 }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, color: new THREE.Color() })))
  const fps = useRef({ n: 0, sum: 0, low: 0 })
  const cam = useRef({ x: 0, y: 3, z: 10, init: false, shake: 0 })
  const shadows = quality !== 'low'
  const MAXBUGS = 14

  useEffect(() => { scene.background = sky; scene.fog = new THREE.Fog(th.fog, 30, 90); return () => { scene.background = null; scene.fog = null; sky.dispose() } }, [scene, sky, th])
  useEffect(() => () => { disposeAssets(a); disposeCreatureAssets(creature) }, [a, creature])
  useEffect(() => () => { bugPool.current.forEach((m) => m && scene.remove(m)); bugPool.current = [] }, [scene])
  useEffect(() => { if (sunRef.current && sunTarget.current) sunRef.current.target = sunTarget.current }, [])
  useEffect(() => { camera.fov = size.width / size.height < 0.85 ? 62 : 52; camera.updateProjectionMatrix() }, [camera, size.width, size.height])

  const burst = (color, x, y, z, count, speed = 4) => {
    let n = 0
    for (const p of parts.current) {
      if (p.on) continue
      const ang = Math.random() * Math.PI * 2; const sp = speed * (0.4 + Math.random() * 0.8)
      p.on = true; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(ang) * sp; p.vy = Math.random() * sp * 0.8 + 1.5; p.vz = Math.sin(ang) * sp; p.life = 0; p.max = 0.4 + Math.random() * 0.5; p.size = 0.7 + Math.random() * 0.9
      p.color.set(color); if (++n >= count) break
    }
  }
  const project = (x, y, z) => { v3.set(x, y, z).project(camera); return [(v3.x * 0.5 + 0.5) * size.width, (-v3.y * 0.5 + 0.5) * size.height] }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state; const g = c.game; const p = g.p; const t = state.clock.elapsedTime
    controller.tick(dt)
    const reduce = c.reduceMotion
    const f = fps.current; f.n += 1; f.sum += dtRaw
    if (f.n >= 90) { const avg = f.sum / f.n; f.low = avg > 1 / 38 ? f.low + 1 : 0; gl.domElement.dataset.fps = String(Math.round(1 / avg)); gl.domElement.dataset.quality = quality; f.n = 0; f.sum = 0; if (f.low >= 2) { f.low = 0; controller.onSlow?.() } }

    // ---- effects from the simulation ----
    const amt = reduce ? 0.35 : quality === 'low' ? 0.6 : 1
    for (const e of controller.drainFx()) {
      if (e.type === 'capture') { burst('#4ade80', e.x, e.y + 0.8, e.z, Math.round(18 * amt), 5); controller.popup?.(project(e.x, e.y + 1.8, e.z), `+${e.points}`, '#bbf7d0', true); cam.current.shake = 0.15 }
      else if (e.type === 'shieldBreak') { burst('#60a5fa', e.x, 1, e.z, Math.round(16 * amt), 5); controller.popup?.(project(e.x, 2, e.z), 'Shield broken!', '#93c5fd') }
      else if (e.type === 'dodge') controller.popup?.(project(e.x, 1.8, e.z), 'Dodged!', '#fca5a5')
      else if (e.type === 'netFire') burst('#67e8f9', p.x, p.y + 1.2, p.z, Math.round(8 * amt), 3)
      else if (e.type === 'netMiss') burst('#94a3b8', e.x ?? p.x, 0.6, e.z ?? p.z, Math.round(6 * amt), 3)
      else if (e.type === 'damage') { burst('#fb7185', e.x, e.y + 1, e.z, Math.round(14 * amt), 5); cam.current.shake = 0.4 }
      else if (e.type === 'pickup') { burst(POWERUPS[e.kind] ? POWERUPS[e.kind].color : '#4ade80', e.x, 1, e.z, Math.round(18 * amt), 5) }
      else if (e.type === 'orb') burst('#67e8f9', e.x, 0.8, e.z, 4, 2)
      else if (e.type === 'checkpoint') burst('#4ade80', e.x, 1, e.z, Math.round(24 * amt), 5)
      else if (e.type === 'repair') { const s = level.stations.find((x) => x.id === e.id); if (s) { burst('#22d3ee', s.x, (s.y || 0) + 1.2, s.z, Math.round(36 * amt), 6); controller.popup?.(project(s.x, (s.y || 0) + 2.5, s.z), '+100', '#a5f3fc', true) } }
      else if (e.type === 'blink') { burst('#e879f9', e.x, 0.8, e.z, Math.round(10 * amt), 3); burst('#e879f9', e.nx, 0.8, e.nz, Math.round(10 * amt), 3) }
      else if (e.type === 'bossHit') { burst('#fef08a', e.x, 2, e.z, Math.round(40 * amt), 8); cam.current.shake = 0.5; controller.popup?.(project(e.x, 3.5, e.z), 'HIT!', '#fef08a', true) }
      else if (e.type === 'bossDefeated') { burst('#f472b6', e.x, 2, e.z, Math.round(80 * amt), 10); controller.popup?.(project(e.x, 4, e.z), '+500', '#fbcfe8', true); cam.current.shake = 0.8 }
      else if (e.type === 'respawn') burst('#ffffff', p.x, p.y + 1, p.z, Math.round(20 * amt), 4)
      else if (e.type === 'complete') burst('#4ade80', p.x, p.y + 1, p.z, Math.round(50 * amt), 8)
      else if (e.type === 'bossOrbs') burst('#fb7185', e.x, 1.2, e.z, Math.round(16 * amt), 4)
    }

    // ---- bugs and bosses ----
    g.bugs.forEach((bug, i) => {
      if (i >= MAXBUGS) return
      let m = bugPool.current[i]
      if (!m) { m = createBugMesh(creature); bugPool.current[i] = m; scene.add(m) }
      updateBugMesh(m, bug, t, creature, p.x, p.z)
    })
    for (let i = g.bugs.length; i < bugPool.current.length; i += 1) if (bugPool.current[i]) bugPool.current[i].visible = false
    if (bossRef.current) updateBossMesh(bossRef.current, g.boss, t, creature)
    if (projM.current) { let n = 0; for (const o of g.projectiles) { if (n >= 40) break; dummy.position.set(o.x, 0.9 + Math.sin(t * 8 + n) * 0.1, o.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); projM.current.setMatrixAt(n, dummy.matrix); n += 1 } projM.current.count = n; projM.current.instanceMatrix.needsUpdate = true }

    // ---- world pieces ----
    g.level.lifts?.forEach((l, i) => { const m = liftRefs.current[i]; if (m) m.position.set(l.x, liftTop(l, g.t) - 0.4, l.z) })
    level.barriers?.forEach((b, i) => { const m = barrierRefs.current[i]; if (!m) return; const s = barrierState(b, g.t); m.visible = s.on || (s.warn && Math.sin(t * 40) > 0); m.material.opacity = s.on ? 0.6 : 0.25 })
    level.lasers?.forEach((l, i) => { const m = laserRefs.current[i]; if (m) { const q = laserPos(l, g.t); m.position.set(q.x, l.y + l.h / 2, q.z) } })
    level.stations.forEach((s, i) => {
      const m = stationRefs.current[i]; if (!m) return
      const st = g.stations[i]; const near = !st.solved && Math.hypot(p.x - s.x, p.z - s.z) < 2.6
      const avail = !st.solved && (s.requires || []).every((id) => g.stations.find((x) => x.id === id)?.solved)
      const col = st.solved ? '#4ade80' : avail ? '#22d3ee' : '#64748b'
      m.children[1].material.color.set(col); m.children[2].material.color.set(col)
      m.children[1].rotation.z = t * (avail ? 1.5 : 0.2); m.children[2].position.y = 2 + Math.sin(t * 2 + i) * 0.1; m.children[2].rotation.y = t
      m.children[2].scale.setScalar(near && avail ? 1.25 : 1)
    })
    g.pickups.forEach((pk, i) => { const m = pickupRefs.current[i]; if (!m) return; m.visible = !pk.taken; m.rotation.y = t * 2; m.position.y = (pk.y || 0) + 1.1 + Math.sin(t * 3 + i) * 0.15 })
    if (orbM.current) { let n = 0; g.orbs.forEach((o, i) => { if (o.taken) return; dummy.position.set(o.x, (o.y || 0) + 0.8 + Math.sin(t * 3 + i) * 0.1, o.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); orbM.current.setMatrixAt(n, dummy.matrix); n += 1 }); orbM.current.count = n; orbM.current.instanceMatrix.needsUpdate = true }
    level.checkpoints.forEach((_, i) => { const m = cpRefs.current[i]; if (!m) return; const on = g.cp >= i; m.children[0].material.color.set(on ? '#4ade80' : '#64748b'); m.children[1].material.color.set(on ? '#4ade80' : '#64748b'); m.children[1].rotation.z = t * (on ? 3 : 0.5) })
    if (exitRef.current) { const open = g.exitOpen; exitRef.current.children[0].material.color.set(open ? '#4ade80' : '#64748b'); exitRef.current.children[1].visible = open; exitRef.current.children[0].rotation.z = t * (open ? 2 : 0.3); exitRef.current.children[1].scale.setScalar(1 + Math.sin(t * 4) * 0.05) }

    // ---- the energy net and the target ring ----
    if (netRef.current) {
      const n = g.net
      netRef.current.visible = !!n
      if (n) { const k = Math.min(1, n.t / 0.28); netRef.current.position.set(n.sx + (n.tx - n.sx) * k, p.y + 1.2 - k * 0.5, n.sz + (n.tz - n.sz) * k); netRef.current.scale.setScalar(0.35 + k * 0.9); netRef.current.rotation.set(t * 8, t * 6, 0) }
    }
    if (reticle.current) {
      const tg = g.target
      reticle.current.visible = !!tg && c.phase === 'playing'
      if (tg) { const by = tg.kind === 'boss' ? 0 : (g.bugs.find((b) => b.id === tg.id)?.y || 0); reticle.current.position.set(tg.x, by + 0.06, tg.z); reticle.current.scale.setScalar(1.1 + Math.sin(t * 6) * 0.08); reticle.current.rotation.z = t * 2; reticle.current.material.color.set(tg.inRange ? '#4ade80' : '#fb923c') }
    }

    // ---- particles ----
    let pn = 0
    for (const q of parts.current) {
      if (!q.on) continue
      q.life += dt; if (q.life >= q.max) { q.on = false; continue }
      q.vy -= 9 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt
      const k = 1 - q.life / q.max
      dummy.position.set(q.x, Math.max(0.05, q.y), q.z); dummy.rotation.set(q.life * 6, q.life * 8, 0); dummy.scale.setScalar(q.size * k); dummy.updateMatrix()
      bitM.current.setMatrixAt(pn, dummy.matrix); bitM.current.setColorAt(pn, q.color); pn += 1
    }
    bitM.current.count = pn; bitM.current.instanceMatrix.needsUpdate = true; if (bitM.current.instanceColor) bitM.current.instanceColor.needsUpdate = true

    // ---- the sun follows LAXBOT (shadows) ----
    if (sunRef.current) { sunRef.current.position.set(p.x + 8, p.y + 16, p.z + 8); sunTarget.current.position.set(p.x, p.y, p.z); sunTarget.current.updateMatrixWorld() }

    // ---- camera: a third-person orbit controlled by the mouse / drag (c.yaw, c.pitch), smoothed, with a short shake on hits and a look at the boss when it wakes ----
    const portrait = size.width / size.height < 0.85
    const dist = portrait ? 10.5 : 8
    const cs = cam.current
    const sinY = Math.sin(c.yaw); const cosY = Math.cos(c.yaw)
    let tx = p.x + sinY * dist * Math.cos(c.pitch); let tz = p.z + cosY * dist * Math.cos(c.pitch); let ty = p.y + 1.7 + dist * Math.sin(c.pitch)
    const lim = level.size + 6
    tx = clamp(tx, -lim, lim); tz = clamp(tz, -lim, lim)
    if (!cs.init) { cs.x = tx; cs.y = ty; cs.z = tz; cs.init = true }
    const kk = 1 - Math.exp(-(reduce ? 14 : 9) * dt)
    cs.x += (tx - cs.x) * kk; cs.y += (ty - cs.y) * kk; cs.z += (tz - cs.z) * kk
    cs.shake = Math.max(0, cs.shake - dt)
    const sh = cs.shake > 0 && !reduce ? (Math.random() - 0.5) * cs.shake * 0.6 : 0
    camera.position.set(cs.x + sh, cs.y + sh, cs.z)
    let lx = p.x - sinY * 2; let lz = p.z - cosY * 2; let ly = p.y + 1.3
    const b = g.boss
    if (b && b.state === 'intro' && !reduce) { const k2 = Math.min(1, b.stateT / 0.8); lx += (b.x - lx) * k2 * 0.7; lz += (b.z - lz) * k2 * 0.7; ly += 1.2 * k2 }
    camera.lookAt(lx, ly, lz)
  })

  const hi = quality === 'high'
  return (
    <>
      <hemisphereLight args={[th.sky[2], th.sky[0], 0.75]} />
      <ambientLight intensity={0.35} />
      <directionalLight ref={sunRef} intensity={1.6} color="#dbeafe" castShadow={shadows} shadow-mapSize={hi ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0006} />
      <primitive object={useMemo(() => new THREE.Object3D(), [])} ref={sunTarget} />
      <pointLight position={[-10, 6, 10]} intensity={40} color="#a855f7" distance={40} />
      <pointLight position={[10, 6, -10]} intensity={40} color={th.accent} distance={40} />

      {/* the neon circuit floor and the glowing arena border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[level.size * 2 + 40, level.size * 2 + 40]} /><meshStandardMaterial map={a.tex.grid} roughness={0.4} metalness={0.4} emissive={th.grid} emissiveMap={a.tex.grid} emissiveIntensity={0.5} onUpdate={(m) => { a.tex.grid.repeat.set((level.size * 2 + 40) / 2, (level.size * 2 + 40) / 2); m.needsUpdate = true }} /></mesh>
      {[[0, level.size, level.size * 2, 0.3], [0, -level.size, level.size * 2, 0.3], [level.size, 0, 0.3, level.size * 2], [-level.size, 0, 0.3, level.size * 2]].map(([x, z, w, d], i) => <mesh key={i} position={[x, 0.15, z]} material={a.mat.trim}><boxGeometry args={[w, 0.3, d]} /></mesh>)}

      {level.solids.map((b, i) => (
        <group key={i} position={[b.x, (b.y0 + b.y1) / 2, b.z]}>
          <mesh castShadow receiveShadow material={b.y0 > 0.2 ? a.mat.plat : a.mat.wall}><boxGeometry args={[b.w, b.y1 - b.y0, b.d]} /></mesh>
          <mesh position={[0, (b.y1 - b.y0) / 2 + 0.02, 0]} material={a.mat.trim}><boxGeometry args={[b.w + 0.04, 0.08, b.d + 0.04]} /></mesh>
        </group>
      ))}
      {(level.lifts || []).map((l, i) => (
        <group key={`l${i}`} ref={(r) => { liftRefs.current[i] = r }} position={[l.x, l.base - 0.4, l.z]}>
          <mesh material={a.mat.plat}><boxGeometry args={[l.w, 0.8, l.d]} /></mesh><mesh position={[0, 0.42, 0]} material={a.mat.trim}><boxGeometry args={[l.w + 0.04, 0.06, l.d + 0.04]} /></mesh>
        </group>
      ))}
      {(level.barriers || []).map((b, i) => <mesh key={`b${i}`} ref={(r) => { barrierRefs.current[i] = r }} position={[b.x, (b.h || 2.4) / 2, b.z]} material={a.mat.barrier.clone()}><boxGeometry args={[b.w, b.h || 2.4, b.d]} /></mesh>)}
      {(level.lasers || []).map((l, i) => <mesh key={`z${i}`} ref={(r) => { laserRefs.current[i] = r }} position={[l.x, l.y + l.h / 2, l.z]} material={a.mat.laser}><boxGeometry args={[l.w, l.h, l.d]} /></mesh>)}
      {(level.currents || []).map((cz, i) => <mesh key={`c${i}`} position={[(cz.x0 + cz.x1) / 2, 0.08, (cz.z0 + cz.z1) / 2]} rotation={[-Math.PI / 2, 0, cz.fx < 0 ? Math.PI : 0]} material={a.mat.current} onUpdate={(m) => { m.material.map.repeat.set(Math.abs(cz.x1 - cz.x0) / 3, Math.abs(cz.z1 - cz.z0) / 3) }}><planeGeometry args={[cz.x1 - cz.x0, cz.z1 - cz.z0]} /></mesh>)}

      {level.stations.map((s, i) => (
        <group key={s.id} ref={(r) => { stationRefs.current[i] = r }} position={[s.x, s.y || 0, s.z]}>
          <mesh position={[0, 0.5, 0]} material={a.mat.console} castShadow><cylinderGeometry args={[0.7, 0.9, 1, 8]} /></mesh>
          <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={a.mat.ring.clone()}><torusGeometry args={[0.85, 0.06, 8, 28]} /></mesh>
          <mesh position={[0, 2, 0]} material={a.mat.holo.clone()}><planeGeometry args={[1.5, 1]} /></mesh>
        </group>
      ))}
      {level.checkpoints.map((cp, i) => (
        <group key={i} ref={(r) => { cpRefs.current[i] = r }} position={[cp[0], cp[1], cp[2]]}>
          <mesh position={[0, 1.2, 0]} material={a.mat.ring.clone()}><cylinderGeometry args={[0.05, 0.05, 2.4, 6]} /></mesh>
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={a.mat.ring.clone()}><torusGeometry args={[0.9, 0.06, 8, 28]} /></mesh>
        </group>
      ))}
      <group ref={exitRef} position={[level.exit[0], level.exit[1] + 1.4, level.exit[2]]}>
        <mesh material={a.mat.ring.clone()}><torusGeometry args={[1.5, 0.1, 10, 36]} /></mesh>
        <mesh visible={false} material={a.mat.portal}><circleGeometry args={[1.4, 24]} /></mesh>
      </group>
      {g0.pickups.map((pk, i) => (
        <group key={pk.id} ref={(r) => { pickupRefs.current[i] = r }} position={[pk.x, (pk.y || 0) + 1.1, pk.z]}>
          <mesh><icosahedronGeometry args={[0.42, 0]} /><meshStandardMaterial color={pk.kind === 'recharge' ? '#4ade80' : POWERUPS[pk.kind].color} emissive={pk.kind === 'recharge' ? '#4ade80' : POWERUPS[pk.kind].color} emissiveIntensity={1} roughness={0.2} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={a.mat.ring.clone()}><torusGeometry args={[0.65, 0.04, 8, 24]} /></mesh>
        </group>
      ))}
      <instancedMesh ref={orbM} args={[a.geo.orb, a.mat.orb, 24]} frustumCulled={false} />
      <instancedMesh ref={projM} args={[a.geo.sphere, a.mat.orbBall, 40]} frustumCulled={false} onUpdate={(m) => { m.scale.set(0.45, 0.45, 0.45) }} />
      <instancedMesh ref={bitM} args={[a.geo.bit, a.mat.bit, 160]} frustumCulled={false} />

      <BossMount parent={bossRef} creature={creature} />
      <mesh ref={netRef} visible={false} material={a.mat.net}><icosahedronGeometry args={[1, 1]} /></mesh>
      <mesh ref={reticle} rotation={[-Math.PI / 2, 0, 0]} visible={false} material={a.mat.reticle}><ringGeometry args={[0.9, 1.05, 28]} /></mesh>

      <HunterBot controller={controller} />
    </>
  )
}

/** The boss mesh is made imperatively (it has many parts); this mounts it into the scene once. */
function BossMount({ parent, creature }) {
  const { scene } = useThree()
  useEffect(() => {
    const m = createBossMesh(creature)
    scene.add(m)
    parent.current = m
    return () => { scene.remove(m); parent.current = null }
  }, [scene, creature, parent])
  return null
}
