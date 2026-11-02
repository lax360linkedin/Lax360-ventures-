import { ArrowRight, Bot, Send } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Reveal from '../ui/Reveal.jsx'
import { getDivision } from '../../data/services.js'

const ai = getDivision('ai')

/**
 * Home AI spotlight — the one place the mascot is featured outside the chat widget. Violet is the only
 * accent here. The workflow is labelled as an example, not a client result.
 */
export default function AiSpotlight() {
  return (
    <section aria-labelledby="ai-title" className="border-t border-edge bg-base2/50">
      <div className="wrap section grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="eyebrow mb-4 text-violet">AI &amp; Automation</p>
            <h2 id="ai-title" className="h2">Let AI handle the repetitive work.</h2>
            <p className="lead mt-5 text-soft">Assistants, document processing and workflow automation connected to the tools you already use.</p>
          </Reveal>

          <p className="eyebrow mt-12 text-violet">{ai.workflowLabel}</p>
          <ol className="mt-5 border-l-2 border-edge-strong">
            {ai.workflow.map((step, i) => (
              <Reveal as="li" key={step} delay={i * 0.12} y={10} className="relative flex items-center gap-5 py-4 pl-8">
                <span aria-hidden="true" className="absolute -left-[9px] size-4 rounded-full border-2 border-edge-strong bg-night" style={i === ai.workflow.length - 1 ? { background: '#A855F7' } : undefined} />
                <span className="font-display text-3xl font-semibold text-violet">0{i + 1}</span>
                <span className="font-display text-xl font-semibold md:text-2xl">{step}</span>
                {i < ai.workflow.length - 1 && <ArrowRight aria-hidden="true" className="ml-auto hidden size-5 rotate-90 text-soft sm:block" />}
              </Reveal>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button to="/services/ai" variant="violet" arrow>Explore AI &amp; Automation</Button>
            <Button to="/contact?type=ai" variant="secondary">Book an AI consultation</Button>
          </div>
        </div>

        {/* branded assistant moment */}
        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="relative mx-auto max-w-md">
            <div aria-hidden="true" className="absolute -inset-x-4 bottom-0 top-16 rounded-3xl border border-edge bg-gradient-to-b from-primary/25 to-transparent" />
            <div aria-hidden="true" className="anim-breathe absolute left-1/2 top-12 size-56 -translate-x-1/2 rounded-full bg-accent/30 md:size-64" />
            <img
              src="/assets/mascot-welcome.webp"
              alt="The LAX360 AI Assistant mascot, a friendly white robot with violet headphones, waving"
              width="480"
              height="722"
              loading="lazy"
              className="relative mx-auto -mt-6 h-auto w-56 md:w-64"
            />
            <div className="glass relative -mt-8 p-5">
              <p className="eyebrow text-violet">Meet the LAX360 AI Assistant</p>
              <p className="mt-2 font-display text-2xl font-semibold leading-tight">Ask about services, solutions or training.</p>
              <p className="mt-2 text-sm text-soft">AI-generated answers; confirm important details with the team.</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('lax360:open-chat'))}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-full bg-primary px-5 text-left text-base font-semibold text-white transition-colors hover:bg-accent"
              >
                <span className="inline-flex items-center gap-2"><Bot className="size-5" aria-hidden="true" /> Ask the assistant</span>
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
