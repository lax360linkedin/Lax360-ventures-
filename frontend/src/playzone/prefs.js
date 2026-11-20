import { useCallback, useSyncExternalStore } from 'react'

// Play Zone preferences (sound and graphics). They are REAL and kept on this device only (localStorage); future games read them through `usePrefs()`.
const KEY = 'lax360-playzone-prefs'
export const DEFAULT_PREFS = { sound: true, music: true, volume: 70, graphics: 'auto', haptics: true, avatar: 'star-collector' }
const listeners = new Set()
let cache = null

const read = () => {
  if (cache) return cache
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { /* private mode or blocked storage: the defaults are used */ }
  cache = { ...DEFAULT_PREFS, ...saved }
  return cache
}
const write = (patch) => {
  cache = { ...read(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* not saved, still applied for this visit */ }
  listeners.forEach((l) => l())
}
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

export const getPrefs = () => read()
export const setPref = (key, value) => write({ [key]: value })
export const subscribePrefs = subscribe

export function usePrefs() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS)
}
export function useSetPref() {
  return useCallback((key, value) => write({ [key]: value }), [])
}
