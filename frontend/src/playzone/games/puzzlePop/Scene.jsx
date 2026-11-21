import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import Mascot from './Mascot.jsx'
import { GEM_COLORS, WORLDS } from './levels.js'

// The 3D scene of Puzzle Pop. It only DRAWS: the controller owns the positions and animations of the tiles. Every kind of piece is one InstancedMesh (a handful of draw calls for the whole
// board), the six crystal cuts have their own geometry, reflections come from a small generated environment (one PMREM, made once), and everything is disposed with the scene.

const THEMES = {
  garden: { sky: ['#5b2a86', '#c05fb0', '#ffd1e8'], tray: '#3a1b5c', cellA: '#5b2f86', cellB: '#4b2574', fog: '#c05fb0', accent: '#f9a8d4', block: '#fb923c', ambient: 'motes', glow: '#ffd1f3' },
  ocean: { sky: ['#032a4a', '#0a6f8f', '#7be0d3'], tray: '#06344f', cellA: '#0b5a7a', cellB: '#094c68', fog: '#0a6f8f', accent: '#5eead4', block: '#f97362', ambient: 'bubbles', glow: '#a7fff0' },
  frozen: { sky: ['#1d3a6e', '#6fa6e0', '#e6f6ff'], tray: '#1f3f73', cellA: '#3d70b0', cellB: '#3763a0', fog: '#6fa6e0', accent: '#bae6fd', block: '#93c5fd', ambient: 'snow', glow: '#ffffff' },
  sky: { sky: ['#ff8a3d', '#ffc86b', '#fff2c9'], tray: '#7a3b12', cellA: '#a8531c', cellB: '#964818', fog: '#ffc86b', accent: '#fcd34d', block: '#b45309', ambient: 'motes', glow: '#fff1a8' },
  galaxy: { sky: ['#0a0524', '#2a1068', '#7a3fd0'], tray: '#1a0c45', cellA: '#33198a', cellB: '#2b1478', fog: '#2a1068', accent: '#c4b5fd', block: '#818cf8', ambient: 'stars', glow: '#e9d5ff' },
}
const dummy = new THREE.Object3D()
const tmp = new THREE.Color()
const v3 = new THREE.Vector3()
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const wx = (c) => c - 3.5
const wy = (r) => 3.5 - r

function skyTexture(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256
  const g = cv.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0, stops[0]); grd.addColorStop(0.55, stops[1]); grd.addColorStop(1, stops[2]); g.fillStyle = grd; g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t
}
const glowTexture = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64
  const g = cv.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(cv)
}
const faceted = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g }
function heartGeometry() {
  const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.9, 0.05, -0.55, 0.75, 0, 0.35); s.bezierCurveTo(0.55, 0.75, 0.9, 0.05, 0, -0.5)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 4, curveSegments: 16 }); g.center(); g.scale(0.62, 0.62, 0.9); return g
}

function useAssets(themeKey) {
  return useMemo(() => {
    const th = THEMES[themeKey]
    const lathe = (pts, seg, flat) => { const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); return flat ? faceted(g) : g }
    const gems = [
      faceted(new THREE.OctahedronGeometry(0.5, 0).scale(0.9, 1.2, 0.9)), // ruby: a pointed diamond
      faceted(new THREE.IcosahedronGeometry(0.47, 0)), // sapphire: many facets
      lathe([[0, -0.42], [0.3, -0.42], [0.44, -0.24], [0.44, 0.24], [0.3, 0.42], [0, 0.42]], 8, true), // emerald: step cut
      lathe([[0, -0.46], [0.22, -0.32], [0.47, 0.04], [0.4, 0.22], [0.22, 0.3], [0, 0.3]], 16, false), // topaz: brilliant round
      lathe([[0, -0.5], [0.38, -0.14], [0.38, 0.14], [0, 0.5]], 6, true), // amethyst: hexagonal point
      heartGeometry(), // rose quartz: a heart
    ]
    const geo = {
      gems, plane: new THREE.PlaneGeometry(1, 1), bit: new THREE.OctahedronGeometry(0.1, 0), box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 16, 12), cone: new THREE.ConeGeometry(1, 1, 12),
      torus: new THREE.TorusGeometry(1, 0.07, 10, 40), rock: faceted(new THREE.DodecahedronGeometry(0.46, 0)), lid: new THREE.CylinderGeometry(0.25, 0.25, 0.7, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
    }
    const envMat = (extra) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5, ...extra })
    const mat = {
      gem: envMat({}),
      special: envMat({ emissive: '#ffffff', emissiveIntensity: 0.25 }),
      rainbow: envMat({ emissive: '#ffffff', emissiveIntensity: 0.5, metalness: 0.3 }),
      glow: new THREE.MeshBasicMaterial({ map: null, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      ring: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      bit: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      bomb: new THREE.MeshStandardMaterial({ color: '#1f1b2e', roughness: 0.3, metalness: 0.5, emissive: '#ff5a1f', emissiveIntensity: 0.5 }),
      arrow: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.7, roughness: 0.3 }),
      chest: new THREE.MeshStandardMaterial({ color: '#8b4a16', roughness: 0.55, metalness: 0.15 }),
      gold: new THREE.MeshStandardMaterial({ color: '#ffd34d', roughness: 0.25, metalness: 0.8, emissive: '#b45309', emissiveIntensity: 0.3 }),
      rock: new THREE.MeshStandardMaterial({ color: th.block, roughness: 0.55, metalness: 0.05 }),
      ice: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.2 }),
      tray: new THREE.MeshStandardMaterial({ color: th.tray, roughness: 0.35, metalness: 0.3 }),
      cell: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
      sel: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
      beam: new THREE.MeshBasicMaterial({ color: '#fff7c2', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    }
    const tex = { glow: glowTexture() }
    mat.glow.map = tex.glow
    return { geo, mat, tex, th }
  }, [themeKey])
}
function disposeAssets(a) {
  a.geo.gems.forEach((g) => g.dispose())
  Object.entries(a.geo).forEach(([k, g]) => { if (k !== 'gems') g.dispose() })
  Object.values(a.mat).forEach((m) => m.dispose()); Object.values(a.tex).forEach((t) => t.dispose())
}

export default function Scene({ controller, quality }) {
  const { scene, camera, size, gl } = useThree()
  const themeKey = WORLDS[controller.state.game.level.world - 1].key
  const a = useAssets(themeKey)
  const th = a.th
  const sky = useMemo(() => skyTexture(th.sky), [th])
  const gemRefs = useRef([]); const arrowM = useRef(); const bombM = useRef(); const ringM = useRef(); const rainbowM = useRef(); const chestM = useRef(); const lidM = useRef(); const rockM = useRef()
  const curM = useRef(); const iceM = useRef(); const cellM = useRef(); const glowM = useRef(); const bitM = useRef(); const selM = useRef(); const hintA = useRef(); const hintB = useRef()
  const beams = useRef([]); const rings = useRef([]); const active = useRef([])
  const ambient = useRef(); const bubbles = useMemo(() => Array.from({ length: quality === 'low' ? 40 : 90 }, (_, i) => ({ x: (hash(i) - 0.5) * 30, y: (hash(i + 5) - 0.5) * 22, z: -4 - hash(i + 9) * 12, v: 0.2 + hash(i + 13) * 0.6, s: 0.5 + hash(i + 17) })), [quality])
  const parts = useRef(Array.from({ length: 160 }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, color: new THREE.Color() })))
  const fps = useRef({ n: 0, sum: 0, low: 0 })
  const ambientGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bubbles.length * 3), 3)); return g }, [bubbles])

  useEffect(() => { scene.background = sky; scene.fog = new THREE.Fog(th.fog, 22, 60); return () => { scene.background = null; scene.fog = null; sky.dispose() } }, [scene, sky, th])
  useEffect(() => { // reflections for the glossy crystals
    const pm = new THREE.PMREMGenerator(gl); const env = new RoomEnvironment(); const rt = pm.fromScene(env, 0.04)
    scene.environment = rt.texture; scene.environmentIntensity = 0.9
    return () => { scene.environment = null; rt.dispose(); pm.dispose(); env.dispose?.() }
  }, [scene, gl])
  useEffect(() => () => { disposeAssets(a); ambientGeo.dispose() }, [a, ambientGeo])

  // frame the board and the mascot for the shape of the screen
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    camera.fov = 40; camera.updateProjectionMatrix()
    const t = Math.tan((camera.fov * Math.PI) / 360)
    const needH = 14.4; const needW = 9.6
    const dist = Math.max(needH / 2 / t, needW / 2 / (t * aspect))
    camera.userData = { dist, aspect }
  }, [camera, size.width, size.height])

  const burst = (color, r, c, count) => {
    let n = 0
    for (const p of parts.current) {
      if (p.on) continue
      const ang = Math.random() * Math.PI * 2; const sp = 2 + Math.random() * 3
      p.on = true; p.x = wx(c); p.y = wy(r); p.z = 0.3; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp + 1.5; p.vz = 1 + Math.random() * 2; p.life = 0; p.max = 0.45 + Math.random() * 0.45; p.size = 0.7 + Math.random() * 0.9
      if (color >= 0) p.color.set(GEM_COLORS[color]); else if (color === -2) p.color.set('#fb923c'); else if (color === -3) p.color.set('#e0f2fe'); else p.color.setHSL(Math.random(), 1, 0.65)
      if (++n >= count) break
    }
  }
  // let the page turn a pointer position into a board cell (used by touch, mouse and pen input)
  useEffect(() => {
    const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); const hit = new THREE.Vector3(); const ndc = new THREE.Vector2()
    controller.pick = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(plane, hit)) return null
      const col = Math.floor(hit.x + 4); const row = Math.floor(4 - hit.y)
      return row >= 0 && row < 8 && col >= 0 && col < 8 ? [row, col] : null
    }
    return () => { controller.pick = null }
  }, [controller, camera, gl])
  const project = (x, y) => { v3.set(x, y, 0.3).project(camera); return [(v3.x * 0.5 + 0.5) * size.width, (-v3.y * 0.5 + 0.5) * size.height] }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state
    const t = state.clock.elapsedTime
    controller.tick(dt)
    const reduce = c.reduceMotion

    const f = fps.current; f.n += 1; f.sum += dtRaw
    if (f.n >= 90) { const avg = f.sum / f.n; f.low = avg > 1 / 38 ? f.low + 1 : 0; gl.domElement.dataset.fps = String(Math.round(1 / avg)); gl.domElement.dataset.quality = quality; f.n = 0; f.sum = 0; if (f.low >= 2) { f.low = 0; controller.onSlow?.() } }

    // ---- effects from the controller ----
    for (const e of controller.drainFx()) {
      if (e.type === 'burst') burst(e.color, e.r, e.c, e.count)
      else if (e.type === 'popup') controller.popup?.(project(wx(e.c), wy(e.r) + 0.4), e.text, e.color, e.big)
      else if (e.type === 'beam') active.current.push({ kind: 'beam', r: e.r, c: e.c, vertical: e.kind === 'rocketV', wide: e.wide, life: 0, max: 0.5 })
      else if (e.type === 'ring') active.current.push({ kind: 'ring', r: e.r, c: e.c, radius: e.radius || 1, life: 0, max: 0.5 })
      else if (e.type === 'rainbow') { active.current.push({ kind: 'ring', r: e.r, c: e.c, radius: 2.5, life: 0, max: 0.6, rainbow: true }); for (const [tr, tc] of (e.targets || []).slice(0, 40)) burst(-1, tr, tc, 2) }
    }

    // ---- tiles → instanced meshes ----
    const counts = [0, 0, 0, 0, 0, 0]
    let nArrow = 0; let nBomb = 0; let nRing = 0; let nRain = 0; let nChest = 0; let nRock = 0; let nGlow = 0
    const sel = c.selected
    for (const vt of c.tiles.values()) {
      const x = wx(vt.x); const y = wy(vt.y)
      const isSel = sel && Math.round(vt.x) === sel[1] && Math.round(vt.y) === sel[0] && c.phase === 'playing'
      const breath = reduce ? 1 : 1 + Math.sin(t * 2 + vt.id) * 0.015
      const sc = vt.scale * (isSel ? 1.14 : 1) * breath
      if (vt.alpha < 0.02 || sc < 0.01) continue
      if (vt.kind === 'treasure') {
        dummy.position.set(x, y - 0.08, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(0.74 * sc, 0.46 * sc, 0.5 * sc); dummy.updateMatrix(); chestM.current.setMatrixAt(nChest, dummy.matrix)
        dummy.position.set(x, y + 0.18, 0); dummy.scale.set(sc, sc * 0.9, sc * 0.9); dummy.updateMatrix(); lidM.current.setMatrixAt(nChest, dummy.matrix); nChest += 1
        dummy.position.set(x, y, -0.2); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1.8 * sc); dummy.updateMatrix(); glowM.current.setMatrixAt(nGlow, dummy.matrix); tmp.set('#ffd34d'); glowM.current.setColorAt(nGlow, tmp); nGlow += 1
        continue
      }
      if (vt.kind === 'block') {
        dummy.position.set(x, y, 0); dummy.rotation.set(0.2, 0.4, 0); dummy.scale.setScalar(sc * (vt.glow > 0 ? 1.1 : 1)); dummy.updateMatrix(); rockM.current.setMatrixAt(nRock, dummy.matrix)
        tmp.set(th.block).multiplyScalar(vt.hp >= 2 ? 0.6 : 1); if (vt.glow > 0) tmp.lerp(new THREE.Color('#ffffff'), vt.glow); rockM.current.setColorAt(nRock, tmp); nRock += 1
        continue
      }
      const spin = reduce ? 0 : Math.sin(t * 1.3 + vt.id * 0.7) * 0.3 + (isSel ? t * 3 : 0)
      if (vt.special === 'rainbow') {
        dummy.position.set(x, y, 0); dummy.rotation.set(0, t * 1.5, 0); dummy.scale.setScalar(0.5 * sc); dummy.updateMatrix(); rainbowM.current.setMatrixAt(nRain, dummy.matrix)
        tmp.setHSL((t * 0.4 + vt.id * 0.13) % 1, 1, 0.62); rainbowM.current.setColorAt(nRain, tmp); nRain += 1
        dummy.rotation.set(Math.PI / 2.4, t * 2, 0); dummy.scale.setScalar(0.62 * sc); dummy.updateMatrix(); ringM.current.setMatrixAt(nRing, dummy.matrix); tmp.setHSL((t * 0.4 + 0.5) % 1, 1, 0.7); ringM.current.setColorAt(nRing, tmp); nRing += 1
        dummy.position.set(x, y, -0.2); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1.7 * sc); dummy.updateMatrix(); glowM.current.setMatrixAt(nGlow, dummy.matrix); tmp.setHSL((t * 0.4) % 1, 1, 0.6); glowM.current.setColorAt(nGlow, tmp); nGlow += 1
        continue
      }
      const gi = vt.color
      const idx = counts[gi]; counts[gi] += 1
      dummy.position.set(x, y, 0); dummy.rotation.set(vt.special ? 0 : spin * 0.4, spin + (vt.special ? t * 1.2 : 0), 0); dummy.scale.setScalar(sc); dummy.updateMatrix(); gemRefs.current[gi].setMatrixAt(idx, dummy.matrix)
      tmp.set(GEM_COLORS[gi]); if (isSel) tmp.multiplyScalar(1.35); gemRefs.current[gi].setColorAt(idx, tmp)
      if (vt.special === 'rocketH' || vt.special === 'rocketV') {
        for (const dir of [-1, 1]) {
          dummy.position.set(x + (vt.special === 'rocketH' ? dir * 0.5 : 0), y + (vt.special === 'rocketV' ? dir * 0.5 : 0), 0.35); dummy.rotation.set(0, 0, vt.special === 'rocketH' ? -dir * Math.PI / 2 : dir > 0 ? 0 : Math.PI); dummy.scale.set(0.16 * sc, 0.28 * sc, 0.16 * sc); dummy.updateMatrix(); arrowM.current.setMatrixAt(nArrow, dummy.matrix); nArrow += 1
        }
      } else if (vt.special === 'bomb') {
        dummy.position.set(x, y, 0.25); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.3 * sc * (1 + Math.sin(t * 8) * 0.06)); dummy.updateMatrix(); bombM.current.setMatrixAt(nBomb, dummy.matrix); nBomb += 1
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.6 * sc); dummy.updateMatrix(); ringM.current.setMatrixAt(nRing, dummy.matrix); tmp.set('#ff8a3d'); ringM.current.setColorAt(nRing, tmp); nRing += 1
      }
      if (vt.special) { dummy.position.set(x, y, -0.2); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1.6 * sc); dummy.updateMatrix(); glowM.current.setMatrixAt(nGlow, dummy.matrix); tmp.set(GEM_COLORS[gi]); glowM.current.setColorAt(nGlow, tmp); nGlow += 1 }
    }
    const done = (m, n) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true }
    gemRefs.current.forEach((m, i) => done(m, counts[i]))
    done(arrowM.current, nArrow); done(bombM.current, nBomb); done(ringM.current, nRing); done(rainbowM.current, nRain); done(chestM.current, nChest); done(lidM.current, nChest); done(rockM.current, nRock); done(glowM.current, nGlow)

    // ice under the tiles
    let ni = 0
    for (let r = 0; r < 8; r += 1) for (let col = 0; col < 8; col += 1) {
      const layers = c.ice[r]?.[col] || 0
      if (!layers) continue
      dummy.position.set(wx(col), wy(r), -0.28); dummy.rotation.set(0, 0, 0); dummy.scale.set(0.96, 0.96, 0.16 + layers * 0.1); dummy.updateMatrix(); iceM.current.setMatrixAt(ni, dummy.matrix)
      tmp.set(layers >= 2 ? '#5aa9ff' : '#bfe6ff'); iceM.current.setColorAt(ni, tmp); ni += 1
    }
    done(iceM.current, ni)

    // selection and hint rings
    const ring = (mesh, cell, pulse) => { if (!cell) { mesh.visible = false; return } mesh.visible = true; mesh.position.set(wx(cell[1]), wy(cell[0]), 0.45); const s = 0.55 + Math.sin(t * 7) * pulse; mesh.scale.set(s, s, s) }
    ring(selM.current, c.phase === 'playing' ? c.selected : null, 0.03)
    ring(curM.current, c.cursorOn && c.phase === 'playing' ? c.cursor : null, 0.02)
    ring(hintA.current, c.hint ? c.hint.a : null, 0.06); ring(hintB.current, c.hint ? c.hint.b : null, 0.06)

    // beams and rings
    let bi = 0; let ri = 0
    active.current = active.current.filter((e) => { e.life += dt; return e.life < e.max })
    for (const e of active.current) {
      const p = e.life / e.max
      if (e.kind === 'beam' && bi < beams.current.length) {
        const m = beams.current[bi]; bi += 1; m.visible = true
        const thick = (e.wide ? 3 : 1) * (1 - p) * 0.9
        if (e.vertical) { m.position.set(wx(e.c), 0, 0.5); m.scale.set(thick, 8.4, 1) } else { m.position.set(0, wy(e.r), 0.5); m.scale.set(8.4, thick, 1) }
        m.material.opacity = 0.85 * (1 - p)
      } else if (e.kind === 'ring' && ri < rings.current.length) {
        const m = rings.current[ri]; ri += 1; m.visible = true
        m.position.set(wx(e.c), wy(e.r), 0.5); const s = (0.4 + p * (e.radius + 1.2)) ; m.scale.set(s, s, s); m.material.opacity = 0.9 * (1 - p)
        m.material.color.set(e.rainbow ? tmp.setHSL((t * 2) % 1, 1, 0.7) : '#ffd9a0')
      }
    }
    for (let i = bi; i < beams.current.length; i += 1) beams.current[i].visible = false
    for (let i = ri; i < rings.current.length; i += 1) rings.current[i].visible = false

    // particles
    let pn = 0
    for (const q of parts.current) {
      if (!q.on) continue
      q.life += dt; if (q.life >= q.max) { q.on = false; continue }
      q.vy -= 8 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt
      const k = 1 - q.life / q.max
      dummy.position.set(q.x, q.y, q.z); dummy.rotation.set(q.life * 6, q.life * 8, 0); dummy.scale.setScalar(q.size * k); dummy.updateMatrix()
      bitM.current.setMatrixAt(pn, dummy.matrix); bitM.current.setColorAt(pn, q.color); pn += 1
    }
    done(bitM.current, pn)

    // ambient particles (bubbles rise, snow falls, stars twinkle, motes float)
    const pos = ambientGeo.attributes.position
    bubbles.forEach((b, i) => {
      const dir = th.ambient === 'snow' ? -1 : th.ambient === 'stars' ? 0 : 1
      b.y += dir * b.v * dt * (reduce ? 0.3 : 1)
      if (b.y > 11) b.y = -11; if (b.y < -11) b.y = 11
      pos.setXYZ(i, b.x + (th.ambient === 'bubbles' || th.ambient === 'snow' ? Math.sin(t * 0.7 + i) * 0.4 : 0), b.y, b.z)
    })
    pos.needsUpdate = true

    // camera: framed for the screen, with a small shake on big effects
    const { dist = 16 } = camera.userData
    const sh = c.shake > 0 && !reduce ? (Math.random() - 0.5) * c.shake * 0.25 : 0
    camera.position.set(sh, 2.6 + sh, dist)
    camera.lookAt(0, 2.6, 0)
  })

  const lowQ = quality === 'low'
  return (
    <>
      <hemisphereLight args={[th.sky[2], th.sky[0], 0.9]} />
      <directionalLight position={[4, 8, 10]} intensity={2.2} color="#fff4e0" />
      <pointLight position={[-6, 4, 6]} intensity={30} color={th.accent} distance={30} />
      <pointLight position={[6, -3, 6]} intensity={18} color={th.glow} distance={30} />

      <points ref={ambient} geometry={ambientGeo} frustumCulled={false}><pointsMaterial color={th.glow} size={th.ambient === 'stars' ? 0.18 : 0.28} sizeAttenuation transparent opacity={0.8} depthWrite={false} /></points>

      {/* the glass tray and its 64 cells */}
      <mesh position={[0, 0, -0.62]} material={a.mat.tray}><boxGeometry args={[9, 9, 0.5]} /></mesh>
      <instancedMesh ref={(m) => { cellM.current = m; if (m && !m.userData.set) { m.userData.set = true; for (let i = 0; i < 64; i += 1) { const r = Math.floor(i / 8); const col = i % 8; dummy.position.set(wx(col), wy(r), -0.34); dummy.rotation.set(0, 0, 0); dummy.scale.set(0.97, 0.97, 0.05); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tmp.set((r + col) % 2 ? th.cellA : th.cellB)) } m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true } }} args={[a.geo.box, a.mat.cell, 64]} frustumCulled={false} />

      <instancedMesh ref={iceM} args={[a.geo.box, a.mat.ice, 64]} frustumCulled={false} />
      {a.geo.gems.map((g, i) => <instancedMesh key={i} ref={(m) => { gemRefs.current[i] = m }} args={[g, a.mat.gem, 96]} frustumCulled={false} />)}
      <instancedMesh ref={arrowM} args={[a.geo.cone, a.mat.arrow, 40]} frustumCulled={false} />
      <instancedMesh ref={bombM} args={[a.geo.sphere, a.mat.bomb, 24]} frustumCulled={false} />
      <instancedMesh ref={ringM} args={[a.geo.torus, a.mat.ring, 48]} frustumCulled={false} />
      <instancedMesh ref={rainbowM} args={[a.geo.gems[0], a.mat.rainbow, 16]} frustumCulled={false} />
      <instancedMesh ref={chestM} args={[a.geo.box, a.mat.chest, 12]} frustumCulled={false} />
      <instancedMesh ref={lidM} args={[a.geo.lid, a.mat.gold, 12]} frustumCulled={false} />
      <instancedMesh ref={rockM} args={[a.geo.rock, a.mat.rock, 40]} frustumCulled={false} />
      <instancedMesh ref={glowM} args={[a.geo.plane, a.mat.glow, 96]} frustumCulled={false} />
      <instancedMesh ref={bitM} args={[a.geo.bit, a.mat.bit, 160]} frustumCulled={false} />

      <mesh ref={selM} material={a.mat.sel} visible={false}><torusGeometry args={[1, 0.07, 10, 40]} /></mesh>
      <mesh ref={curM} material={a.mat.sel} visible={false}><torusGeometry args={[1, 0.04, 10, 40]} /></mesh>
      <mesh ref={hintA} material={a.mat.sel} visible={false}><torusGeometry args={[1, 0.07, 10, 40]} /></mesh>
      <mesh ref={hintB} material={a.mat.sel} visible={false}><torusGeometry args={[1, 0.07, 10, 40]} /></mesh>
      {[0, 1, 2, 3].map((i) => <mesh key={`b${i}`} ref={(m) => { beams.current[i] = m }} visible={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#fff7c2" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>)}
      {[0, 1, 2].map((i) => <mesh key={`r${i}`} ref={(m) => { rings.current[i] = m }} visible={false}><torusGeometry args={[1, 0.08, 10, 48]} /><meshBasicMaterial color="#ffd9a0" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>)}

      {/* LAXBOT sits on the corner of the tray, above the top-left of the board */}
      <Mascot controller={controller} position={[-3.1, 4.75, 0.2]} scale={lowQ ? 0.95 : 1} />
    </>
  )
}
