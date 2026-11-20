import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import JumpBot from './JumpBot.jsx'
import { THEMES } from './levels.js'

// The 3D scene of LAXBOT Jump. It only DRAWS: logic.js decides where everything is. Platforms are individual meshes (about 15 per level) sharing a few materials; coins, crystals, stars, glows and
// particles are instanced (one draw call per kind); everything created here is disposed when the scene is removed or the level changes.

const dummy = new THREE.Object3D()
const tmp = new THREE.Color()
const v3 = new THREE.Vector3()
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function starShape(outer, inner) {
  const s = new THREE.Shape()
  for (let i = 0; i < 10; i += 1) { const r = i % 2 ? inner : outer; const a = Math.PI / 2 + (i * Math.PI) / 5; if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r) }
  s.closePath(); return s
}
const radialTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c)
}
const skyTexture = (stops) => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256
  const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0, stops[0]); grd.addColorStop(0.55, stops[1]); grd.addColorStop(1, stops[2])
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
const gridTexture = (line, bg) => {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 64, 64); g.strokeStyle = line; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 61, 61)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t
}
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

/** Shared geometry and materials of one level (created once per level, disposed afterwards). */
function useAssets(theme, level) {
  return useMemo(() => {
    const th = THEMES[theme]
    const geo = {
      coin: new THREE.CylinderGeometry(0.36, 0.36, 0.1, 18).rotateX(Math.PI / 2),
      crystal: new THREE.OctahedronGeometry(0.42, 0).scale(1, 1.55, 1),
      star: new THREE.ExtrudeGeometry(starShape(0.62, 0.28), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }).center(),
      plane: new THREE.PlaneGeometry(1, 1), bit: new THREE.OctahedronGeometry(0.1, 0),
      box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 14, 10), cone: new THREE.ConeGeometry(1, 1, 10), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), torus: new THREE.TorusGeometry(1, 0.08, 10, 36),
    }
    const coinColor = theme === 'candy' ? '#ff5fa8' : '#ffd34d'
    const mat = {
      coin: new THREE.MeshStandardMaterial({ color: coinColor, emissive: theme === 'candy' ? '#ff2d88' : '#ffa600', emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.6 }),
      crystal: new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#38bdf8', emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.2, flatShading: true }),
      star: new THREE.MeshStandardMaterial({ color: '#fff176', emissive: '#ffb300', emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.3 }),
      top: new THREE.MeshStandardMaterial({ color: th.top, roughness: theme === 'neon' ? 0.35 : 0.6, metalness: theme === 'neon' ? 0.4 : 0.05, emissive: theme === 'neon' ? '#0a0a2a' : th.top, emissiveIntensity: theme === 'neon' ? 1 : 0.06 }),
      side: new THREE.MeshStandardMaterial({ color: th.side, roughness: 0.85, metalness: 0.05 }),
      trim: new THREE.MeshStandardMaterial({ color: th.trim, emissive: th.trim, emissiveIntensity: theme === 'neon' || theme === 'crystal' ? 1.6 : 0.35, roughness: 0.4 }),
      bounce: new THREE.MeshStandardMaterial({ color: '#ff4fa3', emissive: '#ff2d88', emissiveIntensity: 0.7, roughness: 0.3 }),
      portal: new THREE.MeshBasicMaterial({ color: th.glow, transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      ring: new THREE.MeshStandardMaterial({ color: th.glow, emissive: th.glow, emissiveIntensity: 1.8, roughness: 0.3 }),
      laser: new THREE.MeshBasicMaterial({ color: '#ff2b4d', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      laserPost: new THREE.MeshStandardMaterial({ color: '#2b2f4a', roughness: 0.4, metalness: 0.6, emissive: '#ff2b4d', emissiveIntensity: 0.5 }),
      spin: new THREE.MeshStandardMaterial({ color: theme === 'candy' ? '#ffffff' : '#e5e7eb', roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.08 }),
      spinTip: new THREE.MeshStandardMaterial({ color: '#ff4d6d', emissive: '#ff2b4d', emissiveIntensity: 0.6, roughness: 0.3 }),
      spike: new THREE.MeshStandardMaterial({ color: '#c4b5fd', emissive: '#7c3aed', emissiveIntensity: 0.6, roughness: 0.25, flatShading: true }),
      puff: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.95 }),
      flagOff: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.5 }),
      flagOn: new THREE.MeshStandardMaterial({ color: '#34d399', emissive: '#10b981', emissiveIntensity: 1.2, roughness: 0.4 }),
      glow: new THREE.MeshBasicMaterial({ map: null, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      bit: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      decor: new THREE.MeshStandardMaterial({ color: th.accent, roughness: 0.5, emissive: th.accent, emissiveIntensity: theme === 'neon' || theme === 'crystal' ? 0.9 : 0.15, flatShading: theme === 'crystal' }),
      decor2: new THREE.MeshStandardMaterial({ color: th.glow, roughness: 0.5, emissive: th.glow, emissiveIntensity: 0.5 }),
    }
    const tex = { glow: radialTexture(), grid: theme === 'neon' ? gridTexture('#22e6ff', '#14122e') : null }
    mat.glow.map = tex.glow
    return { geo, mat, tex, th }
  }, [theme, level])
}

function disposeAssets(a) { Object.values(a.geo).forEach((g) => g.dispose()); Object.values(a.mat).forEach((m) => m.dispose()); Object.values(a.tex).forEach((t) => t && t.dispose()) }

/** One platform: body, top cap, trim, and a theme-specific underside. Position is updated every frame for moving and disappearing platforms. */
function Platform({ pl, a, theme, shadows, setRef }) {
  const { w, d, h } = pl
  const grid = useMemo(() => { if (!a.tex.grid || pl.type === 'bounce') return null; const t = a.tex.grid.clone(); t.repeat.set(Math.max(1, Math.round(w / 1.2)), Math.max(1, Math.round(d / 1.2))); t.needsUpdate = true; return t }, [a, pl.type, w, d])
  useEffect(() => () => grid?.dispose(), [grid])
  const puffs = useMemo(() => theme === 'cloud' ? Array.from({ length: Math.round((w + d) * 0.9) }, (_, i) => { const t = (i / Math.round((w + d) * 0.9)) * Math.PI * 2; return [Math.cos(t) * (w / 2 + 0.05), -0.35 - hash(i + w) * 0.3, Math.sin(t) * (d / 2 + 0.05), 0.55 + hash(i * 3 + d) * 0.35] }) : [], [theme, w, d])
  const island = theme !== 'neon' && theme !== 'cloud'
  return (
    <group ref={setRef}>
      {pl.type === 'bounce' ? (
        <>
          <mesh geometry={a.geo.cyl} material={a.mat.side} position={[0, -0.45, 0]} scale={[w * 0.5, 0.9, d * 0.5]} receiveShadow />
          <mesh geometry={a.geo.cyl} material={a.mat.bounce} position={[0, -0.04, 0]} scale={[w * 0.4, 0.16, d * 0.4]} castShadow name="spring" />
          <mesh geometry={a.geo.torus} material={a.mat.ring} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[w * 0.34, w * 0.34, 1.2]} />
        </>
      ) : (
        <>
          <mesh geometry={a.geo.box} material={a.mat.side} position={[0, -h / 2 - 0.05, 0]} scale={[w, h - 0.1, d]} castShadow={shadows} receiveShadow />
          <mesh geometry={a.geo.box} material={a.mat.top} position={[0, -0.09, 0]} scale={[w + 0.04, 0.18, d + 0.04]} castShadow={shadows} receiveShadow name="topcap">
            {grid && <meshStandardMaterial attach="material" map={grid} color="#9ae6ff" roughness={0.4} metalness={0.4} emissive="#22e6ff" emissiveMap={grid} emissiveIntensity={0.9} />}
          </mesh>
          <mesh geometry={a.geo.box} material={a.mat.trim} position={[0, -0.3, 0]} scale={[w + 0.12, 0.07, d + 0.12]} />
          {island && <mesh geometry={a.geo.cone} material={a.mat.side} position={[0, -h - Math.min(w, d) * 0.4, 0]} rotation={[Math.PI, 0, 0]} scale={[Math.min(w, d) * 0.5, Math.min(w, d) * 0.9, Math.min(w, d) * 0.5]} />}
          {theme === 'neon' && <mesh geometry={a.geo.box} material={a.mat.trim} position={[0, -h - 0.9, 0]} scale={[0.14, 1.8, 0.14]} />}
          {puffs.map(([x, y, z, r], i) => <mesh key={i} geometry={a.geo.sphere} material={a.mat.puff} position={[x, y, z]} scale={r} />)}
          {theme === 'cloud' && pl.deco === 'start' && null}
        </>
      )}
    </group>
  )
}

/** Background decoration: seeded positions along the course, never on it. */
function Decor({ level, a, theme, quality }) {
  const items = useMemo(() => {
    const zs = level.platforms.map((p) => p.z); const zMin = Math.min(...zs) - 40; const zMax = Math.max(...zs) + 25
    const n = quality === 'low' ? 14 : quality === 'medium' ? 22 : 32
    return Array.from({ length: n }, (_, i) => {
      const side = hash(i * 2 + 1) > 0.5 ? 1 : -1
      return { x: side * (11 + hash(i * 7) * 22), y: -6 + hash(i * 5) * 26, z: zMin + hash(i * 11) * (zMax - zMin), s: 0.8 + hash(i * 13) * 1.8, r: hash(i * 17) * 6, bob: hash(i * 19) * 6 }
    })
  }, [level, quality])
  const refs = useRef([])
  useFrame((st) => { const t = st.clock.elapsedTime; refs.current.forEach((g, i) => { if (g) g.position.y = items[i].y + Math.sin(t * 0.5 + items[i].bob) * 0.5 }) })
  return (
    <>
      {items.map((it, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g }} position={[it.x, it.y, it.z]} rotation={[0, it.r, 0]} scale={it.s}>
          {theme === 'cloud' && <><mesh geometry={a.geo.sphere} material={a.mat.puff} scale={[2.2, 0.9, 1.4]} /><mesh geometry={a.geo.sphere} material={a.mat.puff} position={[1.2, 0.3, 0]} scale={1} /><mesh geometry={a.geo.sphere} material={a.mat.puff} position={[-1.1, 0.2, 0.2]} scale={0.9} /></>}
          {theme === 'candy' && (i % 2 ? <><mesh geometry={a.geo.cyl} material={a.mat.spin} position={[0, -1.5, 0]} scale={[0.12, 3, 0.12]} /><mesh geometry={a.geo.sphere} material={a.mat.decor} position={[0, 0.4, 0]} scale={1.2} /><mesh geometry={a.geo.torus} material={a.mat.decor2} position={[0, 0.4, 0]} scale={1.3} /></> : <mesh geometry={a.geo.sphere} material={a.mat.decor2} scale={[1, 1.2, 1]} />)}
          {theme === 'crystal' && <><mesh geometry={a.geo.cone} material={a.mat.decor} position={[0, 1.5, 0]} scale={[0.7, 3.2, 0.7]} /><mesh geometry={a.geo.cone} material={a.mat.decor} position={[0.9, 0.9, 0.3]} rotation={[0, 0, -0.3]} scale={[0.45, 2, 0.45]} /><mesh geometry={a.geo.cone} material={a.mat.decor2} position={[-0.8, 0.6, -0.2]} rotation={[0, 0, 0.35]} scale={[0.4, 1.5, 0.4]} /></>}
          {theme === 'neon' && <><mesh geometry={a.geo.box} material={a.mat.side} position={[0, 4, 0]} scale={[2.2, 8 + (i % 4) * 3, 2.2]} /><mesh geometry={a.geo.box} material={a.mat.decor} position={[0, 5, 1.12]} scale={[1.6, 0.12, 0.05]} /><mesh geometry={a.geo.box} material={a.mat.decor2} position={[0, 7.5, 1.12]} scale={[1.6, 0.12, 0.05]} /></>}
          {theme === 'space' && (i % 3 === 0 ? <><mesh geometry={a.geo.sphere} material={a.mat.decor} scale={2.4} /><mesh geometry={a.geo.torus} material={a.mat.decor2} rotation={[1.2, 0, 0.3]} scale={3.6} /></> : <><mesh geometry={a.geo.cyl} material={a.mat.top} scale={[1.6, 0.3, 1.6]} /><mesh geometry={a.geo.cone} material={a.mat.side} position={[0, -1.1, 0]} rotation={[Math.PI, 0, 0]} scale={[1.5, 2, 1.5]} /><mesh geometry={a.geo.sphere} material={a.mat.decor2} position={[0.3, 0.45, 0]} scale={0.35} /></>)}
        </group>
      ))}
    </>
  )
}

function Stars({ count, color }) {
  const geom = useMemo(() => { const p = new Float32Array(count * 3); for (let i = 0; i < count; i += 1) { p[i * 3] = (hash(i) - 0.5) * 200; p[i * 3 + 1] = hash(i + 99) * 90; p[i * 3 + 2] = -hash(i + 7) * 260 + 30 } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g }, [count])
  useEffect(() => () => geom.dispose(), [geom])
  return <points geometry={geom} frustumCulled={false}><pointsMaterial color={color} size={0.5} sizeAttenuation transparent opacity={0.9} depthWrite={false} /></points>
}

export default function Scene({ controller, quality, shadows }) {
  const { scene, camera, size } = useThree()
  const g0 = controller.state.sim
  const level = g0.level
  const theme = level.theme
  const a = useAssets(theme, level.id)
  const th = a.th
  const platRefs = useRef({}); const coinM = useRef(); const crystalM = useRef(); const starM = useRef(); const glowM = useRef(); const bitM = useRef()
  const spinRefs = useRef([]); const laserRefs = useRef([]); const cpRefs = useRef([]); const portal = useRef(); const portalInner = useRef(); const sun = useRef(); const sunTarget = useRef()
  const parts = useRef(Array.from({ length: 120 }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, color: new THREE.Color() })))
  const cam = useRef({ fy: 0, x: 0, z: 0, init: false })
  const sky = useMemo(() => skyTexture(th.sky), [th])
  const fps = useRef({ n: 0, sum: 0, low: 0 })
  const L = level
  const ids = useMemo(() => ({ coins: L.coins.length, crystals: L.crystals.length, stars: L.stars.length }), [L])

  useEffect(() => { scene.background = sky; scene.fog = new THREE.Fog(th.fog, 38, 120); return () => { scene.background = null; scene.fog = null; sky.dispose() } }, [scene, sky, th])
  useEffect(() => () => disposeAssets(a), [a])
  useEffect(() => { if (sun.current && sunTarget.current) sun.current.target = sunTarget.current }, [])

  const burst = (color, x, y, z, count, speed = 4, up = 1.5) => {
    let n = 0
    for (const p of parts.current) {
      if (p.on) continue
      const ang = Math.random() * Math.PI * 2; const sp = speed * (0.4 + Math.random() * 0.8)
      p.on = true; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(ang) * sp; p.vy = (Math.random() * 0.8 + 0.2) * sp * 0.6 + up; p.vz = Math.sin(ang) * sp; p.life = 0; p.max = 0.45 + Math.random() * 0.5; p.size = 0.6 + Math.random() * 0.9
      p.color.set(color); if (++n >= count) break
    }
  }

  // aspect-aware framing: wider view on tall (phone) screens
  useEffect(() => { camera.fov = size.width / size.height < 0.8 ? 58 : 46; camera.updateProjectionMatrix() }, [camera, size.width, size.height])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state; const g = c.sim; const p = g.p; const t = state.clock.elapsedTime
    controller.tick(dt)
    const reduce = c.reduceMotion

    // quality sampling: if the device cannot keep up for a couple of seconds, lower the quality once
    const f = fps.current; f.n += 1; f.sum += dtRaw
    if (f.n >= 90) { const avg = f.sum / f.n; f.low = avg > 1 / 38 ? f.low + 1 : 0; state.gl.domElement.dataset.fps = String(Math.round(1 / avg)); state.gl.domElement.dataset.quality = quality; f.n = 0; f.sum = 0; if (f.low >= 2) { f.low = 0; controller.onSlow?.() } }

    // ---- effects from the rules ----
    const amt = reduce ? 0.35 : quality === 'low' ? 0.6 : 1
    for (const e of controller.drainFx()) {
      if (e.type === 'coin') burst('#ffe066', e.x, e.y, e.z, Math.round(8 * amt), 3)
      else if (e.type === 'crystal') burst('#7dd3fc', e.x, e.y, e.z, Math.round(14 * amt), 4)
      else if (e.type === 'star') burst('#fff176', e.x, e.y, e.z, Math.round(26 * amt), 6)
      else if (e.type === 'jump') burst('#ffffff', e.x, e.y + 0.1, e.z, Math.round(5 * amt), 2, 0.3)
      else if (e.type === 'doubleJump') burst(th.accent, e.x, e.y, e.z, Math.round(12 * amt), 4, 0.2)
      else if (e.type === 'land') burst('#ffffff', e.x, e.y + 0.1, e.z, Math.round((e.hard ? 12 : 6) * amt), 3, 0.4)
      else if (e.type === 'bounce') burst('#ff77c8', e.x, e.y, e.z, Math.round(14 * amt), 4)
      else if (e.type === 'checkpoint') burst('#34d399', e.x, e.y + 1, e.z, Math.round(22 * amt), 4)
      else if (e.type === 'damage' || e.type === 'fall') burst('#fb7185', e.x, e.y + 0.8, e.z, Math.round(16 * amt), 5)
      else if (e.type === 'respawn') burst('#ffffff', e.x, e.y + 0.8, e.z, Math.round(20 * amt), 4)
      else if (e.type === 'complete') burst(th.glow, e.x, e.y + 1, e.z, Math.round(40 * amt), 7)
    }

    // ---- platforms ----
    for (const pl of g.plats) {
      const ref = platRefs.current[pl.id]; if (!ref) continue
      ref.position.set(pl.cx, pl.cy, pl.cz)
      if (pl.cycle) {
        ref.visible = pl.solid || pl.back
        const flick = (pl.warn || pl.back) && Math.sin(t * 36) > 0
        ref.scale.setScalar(flick ? 0.92 : 1)
      }
      if (pl.type === 'bounce') { const sp = ref.getObjectByName('spring'); if (sp) { const k = g.ground === pl.id ? 0.5 : 1 + Math.sin(t * 5) * 0.08; sp.scale.y = 0.16 * k } }
    }

    // ---- collectibles (taken ones disappear) ----
    const place = (mesh, list, spin, lift, scale, kind) => {
      list.forEach((it, i) => {
        const gone = g.taken.has(it.id)
        dummy.position.set(it.x, it.y + Math.sin(t * 2.2 + i) * lift, it.z)
        dummy.rotation.set(0, t * spin + i, kind === 'star' ? Math.sin(t * 2 + i) * 0.2 : 0)
        dummy.scale.setScalar(gone ? 0.0001 : scale * (kind === 'star' ? 1 + Math.sin(t * 4 + i) * 0.08 : 1)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    place(coinM.current, L.coins, 3, 0.12, 1, 'coin'); place(crystalM.current, L.crystals, 1.5, 0.16, 1, 'crystal'); place(starM.current, L.stars, 2, 0.2, 1.15, 'star')
    let gi = 0
    const glow = (list, color, size, kind) => list.forEach((it, i) => { dummy.position.set(it.x, it.y + (kind === 'coin' ? 0 : Math.sin(t * 2.2 + i) * 0.16), it.z - 0.2); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(g.taken.has(it.id) ? 0.0001 : size * (kind === 'star' ? 1 + Math.sin(t * 3) * 0.15 : 1)); dummy.updateMatrix(); glowM.current.setMatrixAt(gi, dummy.matrix); tmp.set(color); glowM.current.setColorAt(gi, tmp); gi += 1 })
    glow(L.coins, theme === 'candy' ? '#ff7ab8' : '#ffd34d', 1.5, 'coin'); glow(L.crystals, '#7dd3fc', 2.4, 'crystal'); glow(L.stars, '#fff176', 3.4, 'star')
    glowM.current.count = gi; glowM.current.instanceMatrix.needsUpdate = true; if (glowM.current.instanceColor) glowM.current.instanceColor.needsUpdate = true

    // ---- hazards ----
    L.spinners.forEach((s, i) => { const r = spinRefs.current[i]; if (r) r.rotation.y = -(s.speed * g.t + (s.phase || 0)) })
    g.lasers.forEach((l, i) => { const r = laserRefs.current[i]; if (!r) return; r.position.set(l.cx, l.y + l.hh, l.cz); r.visible = l.active || (l.warn && Math.sin(t * 40) > 0); r.children[0].material.opacity = l.active ? 0.85 : 0.35 })
    L.checkpoints.forEach((cp, i) => { const r = cpRefs.current[i]; if (!r) return; const on = g.cp >= i; r.children[0].material = on ? a.mat.flagOn : a.mat.flagOff; r.children[1].rotation.y = t * (on ? 3 : 0.5) })
    if (portal.current) { portal.current.rotation.z = t * 1.2; portalInner.current.rotation.z = -t * 2; const s = 1 + Math.sin(t * 3) * 0.04; portal.current.scale.set(s, s, 1) }

    // ---- particles ----
    let pn = 0
    for (const q of parts.current) {
      if (!q.on) continue
      q.life += dt; if (q.life >= q.max) { q.on = false; continue }
      q.vy -= 10 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt
      const k = 1 - q.life / q.max
      dummy.position.set(q.x, q.y, q.z); dummy.rotation.set(q.life * 5, q.life * 7, 0); dummy.scale.setScalar(q.size * k); dummy.updateMatrix()
      bitM.current.setMatrixAt(pn, dummy.matrix); bitM.current.setColorAt(pn, q.color); pn += 1
    }
    bitM.current.count = pn; bitM.current.instanceMatrix.needsUpdate = true; if (bitM.current.instanceColor) bitM.current.instanceColor.needsUpdate = true

    // ---- sun / shadow light follows LAXBOT ----
    if (sun.current) { sun.current.position.set(p.x + 8, p.y + 16, p.z + 10); sunTarget.current.position.set(p.x, p.y, p.z); sunTarget.current.updateMatrixWorld() }

    // ---- camera: third person behind LAXBOT; vertical follow is damped so jumps do not bob the view ----
    const cs = cam.current
    if (!cs.init) { cs.fy = p.y; cs.x = p.x; cs.z = p.z; cs.init = true }
    const portrait = size.width / size.height < 0.8
    const k = (rate) => 1 - Math.exp(-rate * dt)
    if (g.respawnT > 0 && p.y < g.level.killY + 2) { /* falling out of the course: keep the view on the course */ } else {
      cs.x += (p.x - cs.x) * k(reduce ? 12 : 5); cs.z += (p.z - cs.z) * k(reduce ? 12 : 6)
      const want = g.grounded || p.y > cs.fy + 1.2 || p.y < cs.fy - 3 ? p.y : cs.fy
      cs.fy += (want - cs.fy) * k(g.grounded ? 3.2 : 2)
    }
    const back = portrait ? 12.5 : 9.5; const high = portrait ? 8.2 : 5.8
    const shake = g.hurtT > 0 && !reduce ? Math.sin(t * 80) * 0.07 * (g.hurtT / 0.9) : 0
    camera.position.set(cs.x * 0.9 + shake, cs.fy + high, cs.z + back)
    camera.lookAt(cs.x * 0.9, cs.fy + 1.2, cs.z - 3.2)
  })

  const hi = quality === 'high'
  return (
    <>
      <hemisphereLight args={[th.sky[2], th.top, 0.95]} />
      <ambientLight intensity={0.35} />
      <directionalLight ref={sun} intensity={2.1} color={th.sun} castShadow={shadows} shadow-mapSize={hi ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={16} shadow-camera-bottom={-12} shadow-camera-near={1} shadow-camera-far={70} shadow-bias={-0.0006} />
      <primitive object={useMemo(() => new THREE.Object3D(), [])} ref={sunTarget} />
      <pointLight position={[-8, 8, 6]} intensity={14} color={th.accent} distance={30} />
      {(theme === 'crystal' || theme === 'neon' || theme === 'space') && <Stars count={quality === 'low' ? 120 : 320} color={theme === 'neon' ? '#9aa8ff' : '#ffffff'} />}

      {L.platforms.map((pl) => <Platform key={pl.id} pl={pl} a={a} theme={theme} shadows={shadows} setRef={(r) => { platRefs.current[pl.id] = r }} />)}
      <Decor level={L} a={a} theme={theme} quality={quality} />

      {/* start pad ring, checkpoints and the finish portal */}
      {L.checkpoints.map((cp, i) => (
        <group key={cp.id} ref={(r) => { cpRefs.current[i] = r }} position={[cp.pos[0], cp.pos[1], cp.pos[2]]}>
          <mesh geometry={a.geo.cyl} material={a.mat.flagOff} position={[0, 1.1, 0]} scale={[0.07, 2.2, 0.07]} />
          <group position={[0, 2.1, 0]}><mesh geometry={a.geo.box} material={a.mat.flagOn} position={[0.45, 0, 0]} scale={[0.9, 0.55, 0.05]} /><mesh geometry={a.geo.torus} material={a.mat.ring} position={[0, -1.7, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1.1} /></group>
        </group>
      ))}
      <group position={[L.finish[0], L.finish[1] + 1.9, L.finish[2]]}>
        <group ref={portal}><mesh geometry={a.geo.torus} material={a.mat.ring} scale={[1.7, 1.9, 1.7]} /><mesh geometry={a.geo.torus} material={a.mat.ring} scale={[1.45, 1.65, 1.5]} /></group>
        <mesh ref={portalInner}><circleGeometry args={[1.6, 28]} /><primitive object={a.mat.portal} attach="material" /></mesh>
        <pointLight color={th.glow} intensity={10} distance={9} />
      </group>

      {L.spinners.map((s, i) => (
        <group key={i} ref={(r) => { spinRefs.current[i] = r }} position={[s.x, s.y, s.z]}>
          <mesh geometry={a.geo.cyl} material={a.mat.spinTip} position={[0, -0.25, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
          {Array.from({ length: s.arms }, (_, arm) => { const ang = (arm * Math.PI * 2) / s.arms; return (
            <group key={arm} rotation={[0, -ang, 0]}>
              <mesh geometry={a.geo.cyl} material={a.mat.spin} position={[s.r / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.22, s.r, 0.22]} castShadow />
              <mesh geometry={a.geo.sphere} material={a.mat.spinTip} position={[s.r, 0, 0]} scale={0.42} castShadow />
            </group>
          ) })}
        </group>
      ))}
      {g0.lasers.map((l, i) => (
        <group key={i} ref={(r) => { laserRefs.current[i] = r }} position={[l.x, l.y + l.hh, l.z]}>
          <mesh geometry={a.geo.box} material={a.mat.laser} scale={[l.hw * 2, l.hh * 2, 0.16]} />
          <mesh geometry={a.geo.box} material={a.mat.laserPost} position={[-l.hw - 0.1, 0, 0]} scale={[0.22, l.hh * 2 + 0.3, 0.3]} />
          <mesh geometry={a.geo.box} material={a.mat.laserPost} position={[l.hw + 0.1, 0, 0]} scale={[0.22, l.hh * 2 + 0.3, 0.3]} />
        </group>
      ))}
      {L.spikes.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]}>
          {Array.from({ length: Math.max(1, Math.round(s.hw * 2 / 0.5)) }, (_, k2) => <mesh key={k2} geometry={a.geo.cone} material={a.mat.spike} position={[-s.hw + 0.25 + k2 * 0.5, 0.4, 0]} scale={[0.26, 0.8, 0.26]} castShadow />)}
        </group>
      ))}

      <instancedMesh ref={coinM} args={[a.geo.coin, a.mat.coin, ids.coins]} frustumCulled={false} castShadow={shadows} />
      <instancedMesh ref={crystalM} args={[a.geo.crystal, a.mat.crystal, ids.crystals]} frustumCulled={false} />
      <instancedMesh ref={starM} args={[a.geo.star, a.mat.star, Math.max(1, ids.stars)]} frustumCulled={false} />
      <instancedMesh ref={glowM} args={[a.geo.plane, a.mat.glow, ids.coins + ids.crystals + ids.stars]} frustumCulled={false} />
      <instancedMesh ref={bitM} args={[a.geo.bit, a.mat.bit, 120]} frustumCulled={false} />

      <JumpBot controller={controller} />
    </>
  )
}

void clamp; void v3
