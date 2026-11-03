import { usePreviewMode } from '../../hooks/useSite.js'

/** Shown only while an administrator is previewing unpublished drafts (opened from the admin panel). Visitors never see it. */
export default function PreviewBanner() {
  const preview = usePreviewMode()
  if (!preview) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[90] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">
      <span>Preview: you are seeing unpublished drafts. Visitors cannot see them.</span>
      <a className="underline" href={`${window.location.pathname}?cms_preview=0`}>Exit preview</a>
    </div>
  )
}
