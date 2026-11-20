import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * LAXBOT in 3D, built from primitive shapes in code. IMPORTANT: this is a PROCEDURAL PLACEHOLDER, not a production character model. It has the right look (glossy white shell, dark visor, glowing
 * eyes, violet headphones, heart antenna, Star Collector halo) and the full set of animations (idle, running, catching, hurt, victory, defeat), but it is not a modelled, rigged and textured asset.
 * To replace it with an approved glTF character see PLAYZONE_ASSETS.md ("Replacing the procedural LAXBOT"): keep the same animation states this component reads from the controller.
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export const shadowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30)
  grd.addColorStop(0, 'rgba(30,10,70,0.55)'); grd.addColorStop(1, 'rgba(30,10,70,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export default function LaxBot3D({ controller }) {
  const root = useRef(); const body = useRef(); const head = useRef(); const armL = useRef(); const armR = useRef(); const footL = useRef(); const footR = useRef()
  const eyeL = useRef(); const eyeR = useRef(); const happyL = useRef(); const happyR = useRef(); const smile = useRef(); const shell = useRef(); const halo = useRef(); const shadow = useRef(); const heartLight = useRef()
  const run = useRef(0)
  const shadowTex = useMemo(() => shadowTexture(), [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = controller.state
    const t = state.clock.elapsedTime
    const reduce = c.reduceMotion
    const vx = c.sim.botVx
    const speed = Math.abs(vx)
    const phase = c.phase
    const over = phase === 'gameover' || phase === 'results'
    const won = over && c.sim.reason === 'time'
    const lost = over && !won
    const hurt = c.bot.hurtT > 0
    const catching = c.bot.catchT > 0
    const happy = catching || won

    run.current += dt * (7 + speed * 0.8)
    const rp = run.current
    const moving = phase === 'playing' && speed > 0.6

    // root: position follows the rules, plus bobbing, leaning and the victory jump
    let y = 0.04 * Math.sin(t * 3)
    if (moving) y = Math.abs(Math.sin(rp)) * 0.1
    if (won && !reduce) y = Math.abs(Math.sin(t * 6)) * 0.75
    root.current.position.set(c.sim.botX + (hurt && !reduce ? Math.sin(t * 70) * 0.06 * (c.bot.hurtT / 0.7) : 0), y, 0)
    root.current.rotation.y = won && !reduce ? t * 5 : clamp(vx * 0.045, -0.4, 0.4)
    root.current.rotation.z = clamp(-vx * 0.03, -0.3, 0.3)
    const pulse = catching ? 1 + 0.13 * Math.sin((1 - c.bot.catchT / 0.28) * Math.PI) : 1
    root.current.scale.set(pulse, lost ? 0.9 : pulse, pulse)

    // arms and feet
    const swing = moving ? Math.min(1, speed / 6) : 0
    const armUp = won ? 2.7 : catching ? 2.2 : 0
    armL.current.rotation.x = Math.sin(rp) * 0.9 * swing; armR.current.rotation.x = -Math.sin(rp) * 0.9 * swing
    armL.current.rotation.z = THREE.MathUtils.lerp(armL.current.rotation.z, armUp ? -armUp + 0.1 : 0.12 + 0.03 * Math.sin(t * 2), clamp(dt * 14, 0, 1))
    armR.current.rotation.z = THREE.MathUtils.lerp(armR.current.rotation.z, armUp ? armUp - 0.1 : -0.12 - 0.03 * Math.sin(t * 2 + 1), clamp(dt * 14, 0, 1))
    footL.current.position.y = 0.14 + (moving ? Math.max(0, Math.sin(rp)) * 0.18 : 0)
    footR.current.position.y = 0.14 + (moving ? Math.max(0, -Math.sin(rp)) * 0.18 : 0)
    footL.current.position.z = moving ? Math.cos(rp) * 0.12 : 0; footR.current.position.z = moving ? -Math.cos(rp) * 0.12 : 0

    // head: nods, droops in defeat
    head.current.rotation.x = lost ? 0.38 : moving ? 0.06 : 0
    head.current.rotation.z = Math.sin(t * 1.6) * 0.03 + (hurt ? Math.sin(t * 50) * 0.08 : 0)
    head.current.position.y = 1.34 + (lost ? -0.08 : 0)

    // face: blink, happy arcs, hurt flash
    const blink = t % 3.4 < 0.12 ? 0.1 : 1
    eyeL.current.visible = eyeR.current.visible = !happy
    happyL.current.visible = happyR.current.visible = happy
    eyeL.current.scale.y = eyeR.current.scale.y = 1.3 * blink
    const eyeColor = hurt ? '#ff5a5a' : lost ? '#6b7db3' : '#4da3ff'
    for (const e of [eyeL.current, eyeR.current]) { e.material.color.set(eyeColor); e.material.emissive.set(eyeColor) }
    smile.current.rotation.z = hurt || lost ? 0 : Math.PI // a smile, or a frown when hurt or beaten
    smile.current.position.y = hurt || lost ? -0.26 : -0.2
    shell.current.emissive.setRGB(hurt ? 0.9 * (c.bot.hurtT / 0.7) : 0, 0, 0)
    halo.current.rotation.y = t * 1.5; halo.current.position.y = 1.0 + Math.sin(t * 2.2) * 0.03
    heartLight.current.intensity = 1.2 + Math.sin(t * 4) * 0.4

    // contact shadow: smaller when the bot is in the air
    const lift = y
    shadow.current.scale.setScalar(2 * (1 - Math.min(0.45, lift * 0.35)))
    shadow.current.position.x = root.current.position.x
  })

  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.05]}>
        <planeGeometry args={[1, 1]} /><meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
      <group ref={root}>
        <group ref={body}>
          {/* body */}
          <mesh position={[0, 0.66, 0]} castShadow><capsuleGeometry args={[0.36, 0.3, 8, 20]} /><meshStandardMaterial ref={shell} color="#ffffff" roughness={0.22} metalness={0.05} /></mesh>
          <mesh position={[0, 0.5, 0.33]}><sphereGeometry args={[0.08, 12, 10]} /><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.2} /></mesh>
          <mesh position={[0, 0.38, 0.28]} rotation={[0, 0, 0]}><torusGeometry args={[0.3, 0.025, 8, 24, Math.PI]} /><meshStandardMaterial color="#7c3aed" roughness={0.4} /></mesh>
          {/* arms (pivot at the shoulder) */}
          <group ref={armL} position={[-0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]} castShadow><capsuleGeometry args={[0.085, 0.3, 6, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 14, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh></group>
          <group ref={armR} position={[0.46, 0.86, 0]}><mesh position={[0, -0.2, 0]} castShadow><capsuleGeometry args={[0.085, 0.3, 6, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh><mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.12, 14, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh></group>
          {/* feet */}
          <mesh ref={footL} position={[-0.17, 0.14, 0]} scale={[1, 0.7, 1.35]} castShadow><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh>
          <mesh ref={footR} position={[0.17, 0.14, 0]} scale={[1, 0.7, 1.35]} castShadow><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh>
        </group>

        {/* head */}
        <group ref={head} position={[0, 1.34, 0]}>
          <mesh scale={[1.06, 0.92, 0.98]} castShadow><sphereGeometry args={[0.62, 28, 22]} /><meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.05} /></mesh>
          <mesh position={[0, 0.0, 0.34]} scale={[1, 0.72, 0.56]}><sphereGeometry args={[0.5, 24, 18]} /><meshStandardMaterial color="#150f26" roughness={0.12} metalness={0.4} /></mesh>
          <mesh ref={eyeL} position={[-0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 14, 12]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.6} /></mesh>
          <mesh ref={eyeR} position={[0.2, 0.03, 0.6]} scale={[1, 1.3, 0.5]}><sphereGeometry args={[0.1, 14, 12]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={1.6} /></mesh>
          <mesh ref={happyL} position={[-0.2, 0.0, 0.62]} visible={false}><torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} /><meshStandardMaterial color="#7dd3fc" emissive="#4da3ff" emissiveIntensity={1.8} /></mesh>
          <mesh ref={happyR} position={[0.2, 0.0, 0.62]} visible={false}><torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} /><meshStandardMaterial color="#7dd3fc" emissive="#4da3ff" emissiveIntensity={1.8} /></mesh>
          <mesh ref={smile} position={[0, -0.2, 0.62]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.085, 0.022, 8, 14, Math.PI]} /><meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.6} /></mesh>
          <mesh position={[-0.36, -0.1, 0.52]} rotation={[0, -0.5, 0]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#f9a8d4" transparent opacity={0.65} /></mesh>
          <mesh position={[0.36, -0.1, 0.52]} rotation={[0, 0.5, 0]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#f9a8d4" transparent opacity={0.65} /></mesh>
          {/* headphones */}
          <mesh position={[0, 0, 0]} scale={[1, 1, 0.45]}><torusGeometry args={[0.66, 0.045, 10, 36, Math.PI]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} emissive="#5b21b6" emissiveIntensity={0.3} /></mesh>
          <mesh position={[-0.66, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.14, 20]} /><meshStandardMaterial color="#7c3aed" roughness={0.3} emissive="#6d28d9" emissiveIntensity={0.5} /></mesh>
          <mesh position={[0.66, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.14, 20]} /><meshStandardMaterial color="#7c3aed" roughness={0.3} emissive="#6d28d9" emissiveIntensity={0.5} /></mesh>
          {/* antenna with a glowing heart, and the Star Collector halo */}
          <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.025, 0.025, 0.3, 8]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
          <mesh position={[0, 0.9, 0]}><sphereGeometry args={[0.09, 14, 12]} /><meshStandardMaterial color="#f9a8d4" emissive="#f472b6" emissiveIntensity={1.6} /></mesh>
          <pointLight ref={heartLight} position={[0, 0.9, 0.2]} color="#f9a8d4" intensity={1.2} distance={3.5} />
          <mesh ref={halo} position={[0, 1.0, 0]} rotation={[Math.PI / 2.3, 0, 0]}><torusGeometry args={[0.3, 0.032, 10, 32]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.4} /></mesh>
        </group>
      </group>
    </>
  )
}
