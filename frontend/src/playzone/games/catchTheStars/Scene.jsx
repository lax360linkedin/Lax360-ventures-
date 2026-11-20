import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import LaxBot3D from './LaxBot3D.jsx'
import { FIELD_HALF, ITEMS } from './config.js'

// The 3D scene of Catch the Stars. It only DRAWS: the rules (logic.js) decide where everything is. Items live in InstancedMeshes (one draw call per kind, no objects created while playing),
// particles come from a fixed pool, and every geometry, material and texture made here is disposed when the scene is removed. The camera follows the bot a little and keeps the whole field
// in view on any screen shape.

const KINDS = ['star', 'golden', 'diamond', 'heart', 'bomb', 'rainbow']
const PER_KIND = 24
const GLOW = { star: '#ffe066', golden: '#ffd24d', diamond: '#7dd3fc', heart: '#fb7185', bomb: '#fb923c', rainbow: '#ffffff' }
const POP = { star: '#fde68a', golden: '#fbbf24', diamond: '#7dd3fc', heart: '#fb7185', bomb: '#f97316', rainbow: '#f0abfc' }
const dummy = new THREE.Object3D()
const tmpColor = new THREE.Color()
const v3 = new THREE.Vector3()

function starShape(outer, inner) {
  const s = new THREE.Shape()
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? inner : outer
    const a = Math.PI / 2 + (i * Math.PI) / 5
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  s.closePath()
  return s
}
function heartShape() {
  const s = new THREE.Shape()
  s.moveTo(0, -0.5); s.bezierCurveTo(-0.9, 0.05, -0.55, 0.75, 0, 0.35); s.bezierCurveTo(0.55, 0.75, 0.9, 0.05, 0, -0.5)
  return s
}
const extrude = (shape, depth, bevel = 0.03) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 }); g.center(); return g }

const radialTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}
const trailTexture = () => {
  const c = document.createElement('canvas'); c.width = 16; c.height = 64
  const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 64)
  grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 16, 64)
  return new THREE.CanvasTexture(c)
}
const skyTexture = () => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256
  const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0, '#2b1b6b'); grd.addColorStop(0.45, '#6d4bd1'); grd.addColorStop(0.8, '#e9a8e0'); grd.addColorStop(1, '#fde2e4')
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Per-kind geometry and material (created once, disposed on unmount). */
function useItemAssets() {
  return useMemo(() => {
    const geo = {
      star: extrude(starShape(0.5, 0.22), 0.22), golden: extrude(starShape(0.56, 0.25), 0.26),
      diamond: new THREE.OctahedronGeometry(0.42, 0).scale(1, 1.35, 1), heart: extrude(heartShape(), 0.22, 0.04),
      bomb: new THREE.SphereGeometry(0.4, 18, 14), rainbow: extrude(starShape(0.6, 0.27), 0.26),
    }
    const mat = {
      star: new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffb300', emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.2 }),
      golden: new THREE.MeshStandardMaterial({ color: '#ffd24d', emissive: '#ff9f1c', emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.5 }),
      diamond: new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#38bdf8', emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.3, flatShading: true }),
      heart: new THREE.MeshStandardMaterial({ color: '#fb7185', emissive: '#e11d48', emissiveIntensity: 0.5, roughness: 0.3 }),
      bomb: new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.35, metalness: 0.4 }),
      rainbow: new THREE.MeshStandardMaterial({ color: '#ff77cc', emissive: '#ff77cc', emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.2 }),
    }
    const fuse = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6)
    const fuseMat = new THREE.MeshStandardMaterial({ color: '#d6d3d1' })
    const spark = new THREE.SphereGeometry(0.09, 8, 6)
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#fb923c' })
    const glowTex = radialTexture(); const trailTex = trailTexture()
    const plane = new THREE.PlaneGeometry(1, 1)
    const trailGeo = new THREE.PlaneGeometry(0.2, 1).translate(0, 0.5, 0)
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const trailMat = new THREE.MeshBasicMaterial({ map: trailTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const bit = new THREE.OctahedronGeometry(0.1, 0)
    const bitMat = new THREE.MeshBasicMaterial({ vertexColors: false })
    return { geo, mat, fuse, fuseMat, spark, sparkMat, glowTex, trailTex, plane, trailGeo, glowMat, trailMat, bit, bitMat }
  }, [])
}

export default function Scene({ controller, quality, shadows }) {
  const { scene, camera, size } = useThree()
  const a = useItemAssets()
  const meshes = useRef({}); const fuseMesh = useRef(); const sparkMesh = useRef(); const glowMesh = useRef(); const trailMesh = useRef(); const bitMesh = useRef()
  const cloudMesh = useRef(); const islands = useRef([]); const platform = useRef()
  const parts = useRef(Array.from({ length: 140 }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, color: new THREE.Color() })))
  const fps = useRef({ n: 0, sum: 0, low: 0 })
  const sky = useMemo(() => skyTexture(), [])
  const cloudCount = quality === 'high' ? 40 : quality === 'medium' ? 26 : 14
  const clouds = useMemo(() => Array.from({ length: cloudCount }, (_, i) => ({ x: ((i * 7.31) % 36) - 18, y: 2 + ((i * 3.17) % 11), z: -8 - ((i * 5.13) % 16), s: 0.45 + ((i * 1.7) % 0.8), v: 0.12 + ((i * 0.37) % 0.25) })), [cloudCount])

  useEffect(() => {
    scene.background = sky
    scene.fog = new THREE.Fog('#c9b8ff', 26, 70)
    return () => { scene.background = null; scene.fog = null; sky.dispose() }
  }, [scene, sky])
  useEffect(() => () => {
    Object.values(a.geo).forEach((g) => g.dispose()); Object.values(a.mat).forEach((m) => m.dispose())
    ;[a.fuse, a.spark, a.plane, a.trailGeo, a.bit].forEach((g) => g.dispose()); ;[a.fuseMat, a.sparkMat, a.glowMat, a.trailMat, a.bitMat].forEach((m) => m.dispose()); a.glowTex.dispose(); a.trailTex.dispose()
  }, [a])

  // keep the whole field in view: place the camera far enough for the aspect ratio of the screen
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const half = FIELD_HALF + 1.4
    const dist = THREE.MathUtils.clamp(half / (Math.tan(vfov / 2) * aspect), 11, 30)
    camera.userData.dist = dist
    controller.state.view.halfWidth = Math.tan(vfov / 2) * aspect * dist
  }, [camera, size.width, size.height, controller])

  const burst = (kind, x, y, count, speed = 4) => {
    const pool = parts.current; let n = 0
    for (const p of pool) {
      if (p.on) continue
      const ang = Math.random() * Math.PI * 2; const sp = speed * (0.4 + Math.random() * 0.8)
      p.on = true; p.x = x; p.y = y; p.z = 0.2; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp + 1.5; p.vz = (Math.random() - 0.5) * 2; p.life = 0; p.max = 0.5 + Math.random() * 0.5; p.size = 0.6 + Math.random() * 0.9
      if (kind === 'rainbow') p.color.setHSL(Math.random(), 1, 0.65); else p.color.set(POP[kind])
      if (++n >= count) break
    }
  }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state
    const t = state.clock.elapsedTime
    controller.tick(dt)

    // frame-rate sampling: if the device cannot keep up for a couple of seconds, lower the quality once
    const f = fps.current; f.n += 1; f.sum += dtRaw
    if (f.n >= 90) { const avg = f.sum / f.n; f.low = avg > 1 / 38 ? f.low + 1 : 0; state.gl.domElement.dataset.fps = String(Math.round(1 / avg)); state.gl.domElement.dataset.quality = quality; f.n = 0; f.sum = 0; if (f.low >= 2) { f.low = 0; controller.onSlow?.() } }

    // fx from the rules: bursts, score pop-ups
    for (const e of controller.drainFx()) {
      const n = c.reduceMotion ? 0.4 : quality === 'low' ? 0.6 : 1
      if (e.type === 'collect') { burst(e.kind, e.x, e.y, Math.round((e.kind === 'diamond' ? 16 : e.kind === 'golden' ? 12 : 8) * n), 4); controller.popup?.(project(e.x, e.y + 0.6, camera, size), `+${e.points}`, POP[e.kind], e.doubled) }
      else if (e.type === 'heart') { burst('heart', e.x, e.y, Math.round(10 * n), 3); controller.popup?.(project(e.x, e.y + 0.6, camera, size), e.gained ? '+1 ♥' : 'Full!', POP.heart) }
      else if (e.type === 'damage') { burst('bomb', e.x, e.y, Math.round(18 * n), 6); controller.popup?.(project(e.x, e.y + 0.6, camera, size), '−1 ♥', '#fb7185') }
      else if (e.type === 'bombPass') burst('bomb', e.x, e.y, Math.round(6 * n), 3)
      else if (e.type === 'powerup') { burst('rainbow', e.x, e.y, Math.round(24 * n), 5); controller.popup?.(project(e.x, e.y + 0.6, camera, size), 'x2!', '#f0abfc') }
    }

    // items → instanced meshes
    const counts = { star: 0, golden: 0, diamond: 0, heart: 0, bomb: 0, rainbow: 0 }
    let glowN = 0; let trailN = 0; let fuseN = 0
    for (const it of c.sim.items) {
      if (!it.alive) continue
      const k = it.kind
      const idx = counts[k]; if (idx >= PER_KIND) continue
      counts[k] += 1
      const pulse = k === 'golden' || k === 'rainbow' ? 1 + Math.sin(t * 6 + it.seed) * 0.06 : 1
      dummy.position.set(it.x, it.y, 0); dummy.rotation.set(k === 'bomb' ? 0 : Math.sin(t * 2 + it.seed) * 0.25, t * (1.2 + it.spin) + it.seed, k === 'diamond' ? 0 : it.spin * 0.15); dummy.scale.setScalar(pulse)
      dummy.updateMatrix(); meshes.current[k].setMatrixAt(idx, dummy.matrix)
      if (k === 'bomb') {
        dummy.rotation.set(0, 0, 0.3); dummy.position.set(it.x + 0.1, it.y + 0.45, 0); dummy.updateMatrix(); fuseMesh.current.setMatrixAt(fuseN, dummy.matrix)
        dummy.position.set(it.x + 0.2, it.y + 0.58, 0); dummy.scale.setScalar(0.8 + Math.sin(t * 25 + it.seed) * 0.3); dummy.updateMatrix(); sparkMesh.current.setMatrixAt(fuseN, dummy.matrix); fuseN += 1
      }
      // soft glow behind the item and a light trail above it
      const r = ITEMS[k].radius
      dummy.rotation.set(0, 0, 0); dummy.position.set(it.x, it.y, -0.2); dummy.scale.setScalar(r * (k === 'bomb' ? 3 : 4.2)); dummy.updateMatrix()
      glowMesh.current.setMatrixAt(glowN, dummy.matrix); tmpColor.set(GLOW[k]); if (k === 'rainbow') tmpColor.setHSL((t * 0.8) % 1, 1, 0.65); glowMesh.current.setColorAt(glowN, tmpColor); glowN += 1
      if (k !== 'bomb' && quality !== 'low') { dummy.position.set(it.x, it.y + 0.1, -0.25); dummy.scale.set(1, Math.min(2.6, it.vy * 0.32), 1); dummy.updateMatrix(); trailMesh.current.setMatrixAt(trailN, dummy.matrix); tmpColor.set(GLOW[k]); if (k === 'rainbow') tmpColor.setHSL((t * 0.8 + 0.3) % 1, 1, 0.65); trailMesh.current.setColorAt(trailN, tmpColor); trailN += 1 }
    }
    for (const k of KINDS) { const m = meshes.current[k]; m.count = counts[k]; m.instanceMatrix.needsUpdate = true }
    a.mat.rainbow.color.setHSL((t * 0.8) % 1, 0.9, 0.62); a.mat.rainbow.emissive.setHSL((t * 0.8) % 1, 1, 0.5)
    fuseMesh.current.count = fuseN; sparkMesh.current.count = fuseN; fuseMesh.current.instanceMatrix.needsUpdate = true; sparkMesh.current.instanceMatrix.needsUpdate = true
    glowMesh.current.count = glowN; glowMesh.current.instanceMatrix.needsUpdate = true; if (glowMesh.current.instanceColor) glowMesh.current.instanceColor.needsUpdate = true
    trailMesh.current.count = trailN; trailMesh.current.instanceMatrix.needsUpdate = true; if (trailMesh.current.instanceColor) trailMesh.current.instanceColor.needsUpdate = true

    // particles
    let pn = 0
    for (const p of parts.current) {
      if (!p.on) continue
      p.life += dt; if (p.life >= p.max) { p.on = false; continue }
      p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
      const k = 1 - p.life / p.max
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.life * 5, p.life * 7, 0); dummy.scale.setScalar(p.size * k); dummy.updateMatrix()
      bitMesh.current.setMatrixAt(pn, dummy.matrix); bitMesh.current.setColorAt(pn, p.color); pn += 1
    }
    bitMesh.current.count = pn; bitMesh.current.instanceMatrix.needsUpdate = true; if (bitMesh.current.instanceColor) bitMesh.current.instanceColor.needsUpdate = true

    // clouds drift, islands bob
    const cm = cloudMesh.current
    if (cm) {
      let i = 0
      for (const cl of clouds) {
        const x = ((cl.x + t * cl.v + 20) % 40) - 20
        for (let j = 0; j < 3; j += 1) { dummy.position.set(x + (j - 1) * cl.s * 0.8, cl.y + (j === 1 ? 0.35 * cl.s : 0), cl.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(cl.s * (j === 1 ? 1.2 : 0.9), cl.s * 0.7, cl.s * 0.8); dummy.updateMatrix(); cm.setMatrixAt(i++, dummy.matrix) }
      }
      cm.instanceMatrix.needsUpdate = true
    }
    islands.current.forEach((g, i) => { if (g) { g.position.y = g.userData.y + Math.sin(t * 0.6 + i * 2) * 0.35 * (c.reduceMotion ? 0 : 1); g.rotation.y = Math.sin(t * 0.2 + i) * 0.15 } })

    // camera: a gentle follow of the bot (off for reduced motion), a short shake when hurt
    const dist = camera.userData.dist || 14
    const follow = c.reduceMotion ? 0 : 0.2
    const shake = c.bot.hurtT > 0 && !c.reduceMotion ? Math.sin(t * 80) * 0.07 * (c.bot.hurtT / 0.7) : 0
    const tx = c.sim.botX * follow
    camera.position.x += (tx - camera.position.x) * (1 - Math.exp(-4 * dt))
    camera.position.set(camera.position.x + shake, 3.6 + dist * 0.06, dist)
    camera.lookAt(camera.position.x * 0.5, 3.9, 0)
  })

  const hi = quality === 'high'
  const seg = hi ? 40 : 20
  return (
    <>
      <hemisphereLight args={['#fff4e5', '#9b87f5', 1.05]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 10, 8]} intensity={2.1} color="#fff1d6" castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={9} shadow-camera-bottom={-3} shadow-bias={-0.0006} />
      <pointLight position={[-6, 6, 4]} intensity={20} color="#c4b5fd" distance={26} />

      {/* the platform LAXBOT runs on: a floating disc with a gold rim and a glossy top that catches the light */}
      <group ref={platform} position={[0, -0.45, 0]}>
        <mesh receiveShadow><cylinderGeometry args={[6.6, 6.3, 0.5, seg]} /><meshStandardMaterial color="#e9d5ff" roughness={0.18} metalness={0.25} /></mesh>
        <mesh position={[0, 0.0, 0]}><torusGeometry args={[6.45, 0.07, 8, seg * 2]} /><meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={0.6} roughness={0.3} metalness={0.5} /></mesh>
        <mesh position={[0, -1.3, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[6.2, 2.4, seg]} /><meshStandardMaterial color="#8b5cf6" roughness={0.6} /></mesh>
      </group>

      {/* floating islands in the background */}
      {[[-11, 5.5, -14, 2.2], [12, 8.5, -18, 2.8], [-3, 12, -26, 3.2]].map(([x, y, z, s], i) => (
        <group key={i} ref={(g) => { islands.current[i] = g; if (g) g.userData.y = y }} position={[x, y, z]} scale={s}>
          <mesh><cylinderGeometry args={[1.5, 1.2, 0.35, 16]} /><meshStandardMaterial color="#86efac" roughness={0.7} /></mesh>
          <mesh position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[1.2, 1.6, 12]} /><meshStandardMaterial color="#a78bfa" roughness={0.8} /></mesh>
          <mesh position={[0.4, 0.55, 0]}><sphereGeometry args={[0.4, 10, 8]} /><meshStandardMaterial color="#34d399" roughness={0.7} /></mesh>
          <mesh position={[-0.5, 0.35, 0.2]}><sphereGeometry args={[0.25, 10, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.4} /></mesh>
        </group>
      ))}

      <instancedMesh ref={cloudMesh} args={[null, null, cloudCount * 3]} frustumCulled={false}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} /></instancedMesh>

      <LaxBot3D controller={controller} />

      {/* collectibles: one instanced mesh per kind */}
      {KINDS.map((k) => <instancedMesh key={k} ref={(m) => { meshes.current[k] = m }} args={[a.geo[k], a.mat[k], PER_KIND]} frustumCulled={false} castShadow={shadows && k !== 'diamond'} />)}
      <instancedMesh ref={fuseMesh} args={[a.fuse, a.fuseMat, PER_KIND]} frustumCulled={false} />
      <instancedMesh ref={sparkMesh} args={[a.spark, a.sparkMat, PER_KIND]} frustumCulled={false} />
      <instancedMesh ref={glowMesh} args={[a.plane, a.glowMat, PER_KIND * 3]} frustumCulled={false} />
      <instancedMesh ref={trailMesh} args={[a.trailGeo, a.trailMat, PER_KIND * 3]} frustumCulled={false} />
      <instancedMesh ref={bitMesh} args={[a.bit, a.bitMat, 140]} frustumCulled={false} />
    </>
  )
}

function project(x, y, camera, size) {
  v3.set(x, y, 0).project(camera)
  return [(v3.x * 0.5 + 0.5) * size.width, (-v3.y * 0.5 + 0.5) * size.height]
}
