import * as THREE from 'three'
import { BUG_TYPES } from './config.js'

// The digital bugs and the two bosses, built from primitive shapes in code (placeholders: no model files). Each bug is one small group of meshes sharing geometry and materials,
// updated every frame from the simulation state (position, state of its state machine). `makeCreatureAssets()` creates the shared geometry and materials; `disposeCreatureAssets()` frees them.

export function makeCreatureAssets() {
  const geo = {
    body: new THREE.SphereGeometry(0.5, 18, 14), eye: new THREE.SphereGeometry(0.11, 10, 8), pupil: new THREE.SphereGeometry(0.06, 8, 6), leg: new THREE.CylinderGeometry(0.03, 0.025, 0.5, 5),
    ant: new THREE.CylinderGeometry(0.02, 0.02, 0.45, 5), tip: new THREE.SphereGeometry(0.07, 8, 6), wing: new THREE.CircleGeometry(0.42, 12), gem: new THREE.OctahedronGeometry(0.2, 0),
    shield: new THREE.IcosahedronGeometry(0.95, 1), ice: new THREE.IcosahedronGeometry(0.85, 0), star: new THREE.OctahedronGeometry(0.1, 0), claw: new THREE.SphereGeometry(0.5, 12, 10),
    box: new THREE.BoxGeometry(1, 1, 1), torus: new THREE.TorusGeometry(1, 0.08, 10, 40), core: new THREE.IcosahedronGeometry(1, 1), dome: new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  }
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2, emissive: color, emissiveIntensity: 0.25, ...extra })
  const mat = {
    types: Object.fromEntries(Object.entries(BUG_TYPES).map(([k, t]) => [k, std(t.color)])),
    legs: std('#1e293b', { emissive: '#000000', emissiveIntensity: 0 }), eyeW: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }), pupil: new THREE.MeshBasicMaterial({ color: '#0b0b25' }),
    tip: new THREE.MeshBasicMaterial({ color: '#67e8f9' }), shield: new THREE.MeshBasicMaterial({ color: '#60a5fa', wireframe: true, transparent: true, opacity: 0.7 }),
    ice: new THREE.MeshPhysicalMaterial({ color: '#bae6fd', transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1 }), star: new THREE.MeshBasicMaterial({ color: '#fde047' }),
    wing: new THREE.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.55, side: THREE.DoubleSide }), gem: new THREE.MeshStandardMaterial({ color: '#f0abfc', emissive: '#e879f9', emissiveIntensity: 1.2, roughness: 0.1 }),
    crab: std('#fb7185', { emissiveIntensity: 0.3 }), crabDark: std('#9f1239', { emissiveIntensity: 0.15 }), core: std('#c084fc', { emissiveIntensity: 0.7 }), coreRing: std('#f472b6', { emissiveIntensity: 1 }),
    weak: new THREE.MeshBasicMaterial({ color: '#fef08a' }), warn: new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    beam: new THREE.MeshBasicMaterial({ color: '#f472b6', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), orb: new THREE.MeshBasicMaterial({ color: '#fb7185' }),
  }
  return { geo, mat }
}
export function disposeCreatureAssets(a) { Object.values(a.geo).forEach((g) => g.dispose()); const walk = (m) => { if (m && m.dispose) m.dispose(); else if (m) Object.values(m).forEach(walk) }; walk(a.mat) }

/** One bug: body, eyes, six legs, antennae, plus the extras of each type (wings, gem, shield, ice, stun stars). */
export function createBugMesh(a) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(a.geo.body, a.mat.types.normal); body.scale.set(1, 0.8, 1.15); body.position.y = 0.55; body.castShadow = true; g.add(body)
  const eyes = []
  for (const s of [-1, 1]) { const e = new THREE.Mesh(a.geo.eye, a.mat.eyeW); e.position.set(s * 0.2, 0.7, 0.45); const p = new THREE.Mesh(a.geo.pupil, a.mat.pupil); p.position.set(0, 0, 0.07); e.add(p); g.add(e); eyes.push(e) }
  const legs = []
  for (let i = 0; i < 6; i += 1) { const side = i % 2 ? 1 : -1; const row = Math.floor(i / 2) - 1; const l = new THREE.Mesh(a.geo.leg, a.mat.legs); l.position.set(side * 0.4, 0.3, row * 0.3); l.rotation.z = side * 0.9; g.add(l); legs.push(l) }
  for (const s of [-1, 1]) { const an = new THREE.Mesh(a.geo.ant, a.mat.legs); an.position.set(s * 0.16, 1.05, 0.35); an.rotation.set(0.5, 0, s * 0.3); const tip = new THREE.Mesh(a.geo.tip, a.mat.tip); tip.position.y = 0.25; an.add(tip); g.add(an) }
  const wings = new THREE.Group(); wings.position.set(0, 0.95, -0.1)
  for (const s of [-1, 1]) { const w = new THREE.Mesh(a.geo.wing, a.mat.wing); w.rotation.set(-Math.PI / 2, 0, s * 0.35); w.position.x = s * 0.45; wings.add(w) }
  g.add(wings)
  const gem = new THREE.Mesh(a.geo.gem, a.mat.gem); gem.position.y = 1.05; g.add(gem)
  const shield = new THREE.Mesh(a.geo.shield, a.mat.shield); shield.position.y = 0.6; g.add(shield)
  const ice = new THREE.Mesh(a.geo.ice, a.mat.ice); ice.position.y = 0.55; g.add(ice)
  const stars = new THREE.Group(); stars.position.y = 1.5
  for (let i = 0; i < 3; i += 1) { const s = new THREE.Mesh(a.geo.star, a.mat.star); s.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.4, 0, Math.sin((i / 3) * Math.PI * 2) * 0.4); stars.add(s) }
  g.add(stars)
  g.userData = { body, eyes, legs, wings, gem, shield, ice, stars }
  return g
}

export function updateBugMesh(g, bug, t, a, playerX, playerZ) {
  const u = g.userData
  const type = BUG_TYPES[bug.type]
  const visible = bug.state !== 'defeated' && (bug.revealed || !bug.hidden)
  g.visible = visible
  if (!visible) return
  const captured = bug.state === 'captured'
  g.position.set(bug.x, bug.y, bug.z)
  const face = bug.state === 'escape' ? Math.atan2(bug.x - playerX, bug.z - playerZ) : bug.state === 'chase' || bug.state === 'detect' || bug.state === 'attack' ? Math.atan2(playerX - bug.x, playerZ - bug.z) : bug.heading
  g.rotation.y = face
  u.body.material = a.mat.types[bug.type]
  const moving = ['wander', 'patrol', 'escape', 'chase'].includes(bug.state)
  const scale = captured ? Math.max(0.01, 1 - bug.stateT / 0.55) : bug.state === 'attack' ? 1.2 : 1
  g.scale.setScalar(scale * (bug.type === 'shield' ? 1.15 : bug.type === 'speed' ? 0.85 : 1))
  g.position.y += captured ? bug.stateT * 1.6 : Math.abs(Math.sin(t * (moving ? 12 : 3) + bug.anim)) * (moving ? 0.12 : 0.04)
  u.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 16 + i * 1.7) * 0.7 : 0 })
  u.wings.visible = bug.type === 'speed'; if (u.wings.visible) u.wings.rotation.z = Math.sin(t * 40) * 0.25
  u.gem.visible = bug.type === 'rare'; u.gem.rotation.y = t * 2
  u.shield.visible = bug.shield > 0; u.shield.rotation.y = t * 1.5
  u.ice.visible = bug.state === 'frozen' || bug.frozenT > 0
  u.stars.visible = bug.state === 'stunned'; u.stars.rotation.y = t * 5
  u.body.material.emissiveIntensity = bug.state === 'detect' || bug.state === 'attack' ? 0.9 : bug.state === 'escape' ? 0.45 : 0.25
  for (const e of u.eyes) e.scale.y = bug.state === 'detect' ? 1.35 : 1
  void type
}

/** The two bosses share one group: the Glitch Crab (a big body with claws) and the Core Corruptor (a floating crystal with spinning rings). */
export function createBossMesh(a) {
  const g = new THREE.Group()
  const crab = new THREE.Group()
  const body = new THREE.Mesh(a.geo.body, a.mat.crab); body.scale.set(3.2, 1.5, 2.6); body.position.y = 1.1; crab.add(body)
  const claws = []
  for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(s * 1.9, 1.1, 0.8); const c = new THREE.Mesh(a.geo.claw, a.mat.crabDark); c.scale.set(0.9, 0.7, 1.3); arm.add(c); const pinch = new THREE.Mesh(a.geo.box, a.mat.crab); pinch.scale.set(0.3, 0.3, 0.9); pinch.position.set(0, 0.2, 0.9); arm.add(pinch); crab.add(arm); claws.push(arm) }
  const legs = []
  for (let i = 0; i < 6; i += 1) { const s = i % 2 ? 1 : -1; const l = new THREE.Mesh(a.geo.leg, a.mat.crabDark); l.scale.set(2.2, 2.4, 2.2); l.position.set(s * 1.7, 0.5, -0.8 + Math.floor(i / 2) * 0.8); l.rotation.z = s * 0.9; crab.add(l); legs.push(l) }
  for (const s of [-1, 1]) { const e = new THREE.Mesh(a.geo.eye, a.mat.eyeW); e.scale.setScalar(2.2); e.position.set(s * 0.6, 2.1, 1.0); const p = new THREE.Mesh(a.geo.pupil, a.mat.pupil); p.position.z = 0.08; e.add(p); crab.add(e) }
  const weakC = new THREE.Mesh(a.geo.dome, a.mat.weak); weakC.scale.set(1.2, 1.2, 1.2); weakC.position.y = 1.9; crab.add(weakC)
  g.add(crab)
  const core = new THREE.Group()
  const crystal = new THREE.Mesh(a.geo.core, a.mat.core); crystal.scale.setScalar(1.4); crystal.position.y = 2; core.add(crystal)
  const rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(a.geo.torus, a.mat.coreRing); r.scale.setScalar(1.7 + i * 0.35); r.position.y = 2; core.add(r); return r })
  const weakK = new THREE.Mesh(a.geo.core, a.mat.weak); weakK.scale.setScalar(0.55); weakK.position.y = 2; core.add(weakK)
  g.add(core)
  const telegraph = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), a.mat.warn); telegraph.rotation.x = -Math.PI / 2; telegraph.position.y = 0.05; g.add(telegraph) // set to the world, see updateBossMesh
  const beam = new THREE.Mesh(a.geo.box, a.mat.beam); beam.visible = false; g.add(beam)
  const ring = new THREE.Mesh(a.geo.torus, a.mat.warn); ring.rotation.x = Math.PI / 2; ring.visible = false; g.add(ring)
  g.userData = { crab, core, body, claws, legs, crystal, rings, weakC, weakK, telegraph, beam, ring }
  return g
}

export function updateBossMesh(g, boss, t, a) {
  const u = g.userData
  const visible = !!boss
  g.visible = visible
  if (!visible) return
  const isCrab = boss.kind === 'crab'
  u.crab.visible = isCrab; u.core.visible = !isCrab
  const defeated = boss.state === 'defeated'
  const sleeping = !boss.active
  g.position.set(boss.x, 0, boss.z)
  const hover = isCrab ? 0 : 0.5 + Math.sin(t * 2) * 0.25
  u.core.position.y = hover
  const base = defeated ? Math.max(0, 1 - boss.defeatT / 1.8) : 1
  g.scale.setScalar(base * (boss.state === 'phase' ? 1 + Math.sin(boss.stateT * 20) * 0.06 : 1))
  const charging = boss.state === 'attack' && boss.attack === 'charge'
  const heading = charging || boss.state === 'telegraph' ? Math.atan2(boss.dir[0], boss.dir[1]) : g.rotation.y
  g.rotation.y = heading
  const exposed = boss.state === 'exposed'
  const hurt = boss.state === 'hurt'
  u.weakC.visible = exposed; u.weakK.visible = exposed
  u.weakC.scale.setScalar(1.2 + Math.sin(t * 10) * 0.15); u.weakK.scale.setScalar(0.55 + Math.sin(t * 10) * 0.1)
  const mats = isCrab ? [a.mat.crab] : [a.mat.core]
  mats[0].emissiveIntensity = (sleeping ? 0.05 : 0.3) + (boss.state === 'telegraph' ? 0.6 + Math.sin(t * 24) * 0.4 : 0) + (hurt ? 1 : 0)
  if (isCrab) { u.claws.forEach((c, i) => { c.rotation.x = boss.state === 'telegraph' ? -0.6 : Math.sin(t * 3 + i) * 0.1 }); u.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + i) * 0.2 }) } else { u.rings.forEach((r, i) => { r.rotation.x = t * (0.8 + i * 0.4); r.rotation.y = t * (0.5 + i * 0.3) }); u.crystal.rotation.y = t }
  // warnings
  const tele = boss.state === 'telegraph'
  u.telegraph.visible = tele && boss.attack === 'charge'
  if (u.telegraph.visible) { u.telegraph.scale.set(2.4, 14, 1); u.telegraph.position.set(0, 0.05, 7.4); u.telegraph.rotation.set(-Math.PI / 2, 0, 0); a.mat.warn.opacity = 0.25 + (Math.sin(t * 22) * 0.5 + 0.5) * 0.4 }
  u.ring.visible = tele && boss.attack === 'orbs'
  if (u.ring.visible) { u.ring.scale.setScalar(1 + boss.stateT * 2); u.ring.position.y = 0.2; a.mat.warn.opacity = 0.7 }
  const beaming = (boss.state === 'attack' || tele) && boss.attack === 'beam'
  u.beam.visible = beaming
  if (beaming) { u.beam.rotation.y = boss.beamAngle - heading; u.beam.scale.set(0.5, 0.7, 17); u.beam.position.set(Math.sin(boss.beamAngle - heading) * 8.5, 0.55, Math.cos(boss.beamAngle - heading) * 8.5); a.mat.beam.opacity = tele ? 0.25 + Math.sin(t * 25) * 0.15 : 0.9 }
}
