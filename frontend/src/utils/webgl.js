// Can this browser create a WebGL context at all? Checked ONCE per page, before any 3D code is downloaded or a canvas is mounted: on a device without WebGL (blocked hardware
// acceleration, very old phones, some privacy modes) the 3D libraries would otherwise throw while rendering and take the whole page down with them.
let result
export function webglSupported() {
  if (result !== undefined) return result
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    result = !!gl
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.() // release the probe context straight away
  } catch {
    result = false
  }
  return result
}

/** What kind of graphics hardware this is, from the browser's own (sometimes redacted) renderer string. Used only to pick a CONSERVATIVE default quality; "unknown" is treated as capable. */
let gpu
export function gpuInfo() {
  if (gpu) return gpu
  gpu = { renderer: '', weak: false, software: false }
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    gpu.renderer = name
    gpu.software = /swiftshader|llvmpipe|software|basic render/i.test(name)
    gpu.weak = gpu.software || /Intel\(R\) (UHD|HD) Graphics|Mali-[T4G]|PowerVR|Adreno \(TM\) [1-5]\d\d/i.test(name)
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.()
  } catch { /* leave the defaults */ }
  return gpu
}
