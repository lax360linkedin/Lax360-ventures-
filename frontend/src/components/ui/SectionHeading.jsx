import Reveal from './Reveal.jsx'
import BotHighlight from './BotHighlight.jsx'

/**
 * Section opener: eyebrow with a drawn rule, heading, optional lead. Fades and rises into place once.
 * Pass `gradient` to render a selected phrase of the title in the accent gradient.
 */
export default function SectionHeading({ eyebrow, title, gradient, lead, as: Tag = 'h2', id, className = '', center = false, bot = false, botDelay = 0.5 }) {
  return (
    <Reveal className={`${center ? 'mx-auto text-center' : ''} max-w-3xl ${className}`}>
      {eyebrow && (
        <p className={`eyebrow mb-4 flex items-center gap-3 text-lav ${center ? 'justify-center' : ''}`}>
          <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
          {eyebrow}
        </p>
      )}
      <Tag id={id} className="h2">
        {title}
        {gradient && (
          <>
            {' '}
            {bot ? <BotHighlight delay={botDelay}><span className="text-gradient">{gradient}</span></BotHighlight> : <span className="text-gradient">{gradient}</span>}
          </>
        )}
      </Tag>
      {lead && <p className={`lead mt-5 text-soft ${center ? 'mx-auto' : ''}`}>{lead}</p>}
    </Reveal>
  )
}
