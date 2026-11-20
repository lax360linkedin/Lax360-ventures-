import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { groundBelow } from './logic.js'
import { shadowTexture } from '../catchTheStars/LaxBot3D.jsx'

/**
 * LAXBOT for the platform game, built from primitive shapes in code. IMPORTANT: this is a PROCEDURAL PLACEHOLDER, not a production character model. It has the LAXBOT look (glossy white shell,
 * dark visor with glowing eyes, violet headphones and boots, heart antenna) and nine animation states driven by the physics: idle, walk, run, jump, double jump (a flip), fall, landing (squash),
 * damage and victory dance. To replace it with the approved glTF character see PLAYZONE_ASSETS.md; keep reading the same fields of `controller.state.sim`.
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerpAngle = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k }

export default function JumpBot({ controller }) {
  const root = useRef(); const tilt = useRef(); const armL = useRef(); const armR = useRef(); const legL = useRef(); const legR = useRef(); const head = useRef()
  const eyeL = useRef(); const eyeR = useRef(); const shell = useRef(); const shadow = useRef(); const heartLight = useRef(); const happyL = useRef(); const happyR = useRef()
  const run = useRef(0); const yaw = useRef(Math.PI)
  const shadowTex = useMemo(() => shadowTexture(), [])
  useEffect(() => () => shadowTex.dispose(), [shadowTex])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state; const g = c.sim; const p = g.p
    const t = state.clock.elapsedTime
    const reduce = c.reduceMotion
    const playing = c.phase === 'playing'
    const speed = g.speed
    const falling = !g.grounded && p.vy < -0.5
    const rising = !g.grounded && p.vy >= -0.5
    const won = g.done
    const hurt = g.hurtT > 0
    const dead = g.respawnT > 0 && p.y < g.level.killY + 2

    root.current.visible = !dead && !(g.invuln > 0 && playing && Math.sin(t * 40) > 0.4 && !reduce)
    root.current.position.set(p.x, p.y, p.z)
    yaw.current = lerpAngle(yaw.current, won ? yaw.current + dt * 5 : g.facing, clamp(dt * 14, 0, 1))
    root.current.rotation.y = yaw.current

    run.current += dt * (6 + speed * 1.7)
    const rp = run.current
    const moving = g.grounded && speed > 0.6
    const swing = moving ? clamp(speed / 7, 0.3, 1) : 0
    const lean = moving ? clamp(speed / 7, 0, 1) * 0.28 : 0

    // squash and stretch: landing squashes, rising stretches
    let sy = 1; let sxz = 1
    if (g.landT > 0) { const k = g.landT / 0.22; sy = 1 - 0.22 * k; sxz = 1 + 0.12 * k } else if (rising && !reduce) { sy = 1.08; sxz = 0.95 }
    root.current.scale.set(sxz, sy, sxz)

    // body tilt: leaning into the run, the double-jump flip, the dance
    let tx = lean; let ty = 0; let tz = 0
    if (g.djT > 0 && !reduce) tx = -(1 - g.djT / 0.45) * Math.PI * 2
    if (won) { ty = 0; tz = Math.sin(t * 9) * 0.18 }
    if (hurt) tz = Math.sin(t * 60) * 0.16 * (g.hurtT / 0.9)
    tilt.current.rotation.set(tx, ty, tz)
    tilt.current.position.y = 0.78 + (won && !reduce ? Math.abs(Math.sin(t * 6)) * 0.55 : moving ? Math.abs(Math.sin(rp)) * 0.08 : Math.sin(t * 2.4) * 0.025)

    // arms and legs
    const k = clamp(dt * 16, 0, 1)
    let aLx = Math.sin(rp) * 0.95 * swing; let aRx = -Math.sin(rp) * 0.95 * swing; let aLz = 0.14; let aRz = -0.14
    let lLx = -Math.sin(rp) * 0.9 * swing; let lRx = Math.sin(rp) * 0.9 * swing
    if (rising) { aLx = aRx = -0.5; aLz = 1.1; aRz = -1.1; lLx = -0.6; lRx = 0.2 }
    if (falling) { aLx = aRx = 0; aLz = 1.5; aRz = -1.5; lLx = 0.25; lRx = -0.25 }
    if (g.djT > 0) { aLz = 2.2; aRz = -2.2; lLx = lRx = -0.9 }
    if (won) { aLz = 2.7 + Math.sin(t * 12) * 0.3; aRz = -2.7 - Math.sin(t * 12 + 1) * 0.3; aLx = aRx = 0; lLx = Math.sin(t * 9) * 0.7; lRx = -Math.sin(t * 9) * 0.7 }
    if (hurt) { aLz = 1.8; aRz = -1.8; aLx = aRx = 0 }
    armL.current.rotation.x += (aLx - armL.current.rotation.x) * k; armR.current.rotation.x += (aRx - armR.current.rotation.x) * k
    armL.current.rotation.z += (aLz - armL.current.rotation.z) * k; armR.current.rotation.z += (aRz - armR.current.rotation.z) * k
    legL.current.rotation.x += (lLx - legL.current.rotation.x) * k; legR.current.rotation.x += (lRx - legR.current.rotation.x) * k

    // face
    const happy = won
    const blink = t % 3.4 < 0.12 ? 0.1 : 1
    eyeL.current.visible = eyeR.current.visible = !happy
    happyL.current.visible = happyR.current.visible = happy
    eyeL.current.scale.y = eyeR.current.scale.y = 1.3 * blink
    const eyeColor = hurt ? '#ff5a5a' : '#4da3ff'
    for (const e of [eyeL.current, eyeR.current]) { e.material.color.set(eyeColor); e.material.emissive.set(eyeColor) }
    shell.current.emissive.setRGB(hurt ? 0.9 * (g.hurtT / 0.9) : 0, 0, 0)
    head.current.rotation.x = falling ? -0.15 : moving ? 0.05 : 0
    heartLight.current.intensity = 1.1 + Math.sin(t * 4) * 0.4

    // contact shadow on the surface below (also the only shadow on the lowest quality)
    const below = groundBelow(g, p.x, p.z, p.y + 0.4)
    const gy = below ? below.cy : null
    shadow.current.visible = gy !== null && !dead
    if (gy !== null) { const h = Math.max(0, p.y - gy); shadow.current.position.set(p.x, gy + 0.03, p.z); shadow.current.scale.setScalar(Math.max(0.5, 1.9 - h * 0.22)); shadow.current.material.opacity = clamp(1 - h * 0.09, 0.25, 1) }
  })

  const white = { color: '#ffffff', roughness: 0.22, metalness: 0.05 }
  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={shadowTex} transparent depthWrite={false} /></mesh>
      <group ref={root}>
        <group ref={tilt} position={[0, 0.78, 0]}>
          {/* everything hangs from the body centre so a flip rotates about the middle of LAXBOT */}
            <group position={[0, -0.78, 0]}>
              <mesh position={[0, 0.66, 0]} castShadow><capsuleGeometry args={[0.36, 0.3, 8, 18]} /><meshStandardMaterial ref={shell} {...white} /></mesh>
              <mesh position={[0, 0.5, 0.33]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.2} /></mesh>
              <group ref={armL} position={[-0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]} castShadow><capsuleGeometry args={[0.085, 0.3, 5, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial {...white} /></mesh></group>
              <group ref={armR} position={[0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]} castShadow><capsuleGeometry args={[0.085, 0.3, 5, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial {...white} /></mesh></group>
              <group ref={legL} position={[-0.17, 0.36, 0]}><mesh position={[0, -0.22, 0.05]} scale={[1, 0.7, 1.35]} castShadow><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh></group>
              <group ref={legR} position={[0.17, 0.36, 0]}><mesh position={[0, -0.22, 0.05]} scale={[1, 0.7, 1.35]} castShadow><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh></group>
              <group ref={head} position={[0, 1.34, 0]}>
                <mesh scale={[1.06, 0.92, 0.98]} castShadow><sphereGeometry args={[0.62, 24, 18]} /><meshStandardMaterial {...white} roughness={0.2} /></mesh>
                <mesh position={[0, 0, 0.34]} scale={[1, 0.72, 0.56]}><sphereGeometry args={[0.5, 20, 14]} /><meshStandardMaterial color="#150f26" roughness={0.12} metalness={0.4} /></mesh>
                <mesh ref={eyeL} position={[-0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.6} /></mesh>
                <mesh ref={eyeR} position={[0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.6} /></mesh>
                <mesh ref={happyL} position={[-0.2, 0, 0.62]} visible={false}><torusGeometry args={[0.1, 0.03, 8, 14, Math.PI]} /><meshStandardMaterial color="#7dd3fc" emissive="#4da3ff" emissiveIntensity={1.8} /></mesh>
                <mesh ref={happyR} position={[0.2, 0, 0.62]} visible={false}><torusGeometry args={[0.1, 0.03, 8, 14, Math.PI]} /><meshStandardMaterial color="#7dd3fc" emissive="#4da3ff" emissiveIntensity={1.8} /></mesh>
                <mesh position={[0, -0.2, 0.62]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.085, 0.022, 8, 12, Math.PI]} /><meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.6} /></mesh>
                <mesh scale={[1, 1, 0.45]}><torusGeometry args={[0.66, 0.045, 8, 30, Math.PI]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} emissive="#5b21b6" emissiveIntensity={0.3} /></mesh>
                <mesh position={[-0.66, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.14, 16]} /><meshStandardMaterial color="#7c3aed" roughness={0.3} emissive="#6d28d9" emissiveIntensity={0.5} /></mesh>
                <mesh position={[0.66, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.14, 16]} /><meshStandardMaterial color="#7c3aed" roughness={0.3} emissive="#6d28d9" emissiveIntensity={0.5} /></mesh>
                <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.025, 0.025, 0.3, 6]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                <mesh position={[0, 0.9, 0]}><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color="#f9a8d4" emissive="#f472b6" emissiveIntensity={1.6} /></mesh>
                <pointLight ref={heartLight} position={[0, 0.9, 0.2]} color="#f9a8d4" intensity={1.1} distance={3.2} />
              </group>
            </group>
        </group>
      </group>
    </>
  )
}
