import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { shadowTexture } from '../catchTheStars/LaxBot3D.jsx'

/**
 * LAXBOT in Cyber Defender mode, built from primitive shapes in code. IMPORTANT: this is a PROCEDURAL PLACEHOLDER (the same glossy character as the other games, plus a cyan visor trim,
 * a net-launcher backpack and a holo bracer), not a production model. Nine animation states from the simulation: idle, walk, run, jump, capture (the net throw), repair (typing at the
 * console), damage, victory dance and defeat. To replace it with an approved glTF model see PLAYZONE_ASSETS.md and keep reading the same fields of `controller.state.game`.
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerpAngle = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k }

export default function HunterBot({ controller }) {
  const root = useRef(); const tilt = useRef(); const armL = useRef(); const armR = useRef(); const legL = useRef(); const legR = useRef(); const head = useRef()
  const eyeL = useRef(); const eyeR = useRef(); const shell = useRef(); const shadow = useRef(); const aura = useRef(); const pack = useRef(); const shieldM = useRef()
  const run = useRef(0); const yaw = useRef(0)
  const tex = useMemo(() => shadowTexture(), [])
  useEffect(() => () => tex.dispose(), [tex])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state; const g = c.game; const p = g.p
    const t = state.clock.elapsedTime
    const reduce = c.reduceMotion
    const dead = g.respawnT > 0 || g.over
    const won = g.done
    const hurt = g.hurtT > 0
    const speed = g.speed || 0
    const moving = g.grounded && speed > 0.6 && !dead
    const air = !g.grounded && !dead
    const netting = g.captureT > 0
    const repairing = c.phase === 'repair' || g.repairT > 0

    root.current.visible = !(g.invuln > 0 && !hurt && !reduce && Math.sin(t * 40) > 0.5 && !dead && c.phase === 'playing' && g.invuln < 2)
    root.current.position.set(p.x, p.y, p.z)
    yaw.current = lerpAngle(yaw.current, won ? yaw.current + dt * 5 : g.yaw + Math.PI, clamp(dt * 14, 0, 1)) // the model faces +z at rotation 0
    root.current.rotation.y = yaw.current
    run.current += dt * (6 + speed * 1.5)
    const rp = run.current
    const sprint = g.sprinting
    const swing = moving ? clamp(speed / 7, 0.3, 1.2) : 0
    root.current.scale.set(1 + (g.landT > 0 ? 0.1 : 0), g.landT > 0 ? 0.85 : 1, 1 + (g.landT > 0 ? 0.1 : 0))

    let tx = moving ? clamp(speed / 9, 0, 1) * 0.3 : 0; let tz = 0
    if (hurt) tz = Math.sin(t * 60) * 0.18 * (g.hurtT / 0.7)
    if (dead) { tx = -1.2; }
    tilt.current.rotation.set(dead ? -1.35 : tx, 0, tz)
    tilt.current.position.set(0, dead ? 0.25 : 0.78 + (won && !reduce ? Math.abs(Math.sin(t * 6)) * 0.5 : moving ? Math.abs(Math.sin(rp)) * 0.08 : Math.sin(t * 2.4) * 0.025), 0)

    const k = clamp(dt * 16, 0, 1)
    let aLx = Math.sin(rp) * 0.95 * swing; let aRx = -Math.sin(rp) * 0.95 * swing; let aLz = 0.14; let aRz = -0.14
    let lLx = -Math.sin(rp) * 0.9 * swing; let lRx = Math.sin(rp) * 0.9 * swing
    if (air) { aLx = aRx = -0.4; aLz = 1.1; aRz = -1.1; lLx = -0.5; lRx = 0.25 }
    if (netting) { const q = 1 - g.captureT / 0.45; aRx = -1.6 - Math.sin(q * Math.PI) * 0.7; aRz = -0.2; aLx = -0.4 }
    if (repairing && !won) { aLx = -1.2 + Math.sin(t * 14) * 0.25; aRx = -1.2 - Math.sin(t * 14) * 0.25; aLz = 0.3; aRz = -0.3 }
    if (won) { aLz = 2.7 + Math.sin(t * 12) * 0.3; aRz = -2.7 - Math.sin(t * 12 + 1) * 0.3; aLx = aRx = 0; lLx = Math.sin(t * 9) * 0.7; lRx = -Math.sin(t * 9) * 0.7 }
    if (hurt) { aLz = 1.8; aRz = -1.8; aLx = aRx = 0 }
    if (dead) { aLz = 1.4; aRz = -1.4; aLx = aRx = 0 }
    armL.current.rotation.x += (aLx - armL.current.rotation.x) * k; armR.current.rotation.x += (aRx - armR.current.rotation.x) * k
    armL.current.rotation.z += (aLz - armL.current.rotation.z) * k; armR.current.rotation.z += (aRz - armR.current.rotation.z) * k
    legL.current.rotation.x += (lLx - legL.current.rotation.x) * k; legR.current.rotation.x += (lRx - legR.current.rotation.x) * k

    const eye = hurt || dead ? '#ff5a5a' : sprint ? '#22d3ee' : '#4da3ff'
    for (const e of [eyeL.current, eyeR.current]) { e.material.color.set(eye); e.material.emissive.set(eye); e.scale.y = (t % 3.6 < 0.12 ? 0.13 : 1.3) }
    shell.current.emissive.setRGB(hurt ? 0.9 * (g.hurtT / 0.7) : 0, 0, 0)
    head.current.rotation.x = dead ? 0.5 : air ? -0.1 : 0
    pack.current.material.emissiveIntensity = 0.6 + (g.energy / 100) * 1.2 + (netting ? 1.5 : 0)
    aura.current.visible = g.effects.speed > 0 || g.effects.magnet > 0
    if (aura.current.visible) { aura.current.material.color.set(g.effects.magnet > 0 ? '#f472b6' : '#fcd34d'); aura.current.rotation.y = t * 3; aura.current.scale.setScalar(1 + Math.sin(t * 6) * 0.06) }
    shieldM.current.visible = g.effects.shield > 0 && !dead
    if (shieldM.current.visible) shieldM.current.rotation.y = t * 1.5

    shadow.current.visible = !dead
    shadow.current.position.set(p.x, (g.grounded ? p.y : (g.ground === 'floor' ? 0 : Math.max(0, p.y - 3))) + 0.03, p.z)
    const h = g.grounded ? 0 : p.y
    shadow.current.scale.setScalar(Math.max(0.6, 1.9 - h * 0.25)); shadow.current.material.opacity = clamp(1 - h * 0.12, 0.3, 1)
  })

  const white = { color: '#ffffff', roughness: 0.2, metalness: 0.05 }
  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={tex} transparent depthWrite={false} /></mesh>
      <group ref={root}>
        <group ref={tilt} position={[0, 0.78, 0]}>
          <group position={[0, -0.78, 0]}>
            <mesh position={[0, 0.66, 0]} castShadow><capsuleGeometry args={[0.36, 0.3, 8, 16]} /><meshStandardMaterial ref={shell} {...white} /></mesh>
            <mesh position={[0, 0.5, 0.33]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} /></mesh>
            <mesh ref={pack} position={[0, 0.72, -0.4]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.46, 0.5, 0.22]} /><meshStandardMaterial color="#312e81" emissive="#6366f1" emissiveIntensity={1} roughness={0.35} metalness={0.5} /></mesh>
            <mesh position={[0.18, 0.95, -0.52]} rotation={[0.6, 0, 0]}><cylinderGeometry args={[0.05, 0.07, 0.4, 8]} /><meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={1} /></mesh>
            <group ref={armL} position={[-0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]}><capsuleGeometry args={[0.085, 0.3, 5, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.28, 0]}><torusGeometry args={[0.1, 0.03, 8, 14]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} /></mesh></group>
            <group ref={armR} position={[0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]}><capsuleGeometry args={[0.085, 0.3, 5, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial {...white} /></mesh></group>
            <group ref={legL} position={[-0.17, 0.36, 0]}><mesh position={[0, -0.22, 0.05]} scale={[1, 0.7, 1.35]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh></group>
            <group ref={legR} position={[0.17, 0.36, 0]}><mesh position={[0, -0.22, 0.05]} scale={[1, 0.7, 1.35]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh></group>
            <group ref={head} position={[0, 1.34, 0]}>
              <mesh scale={[1.06, 0.92, 0.98]}><sphereGeometry args={[0.62, 24, 18]} /><meshStandardMaterial {...white} roughness={0.2} /></mesh>
              <mesh position={[0, 0, 0.34]} scale={[1, 0.72, 0.56]}><sphereGeometry args={[0.5, 20, 14]} /><meshStandardMaterial color="#0b0b25" roughness={0.1} metalness={0.5} /></mesh>
              <mesh ref={eyeL} position={[-0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.7} /></mesh>
              <mesh ref={eyeR} position={[0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.7} /></mesh>
              <mesh position={[0, 0.13, 0.55]} rotation={[0, 0, 0]}><boxGeometry args={[0.7, 0.03, 0.05]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} /></mesh>
              <mesh scale={[1, 1, 0.45]}><torusGeometry args={[0.66, 0.045, 8, 30, Math.PI]} /><meshStandardMaterial color="#4f46e5" roughness={0.35} emissive="#4338ca" emissiveIntensity={0.5} /></mesh>
              <mesh position={[-0.66, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.14, 16]} /><meshStandardMaterial color="#4f46e5" roughness={0.3} emissive="#22d3ee" emissiveIntensity={0.7} /></mesh>
              <mesh position={[0.66, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.14, 16]} /><meshStandardMaterial color="#4f46e5" roughness={0.3} emissive="#22d3ee" emissiveIntensity={0.7} /></mesh>
              <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.025, 0.025, 0.3, 6]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
              <mesh position={[0, 0.9, 0]}><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.7} /></mesh>
            </group>
          </group>
        </group>
        <mesh ref={aura} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}><torusGeometry args={[0.8, 0.05, 8, 32]} /><meshBasicMaterial color="#fcd34d" transparent opacity={0.8} /></mesh>
        <mesh ref={shieldM} position={[0, 0.85, 0]} visible={false}><icosahedronGeometry args={[1.15, 1]} /><meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.55} /></mesh>
      </group>
    </>
  )
}
