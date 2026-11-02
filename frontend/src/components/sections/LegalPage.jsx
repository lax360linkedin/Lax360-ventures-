import { AlertTriangle } from 'lucide-react'
import PageContainer from '../layout/PageContainer.jsx'
import { legal } from '../../data/legal.js'

/** Shared template for Privacy and Terms. Shows a clear banner while the text is unreviewed. */
export default function LegalPage({ doc, path, description }) {
  return (
    <PageContainer path={path} title={doc.title} description={description}>
      <div className="wrap section max-w-3xl">
        <h1 className="h1 !text-[clamp(2.5rem,6vw,4.5rem)]">{doc.title}</h1>
        {!legal.reviewed && (
          <div role="note" className="mt-8 flex gap-3 rounded-lg border-2 border-edge-strong bg-glass p-4 text-base">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
            <p><strong>Draft — requires business and legal review.</strong> This page is a structural outline, not approved legal text.</p>
          </div>
        )}
        <p className="mt-4 text-sm text-soft">{legal.updated}</p>
        <p className="mt-8 text-lg text-soft">{doc.intro}</p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-2xl font-semibold">{s.h}</h2>
              <p className="mt-2 text-soft">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
