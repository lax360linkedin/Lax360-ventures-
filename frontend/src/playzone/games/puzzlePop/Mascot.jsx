import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { shadowTexture } from '../catchTheStars/LaxBot3D.jsx'

/**
 * The LAXBOT puzzle assistant: the same glossy placeholder character as the other games (primitive shapes in code, NOT a production model; see PLAYZONE_ASSETS.md) with the Puzzle Wizard
 * hat. Its mood comes from the controller: idle (breathing, blinking), happy (after a match), excited (combos, power-ups: a hop and a spin), encourage (a refused swap: a nod and a wink),
 * victory (a dance) and fail (a droop).
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function Mascot({ controller, position = [0, 0, 0], scale = 1 }) {
  const root = useRef(); const body = useRef(); const head = useRef(); const armL = useRef(); const armR = useRef(); const eyeL = useRef(); const eyeR = useRef()
  const happyL = useRef(); const happyR = useRef(); const mouth = useRef(); const star = useRef()
  const tex = useMemo(() => shadowTexture(), [])
  useEffect(() => () => tex.dispose(), [tex])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state
    const t = state.clock.elapsedTime
    const m = c.mood.name
    const reduce = c.reduceMotion
    const k = clamp(dt * 12, 0, 1)
    let y = Math.sin(t * 2) * 0.03; let rot = 0; let lz = 0.12; let rz = -0.12; let lx = 0; let hx = 0; let hz = Math.sin(t * 1.4) * 0.03; let sy = 1
    if (m === 'happy') { y += Math.abs(Math.sin(t * 9)) * 0.12; lz = 0.9; rz = -0.9 }
    else if (m === 'excited') { y += reduce ? 0.05 : Math.abs(Math.sin(t * 11)) * 0.4; rot = reduce ? 0 : t * 8; lz = 2.5; rz = -2.5 }
    else if (m === 'encourage') { hx = 0.25 + Math.sin(t * 8) * 0.12; hz = Math.sin(t * 6) * 0.08; lz = 0.6; rz = -0.12 }
    else if (m === 'victory') { y += reduce ? 0.1 : Math.abs(Math.sin(t * 6)) * 0.55; rot = reduce ? 0 : Math.sin(t * 3) * 0.8; lz = 2.6 + Math.sin(t * 12) * 0.3; rz = -2.6 - Math.sin(t * 12 + 1) * 0.3 }
    else if (m === 'fail') { hx = 0.45; y -= 0.06; sy = 0.93; lz = 0.05; rz = -0.05; lx = 0.2 }
    root.current.position.set(position[0], position[1] + y, position[2])
    root.current.rotation.y = rot
    root.current.scale.set(scale, scale * sy, scale)
    armL.current.rotation.z += (lz - armL.current.rotation.z) * k; armR.current.rotation.z += (rz - armR.current.rotation.z) * k; armL.current.rotation.x += (lx - armL.current.rotation.x) * k
    head.current.rotation.x += (hx - head.current.rotation.x) * k; head.current.rotation.z += (hz - head.current.rotation.z) * k
    const happy = m === 'happy' || m === 'excited' || m === 'victory'
    const wink = m === 'encourage' && Math.sin(t * 8) > 0
    eyeL.current.visible = !happy; eyeR.current.visible = !happy && !wink
    happyL.current.visible = happy; happyR.current.visible = happy || wink
    const blink = t % 3.6 < 0.12 ? 0.1 : 1
    eyeL.current.scale.y = eyeR.current.scale.y = 1.3 * blink
    mouth.current.rotation.z = m === 'fail' ? 0 : Math.PI
    mouth.current.position.y = m === 'fail' ? -0.27 : -0.2
    star.current.rotation.y = t * 2
  })

  const white = { color: '#ffffff', roughness: 0.2, metalness: 0.05 }
  return (
    <>
      <mesh position={[position[0], position[1] - 0.02, position[2] - 0.2]} rotation={[-Math.PI / 2, 0, 0]} scale={2.2}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={tex} transparent depthWrite={false} /></mesh>
      <group ref={root}>
        <group ref={body}>
          <mesh position={[0, 0.66, 0]}><capsuleGeometry args={[0.36, 0.3, 8, 16]} /><meshStandardMaterial {...white} /></mesh>
          <mesh position={[0, 0.5, 0.33]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.2} /></mesh>
          <group ref={armL} position={[-0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]}><capsuleGeometry args={[0.085, 0.3, 5, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial {...white} /></mesh></group>
          <group ref={armR} position={[0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]}><capsuleGeometry args={[0.085, 0.3, 5, 10]} /><meshStandardMaterial {...white} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial {...white} /></mesh></group>
          <mesh position={[-0.17, 0.14, 0.05]} scale={[1, 0.7, 1.35]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh>
          <mesh position={[0.17, 0.14, 0.05]} scale={[1, 0.7, 1.35]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh>
        </group>
        <group ref={head} position={[0, 1.34, 0]}>
          <mesh scale={[1.06, 0.92, 0.98]}><sphereGeometry args={[0.62, 24, 18]} /><meshStandardMaterial {...white} /></mesh>
          <mesh position={[0, 0, 0.34]} scale={[1, 0.72, 0.56]}><sphereGeometry args={[0.5, 20, 14]} /><meshStandardMaterial color="#150f26" roughness={0.12} metalness={0.4} /></mesh>
          <mesh ref={eyeL} position={[-0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.6} /></mesh>
          <mesh ref={eyeR} position={[0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.6} /></mesh>
          <mesh ref={happyL} position={[-0.2, 0, 0.62]} visible={false}><torusGeometry args={[0.1, 0.03, 8, 14, Math.PI]} /><meshStandardMaterial color="#7dd3fc" emissive="#4da3ff" emissiveIntensity={1.8} /></mesh>
          <mesh ref={happyR} position={[0.2, 0, 0.62]} visible={false}><torusGeometry args={[0.1, 0.03, 8, 14, Math.PI]} /><meshStandardMaterial color="#7dd3fc" emissive="#4da3ff" emissiveIntensity={1.8} /></mesh>
          <mesh ref={mouth} position={[0, -0.2, 0.62]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.085, 0.022, 8, 12, Math.PI]} /><meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.6} /></mesh>
          <mesh position={[-0.36, -0.1, 0.52]} rotation={[0, -0.5, 0]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#f9a8d4" transparent opacity={0.65} /></mesh>
          <mesh position={[0.36, -0.1, 0.52]} rotation={[0, 0.5, 0]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#f9a8d4" transparent opacity={0.65} /></mesh>
          {/* the Puzzle Wizard hat */}
          <mesh position={[0, 0.62, 0]} rotation={[0, 0, 0.12]}><coneGeometry args={[0.42, 0.85, 20]} /><meshStandardMaterial color="#6d28d9" roughness={0.35} emissive="#4c1d95" emissiveIntensity={0.3} /></mesh>
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.07, 8, 28]} /><meshStandardMaterial color="#7c3aed" roughness={0.4} /></mesh>
          <mesh ref={star} position={[0.05, 0.98, 0]}><octahedronGeometry args={[0.1, 0]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.6} /></mesh>
        </group>
      </group>
    </>
  )
}
