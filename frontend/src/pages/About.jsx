import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowUpRight, Award, Blocks, Bot, Briefcase, Check, ClipboardList, Code2, Eye, GraduationCap, HeartHandshake, Layers, Lightbulb, Megaphone,
  MessagesSquare, Plug, RefreshCw, ShieldCheck, Sparkles, Target, Users,
} from 'lucide-react'
import PageContainer from '../components/layout/PageContainer.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import BotHighlight from '../components/ui/BotHighlight.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Button from '../components/ui/Button.jsx'
import ContactCta from '../components/sections/ContactCta.jsx'
import { AboutIntro, AboutMore, useAboutBlocks } from '../components/cms/AboutBlocks.jsx'
import { useAboutSections } from '../hooks/useCmsPages.js'
import { useSite } from '../hooks/useSite.js'
import { allDivisions } from '../data/services.js'
import { divisionIcons } from '../utils/divisionIcons.js'

// Built-in About content (LAX360 Pvt Ltd). Introduction, story steps (with their pictures), vision, mission and values can be replaced, and any section hidden,
// in the admin panel (Website content > About Us content / About page sections). No dates, figures, awards or achievements are claimed anywhere on this page.
// Photographs (Unsplash, see public/assets/about/CREDITS.md): every picture on this page is used once.
const P = (name) => `/assets/about/${name}.webp`
const MISSION = 'To deliver practical and purpose-driven technology and digital solutions by understanding business requirements, applying relevant expertise, and focusing on quality and continuous improvement.'
const VISION = 'To grow as a trusted technology and digital solutions organisation, bringing together multiple areas of expertise and helping businesses adapt, innovate, and progress through technology.'

const INTRO = [
  'We work across software and IT services, artificial intelligence, digital marketing, and related technology services. By bringing these areas together, we help businesses improve their digital presence, streamline their operations, and approach technical challenges with the right solutions.',
  'At LAX360, we believe technology should serve a clear purpose. Every project begins with understanding the actual requirement, identifying the right approach, and developing a solution that aligns with the client’s objectives.',
  'Our focus is on building meaningful solutions through practical thinking, technical knowledge, and continuous improvement.',
]

const story = [
  { title: 'Where it started', caption: 'Ideas on the table', img: P('story-1'), text: 'LAX360 was established with an objective of bringing different technology and digital capabilities together under one organisation.' },
  { title: 'What we recognised', caption: 'Listening first', img: P('story-2'), text: 'We recognised that businesses often need more than one type of technical support. From developing software applications and websites to adopting AI-powered solutions and strengthening digital marketing, each business has different challenges.' },
  { title: 'What it inspired', caption: 'Better together', img: P('story-3'), text: 'This inspired us to build an organisation that brings these capabilities together and approaches each requirement with practical thinking.' },
  { title: 'Where we are today', caption: 'Exploring what is next', img: P('story-4'), text: 'Today, LAX360 continues to work towards providing relevant technology and digital solutions while exploring new tools, methods, and opportunities to improve the way businesses work.' },
  { title: 'What drives us', caption: 'Always learning', img: P('story-5'), text: 'Our journey is driven by learning, adapting, and creating solutions that have a clear purpose.' },
]

const motto = [
  { word: 'Innovate', icon: Lightbulb, text: 'Explore practical ideas and modern technologies to address real-world requirements.' },
  { word: 'Integrate', icon: Blocks, text: 'Bring together suitable tools, systems, and capabilities to create connected solutions.' },
  { word: 'Inspire', icon: Sparkles, text: 'Encourage continuous learning, improvement, and new possibilities through technology.' },
]

const expertise = allDivisions.map((d, i) => ({ letter: String.fromCharCode(65 + i), icon: divisionIcons[d.slug], title: d.name, to: `/services#${d.slug}`, img: d.photo, text: d.short }))

const features = [
  { icon: Layers, title: 'Multi-Domain Expertise', text: 'Capabilities across software, AI, and digital marketing.' },
  { icon: ClipboardList, title: 'Requirement-Based Solutions', text: 'We understand each requirement before identifying and recommending a suitable solution.' },
  { icon: Plug, title: 'Technology Integration', text: 'We explore suitable tools, platforms, APIs, and technologies to connect systems and workflows where required.' },
  { icon: Briefcase, title: 'Business-Oriented Thinking', text: 'We consider the client’s actual objectives and operational requirements while planning solutions.' },
  { icon: GraduationCap, title: 'Adaptability & Continuous Learning', text: 'We keep exploring emerging technologies and improving our technical knowledge to stay relevant.' },
  { icon: ShieldCheck, title: 'Quality-Focused Development', text: 'We emphasise structured development, testing, review, and improvements throughout the project lifecycle.' },
]

const values = [
  { icon: Lightbulb, title: 'Innovation', text: 'We remain open to new ideas and explore better ways to solve problems.' },
  { icon: Award, title: 'Quality', text: 'We focus on delivering work that meets the defined requirements and quality expectations.' },
  { icon: MessagesSquare, title: 'Transparency', text: 'We believe in clear communication, honest recommendations, and realistic commitments.' },
  { icon: HeartHandshake, title: 'Commitment', text: 'We take responsibility for our assigned work and aim to complete it with care and consistency.' },
  { icon: Users, title: 'Collaboration', text: 'We value communication and cooperation between our team, clients, and project stakeholders.' },
  { icon: RefreshCw, title: 'Continuous Improvement', text: 'We learn from every project and continuously look for ways to improve our work.' },
]

const stages = [
  { icon: ClipboardList, title: 'Business requirement', text: 'Start from the problem, not the tool.' },
  { icon: Layers, title: 'Technology selection', text: 'Choose what fits the need.' },
  { icon: Code2, title: 'Development', text: 'Build, test and review.' },
  { icon: RefreshCw, title: 'Continuous improvement', text: 'Keep learning and refining.' },
]
const principles = [
  { stage: 0, text: 'Understand the requirement before selecting a technology.' },
  { stage: 1, text: 'Choose tools and platforms based on project needs.' },
  { stage: 1, text: 'Consider usability, performance, and maintainability.' },
  { stage: 2, text: 'Build with integration and future improvements in mind.' },
  { stage: 2, text: 'Test and review solutions before delivery.' },
  { stage: 3, text: 'Continue learning and adapting as technology evolves.' },
]

const EASE = [0.2, 0.8, 0.2, 1]

/** A hand-drawn stroke that draws itself once when it scrolls into view (static under reduced motion). */
function Drawn({ d, className = '', stroke = 'currentColor', width = 3, delay = 0, viewBox }) {
  const reduce = useReducedMotion()
  return (
    <svg viewBox={viewBox} className={className} fill="none" aria-hidden="true" focusable="false">
      {reduce ? <path d={d} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
        : <m.path d={d} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay, ease: 'easeOut' }} />}
    </svg>
  )
}

/** A white photo print with tape and a handwritten-style caption. */
function Print({ src, alt = '', caption, rotate = -2, className = '', eager = false, sizes }) {
  return (
    <figure className={`relative bg-white p-2 shadow-[0_24px_50px_-24px_rgba(76,29,149,0.55)] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02] ${caption ? 'pb-9' : ''} ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 -rotate-3 bg-violet-200/80 dark:bg-sky-200/70" />
      <img src={src} alt={alt} width="1000" height="800" sizes={sizes} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" className="aspect-[5/4] w-full object-cover" />
      {caption && <figcaption className="absolute inset-x-0 bottom-2 text-center font-display text-sm italic text-violet-900/80 dark:text-slate-700">{caption}</figcaption>}
    </figure>
  )
}

/** Hero: bright surface; the headline and buttons on the left, a collage of three real photographs (office, colleagues, code) on the right with drawn accents. */
function AboutHero() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [pt, setPt] = useState({ x: 0, y: 0 })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const shapeY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60])
  const rise = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } })
  const onMove = (e) => {
    if (reduce || e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    setPt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 })
  }
  const depth = (k) => ({ transform: `translate3d(${pt.x * k}px, ${pt.y * k}px, 0)`, transition: 'transform 0.4s ease-out' })
  return (
    <section ref={ref} aria-labelledby="about-title" className="hero-light relative isolate overflow-hidden border-b border-edge bg-gradient-to-b from-white via-violet-50/60 to-white text-fg dark:from-night dark:via-base2 dark:to-night">
      <m.div style={{ y: shapeY }} aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-32 top-10 size-[26rem] rounded-full bg-gradient-to-br from-violet-200/70 to-fuchsia-100/40 blur-3xl dark:from-sky-500/15 dark:to-transparent" />
        <div className="absolute -right-24 top-0 size-[30rem] rounded-full bg-gradient-to-bl from-sky-200/60 to-violet-200/40 blur-3xl dark:from-sky-400/10 dark:to-transparent" />
      </m.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgb(var(--glow)/0.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_35%,#000,transparent_62%)]" />

      <div className="wrap grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-16">
        <div className="lg:col-span-6">
          <m.nav {...rise(0.05)} aria-label="Breadcrumb" className="text-sm text-soft">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="transition-colors hover:text-lav">Home</Link></li>
              <li aria-hidden="true" className="text-lav">›</li>
              <li aria-current="page" className="font-semibold text-fg">About Us</li>
            </ol>
          </m.nav>
          <m.p {...rise(0.12)} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-edge-strong bg-white/85 dark:bg-glass px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lav backdrop-blur-md">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgb(var(--glow2)/0.6)]" />About LAX360
          </m.p>
          <m.h1 {...rise(0.2)} id="about-title" className="h1 mt-5 !text-[clamp(2.4rem,5vw,4.6rem)]">
            Technology That Connects{' '}
            <span className="relative inline-block">
              <BotHighlight delay={0.9}><span className="text-gradient">Ideas With Possibilities.</span></BotHighlight>
            </span>
          </m.h1>
          <m.p {...rise(0.3)} className="lead mt-7 max-w-xl text-soft">LAX360 Pvt Ltd is a technology and digital solutions company focused on helping businesses turn their ideas and requirements into practical solutions.</m.p>
          <m.div {...rise(0.4)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/contact" arrow>Start a Conversation</Button>
            <Button to="/services" variant="secondary" className="bg-white/85 dark:bg-glass">Explore Our Services</Button>
          </m.div>
        </div>

        <m.div {...rise(0.3)} className="lg:col-span-6">
          <div className="relative mx-auto aspect-[6/5] w-full max-w-[24rem] sm:max-w-xl" onPointerMove={onMove} onPointerLeave={() => setPt({ x: 0, y: 0 })}>
            <div className="absolute left-0 top-[6%] w-[66%]" style={depth(8)}><Print src={P('hero-office')} caption="Where ideas meet practice" rotate={-2.5} eager sizes="(min-width: 1024px) 24rem, 60vw" /></div>
            <div className="absolute right-0 top-0 w-[38%]" style={depth(16)}><Print src={P('hero-colleagues')} rotate={3} eager className="[&_img]:aspect-[3/4]" sizes="(min-width: 1024px) 14rem, 34vw" /></div>
            <div className="absolute bottom-0 right-[8%] w-[50%]" style={depth(12)}><Print src={P('hero-code')} rotate={2} sizes="(min-width: 1024px) 18rem, 44vw" /></div>
            <Drawn d="M30 70C10 30 60 4 110 12" viewBox="0 0 130 90" className="pointer-events-none absolute -left-2 bottom-[18%] h-16 w-24 text-accent/70" width={2.5} delay={0.6} />
            <Drawn d="M12 64L52 28M40 28h14v14" viewBox="0 0 70 70" className="pointer-events-none absolute left-[38%] top-[52%] hidden h-14 w-14 text-sky-500/70 dark:text-sky-300/70 sm:block" width={2.5} delay={0.9} />
            <span className="absolute -left-1 bottom-[8%] flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3.5 py-2 text-xs font-bold text-violet-900 dark:border-edge-strong dark:bg-night dark:text-fg shadow-[0_18px_40px_-18px_rgb(var(--glow)/0.6)] sm:text-sm">
              <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white dark:from-primary dark:to-accent"><Check className="size-3.5" aria-hidden="true" /></span>One accountable team
            </span>
          </div>
        </m.div>
      </div>
    </section>
  )
}

/** Our story as a visual journey: a hand-drawn path that draws itself down the page as you scroll, with a photo print, a numbered stop and the text of each chapter. */
function StoryJourney({ steps }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] })
  const drawHeight = useTransform(scrollYProgress, [0, 1], [0, 1000]) // how much of the 1000-unit-tall line is revealed
  const curve = 'M32 0C62 90 2 170 32 260S62 430 32 520S2 690 32 780S62 930 32 1000'
  return (
    <section className="border-y border-edge bg-gradient-to-b from-violet-50/60 via-transparent to-violet-50/40 dark:from-sky-400/[0.05] dark:to-sky-400/[0.04]" aria-labelledby="story-title">
      <div className="wrap section">
        <SectionHeading id="story-title" eyebrow="Our story" title="Built Around Ideas." gradient="Driven by Technology." center />
        <div ref={ref} className="relative mt-12">
          <svg viewBox="0 0 64 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-1/2 hidden h-full w-16 -translate-x-1/2 md:block" fill="none" aria-hidden="true" focusable="false">
            <path d={curve} stroke="var(--color-edge-strong)" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* The line "draws itself" by revealing it through a clip that grows down the timeline. (Animating pathLength does not work together with
                non-scaling-stroke: the dash is then measured in screen pixels, so only a short stub of the line was ever drawn.) */}
            <defs><clipPath id="story-reveal"><m.rect x="-10" y="0" width="84" height={reduce ? 1000 : drawHeight} /></clipPath></defs>
            <path d={curve} stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath="url(#story-reveal)" />
          </svg>
          <span aria-hidden="true" className="absolute inset-y-0 left-5 w-px bg-gradient-to-b from-lav to-accent md:hidden" />
          <ol className="relative space-y-12 md:space-y-20">
            {steps.map((step, i) => {
              const photoLeft = i % 2 === 0
              return (
                <li key={step.title} className="relative grid items-center gap-6 pl-14 md:grid-cols-[1fr_4rem_1fr] md:gap-x-8 md:pl-0">
                  <span className="absolute left-0 top-0 z-10 flex size-10 items-center justify-center rounded-full border-2 border-accent bg-white font-display text-base font-bold text-violet-700 dark:bg-night dark:text-lav shadow-[0_8px_20px_-8px_rgb(var(--glow)/0.7)] md:static md:col-start-2 md:row-start-1 md:size-14 md:justify-self-center md:text-xl">{i + 1}</span>
                  <Reveal x={photoLeft ? -30 : 30} y={0} className={`md:row-start-1 ${photoLeft ? 'md:col-start-1' : 'md:col-start-3'}`}>
                    <Print src={step.img} caption={step.caption} rotate={photoLeft ? -2.5 : 2.5} className="mx-auto max-w-sm md:max-w-md" sizes="(min-width: 768px) 28rem, 90vw" />
                  </Reveal>
                  <Reveal x={photoLeft ? 30 : -30} y={0} delay={0.08} className={`md:row-start-1 ${photoLeft ? 'md:col-start-3' : 'md:col-start-1 md:text-right'}`}>
                    <p className="eyebrow text-lav">Chapter {i + 1}</p>
                    <h3 className="relative mt-1 inline-block font-display text-2xl font-semibold md:text-3xl">
                      {step.title}
                    </h3>
                    <p className={`mt-4 max-w-lg text-lg text-soft ${photoLeft ? '' : 'md:ml-auto'}`}>{step.text}</p>
                  </Reveal>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}

/** Motto: the three words light up as the visitor hovers, focuses or taps the matching tile. */
function Motto() {
  const [i, setI] = useState(0)
  return (
    <section className="hero-light relative overflow-hidden bg-gradient-to-br from-violet-100 via-white to-sky-100 text-fg dark:from-night dark:via-base2 dark:to-night" aria-labelledby="motto-title">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-violet-300/40 blur-3xl dark:bg-sky-500/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-400/10" />
      <div className="wrap section relative">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="eyebrow mb-4 flex items-center justify-center gap-3 text-lav"><span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-transparent to-accent" />Our motto<span aria-hidden="true" className="h-px w-8 bg-gradient-to-l from-transparent to-accent" /></p>
          <h2 id="motto-title" className="font-display text-[clamp(2.1rem,5.6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
            {motto.map((x, k) => (
              <span key={x.word} className={`mr-[0.25em] inline-block transition-all duration-500 ${k === i ? 'text-gradient' : 'text-fg/45'}`}>{x.word}.</span>
            ))}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-soft">We believe in exploring better ideas, connecting the right technologies, and creating solutions that make a meaningful difference.</p>
        </Reveal>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {motto.map(({ word, icon: Icon, text }, k) => (
            <Reveal as="li" key={word} delay={k * 0.08}>
              <button type="button" onMouseEnter={() => setI(k)} onFocus={() => setI(k)} onClick={() => setI(k)} aria-pressed={k === i}
                className={`group relative flex h-full w-full flex-col items-start overflow-hidden rounded-3xl border p-6 text-left transition-all duration-500 md:p-8 ${k === i ? 'border-edge-strong bg-glass-strong shadow-[0_24px_60px_-28px_rgb(var(--glow)/0.9)] md:-translate-y-1' : 'border-edge bg-glass hover:border-edge-strong'}`}>
                <span aria-hidden="true" className={`pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/30 blur-2xl transition-opacity duration-500 ${k === i ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`relative flex size-14 items-center justify-center rounded-2xl text-white transition-all duration-500 ${k === i ? 'scale-110 bg-gradient-to-br from-primary to-accent shadow-[0_0_28px_-4px_rgb(var(--glow2)/0.9)]' : 'bg-primary/40'}`}><Icon className="size-7" aria-hidden="true" /></span>
                <span className="relative mt-5 font-display text-2xl font-semibold">{word}</span>
                <span className="relative mt-2 text-soft">{text}</span>
              </button>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Mission and vision as two photo panels. */
function Purpose({ blocks }) {
  const panels = [
    { icon: Target, label: 'Our Mission', title: blocks.mission[0]?.title, text: blocks.mission[0]?.data.text || MISSION, img: blocks.mission[0]?.data.image || P('mission'), tint: 'from-violet-100/80 to-white dark:from-sky-400/10 dark:to-transparent' },
    { icon: Eye, label: 'Our Vision', title: blocks.vision[0]?.title, text: blocks.vision[0]?.data.text || VISION, img: blocks.vision[0]?.data.image || P('vision'), tint: 'from-sky-100/80 to-white dark:from-sky-400/10 dark:to-transparent' },
  ]
  return (
    <section className="wrap section" aria-label="Our mission and vision">
      <div className="grid gap-6 lg:grid-cols-2">
        {panels.map(({ icon: Icon, label, title, text, img, tint }, i) => (
          <Reveal key={label} delay={i * 0.1}>
            <article className="glass group h-full overflow-hidden transition-transform duration-500 hover:-translate-y-1">
              <div className="relative overflow-hidden">
                <img src={img} alt="" width="1100" height="800" loading="lazy" decoding="async" className="aspect-[16/8] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-5 flex items-center gap-3 text-white">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg"><Icon className="size-6" aria-hidden="true" /></span>
                  <span className="font-display text-2xl font-semibold [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">{label}</span>
                </span>
              </div>
              <div className={`hero-light bg-gradient-to-b ${tint} p-6 md:p-8`}>
                {title && <p className="font-semibold text-lav">{title}</p>}
                <p className="mt-1 text-lg leading-relaxed text-soft">{text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/** Core expertise: five photo cards (a different photograph each) linking to the matching part of the Services page. */
function Expertise() {
  return (
    <section className="border-y border-edge bg-base2/50" aria-labelledby="expertise-title">
      <div className="wrap section">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="expertise-title" eyebrow="Our core expertise" title="Different Capabilities." gradient="One Technology Partner."
            lead="Our expertise covers multiple areas of technology and digital services. This allows us to understand different business requirements and identify suitable solutions across domains." />
          <Reveal delay={0.1} className="shrink-0"><Button to="/services" variant="secondary" arrow>Explore all services</Button></Reveal>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {expertise.map(({ letter, icon: Icon, title, text, to, img }, i) => (
            <Reveal as="li" key={title} delay={(i % 3) * 0.07} className={`lg:col-span-2`}>
              <Link to={to} className="glass-flat lift group flex h-full flex-col overflow-hidden">
                <span className="relative block overflow-hidden">
                  <img src={img} alt="" width="1000" height="800" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-xl bg-white font-display text-sm font-bold text-violet-700 shadow-md dark:bg-night dark:text-lav">{letter}</span>
                  <span className="absolute bottom-3 right-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon className="size-5" aria-hidden="true" /></span>
                </span>
                <span className="flex flex-1 flex-col gap-2 p-6">
                  <span className="font-display text-xl font-semibold leading-tight transition-colors group-hover:text-lav">{title}</span>
                  <span className="flex-1 text-soft">{text}</span>
                  <span className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-lav">Learn more <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Features: a tall photograph beside an open two-column list (no card boxes), so it reads differently from the other sections. */
function Features() {
  return (
    <section className="wrap section" aria-labelledby="features-title">
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal x={-24} y={0} className="lg:sticky lg:top-28 lg:col-span-5">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <img src={P('features')} alt="" width="800" height="900" loading="lazy" decoding="async" className="aspect-[4/4.2] w-full rounded-[2rem] border border-edge-strong object-cover shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.6)]" />
            <span aria-hidden="true" className="absolute -bottom-4 -right-3 -z-10 h-full w-full rounded-[2rem] border-2 border-dashed border-lav/40" />
          </div>
        </Reveal>
        <div className="lg:col-span-7">
          <SectionHeading id="features-title" eyebrow="Our features" title="What Defines the" gradient="Way We Work."
            lead="Our approach combines technical capabilities with practical business understanding. These are the key strengths that guide our work." />
          <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={(i % 2) * 0.06} className="group border-t border-edge pt-5 transition-colors duration-300 hover:border-lav">
                <span className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-glass text-lav ring-1 ring-edge-strong transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-accent group-hover:text-white group-hover:ring-transparent"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="font-display text-xs font-bold text-soft">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold leading-tight">{title}</h3>
                <p className="mt-1.5 text-soft">{text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Values: a wide teamwork photograph with the heading laid over it, then six open value blocks. */
function Values({ blocks }) {
  const list = blocks.values.length ? blocks.values.map((b, i) => ({ icon: values[i % values.length].icon, title: b.title, text: b.data.text })) : values
  return (
    <section className="border-y border-edge bg-glass" aria-labelledby="values-title">
      <div className="wrap section">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-edge-strong">
            <img src={P('values')} alt="" width="1000" height="720" loading="lazy" decoding="async" className="h-56 w-full object-cover sm:h-72 lg:h-80" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-violet-950/80 via-violet-900/45 to-transparent dark:from-night/90 dark:via-night/55" />
            <div className="absolute inset-0 flex flex-col justify-center p-6 text-white sm:p-10 lg:p-14">
              <p className="eyebrow flex items-center gap-3 text-violet-200 dark:text-lav"><span aria-hidden="true" className="h-px w-8 bg-current" />Our values</p>
              <h2 id="values-title" className="mt-3 max-w-md font-display text-[clamp(1.9rem,4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.02em]">Principles That <span className="text-violet-200 dark:text-lav">Guide Us.</span></h2>
              <p className="mt-3 hidden max-w-md text-violet-100/90 dark:text-slate-200 sm:block">Our values shape how we understand requirements, approach projects, communicate, and work towards delivering solutions.</p>
            </div>
          </div>
        </Reveal>
        <p className="mt-6 text-soft sm:hidden">Our values shape how we understand requirements, approach projects, communicate, and work towards delivering solutions.</p>
        <ul className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={(i % 3) * 0.06} className="group relative pt-6">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-lav via-accent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon className="size-6" aria-hidden="true" /></span>
              <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-1.5 text-soft">{text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Technology approach: a loop of four stages around a real photograph (click a stage or a principle to link them). Different from the homepage's six-step project process. */
function TechApproach() {
  const [stage, setStage] = useState(0)
  const pos = ['left-1/2 top-[0%] -translate-x-1/2', 'right-[0%] top-1/2 -translate-y-1/2', 'bottom-[0%] left-1/2 -translate-x-1/2', 'left-[0%] top-1/2 -translate-y-1/2']
  return (
    <section className="relative overflow-hidden" aria-labelledby="tech-title">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="wrap section relative grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal className="lg:col-span-5">
          <div className="relative mx-auto aspect-square w-full max-w-sm sm:max-w-md">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true" focusable="false">
              <circle cx="50" cy="50" r="36" stroke="var(--color-edge-strong)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="36" stroke="var(--color-lav)" strokeWidth="0.7" strokeDasharray="4 6" className="origin-center motion-safe:animate-[spin_40s_linear_infinite]" />
            </svg>
            <img src={P('approach')} alt="" width="1100" height="900" loading="lazy" decoding="async" className="absolute left-1/2 top-1/2 size-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white object-cover shadow-[0_20px_50px_-20px_rgb(var(--glow)/0.7)]" />
            {stages.map(({ icon: Icon, title }, k) => (
              <button key={title} type="button" onClick={() => setStage(k)} onMouseEnter={() => setStage(k)} onFocus={() => setStage(k)} aria-pressed={k === stage}
                className={`absolute flex w-28 flex-col items-center gap-1.5 text-center ${pos[k]}`}>
                <span className={`flex size-12 items-center justify-center rounded-2xl border text-white transition-all duration-500 sm:size-14 ${k === stage ? 'scale-110 border-transparent bg-gradient-to-br from-primary to-accent shadow-[0_0_30px_-4px_rgb(var(--glow2)/0.9)]' : 'border-edge-strong bg-base2 text-lav'}`}><Icon className="size-5 sm:size-6" aria-hidden="true" /></span>
                <span className={`rounded-full bg-night/80 px-2 py-0.5 text-[0.7rem] font-semibold leading-tight transition-colors sm:text-xs ${k === stage ? 'text-fg' : 'text-soft'}`}>{title}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-soft" aria-live="polite">{stages[stage].text}</p>
        </Reveal>

        <div className="lg:col-span-7">
          <SectionHeading id="tech-title" eyebrow="Our approach to technology" title="Technology" gradient="With a Purpose." />
          <Reveal delay={0.08} className="mt-5 max-w-2xl space-y-3 text-lg text-soft">
            <p>We do not believe in choosing technology simply because it is new or popular. We believe the right technology is the one that addresses the actual requirement.</p>
            <p>Our approach is based on understanding the problem, evaluating suitable technologies, and developing solutions that align with the intended outcome.</p>
          </Reveal>
          <p className="mt-6 font-display text-lg font-semibold">Our guiding principles</p>
          <ul className="mt-3 space-y-2.5">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.text} delay={i * 0.05}>
                <button type="button" onClick={() => setStage(p.stage)} aria-pressed={p.stage === stage}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${p.stage === stage ? 'border-edge-strong bg-glass-strong' : 'border-edge bg-glass/50 hover:border-edge-strong'}`}>
                  <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${p.stage === stage ? 'bg-gradient-to-br from-primary to-accent text-white' : 'bg-primary/30 text-lav'}`}>{i + 1}</span>
                  <span className={p.stage === stage ? 'text-fg' : 'text-soft'}>{p.text}</span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="wrap pb-12 md:pb-16" aria-labelledby="about-cta-title">
      <Reveal>
        <div className="glass relative grid overflow-hidden lg:grid-cols-12">
          <div className="relative p-8 md:p-12 lg:col-span-7 lg:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 size-72 rounded-full bg-primary/25 blur-3xl" />
            <h2 id="about-cta-title" className="relative font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-tight tracking-[-0.02em]">Let&rsquo;s Build <span className="text-gradient">Something Together.</span></h2>
            <p className="relative mt-5 max-w-xl text-lg text-soft">Have an idea, a business challenge, or a technology requirement? Let&rsquo;s understand your needs and explore how the right technology and digital solutions can help you move forward.</p>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/contact" arrow className="w-full sm:w-auto">Start a Conversation</Button>
              <Button to="/services" variant="secondary" className="w-full sm:w-auto">Explore Our Services</Button>
            </div>
          </div>
          <div className="relative min-h-56 lg:col-span-5">
            <img src={P('cta')} alt="" width="1400" height="700" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[var(--color-night)]/40 via-transparent to-transparent" />
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default function About() {
  const blocks = useAboutBlocks()
  const site = useSite()
  const show = useAboutSections()
  const steps = blocks.story.length
    ? blocks.story.map((b, i) => ({ title: b.title, text: String(b.data.text || ''), caption: b.data.role || story[i % story.length].caption, img: b.data.image || story[i % story.length].img }))
    : story
  return (
    <PageContainer
      path="/about"
      title="About Us"
      description="LAX360 Pvt Ltd is a technology and digital solutions company bringing software, AI and digital marketing together to turn business requirements into practical solutions."
    >
      {/* 1. About LAX360 */}
      <AboutHero />

      {blocks.intro.length > 0 ? <AboutIntro blocks={blocks} /> : (
        <section className="wrap section grid items-center gap-10 lg:grid-cols-12 lg:gap-14" aria-label="About LAX360">
          <Reveal x={-24} y={0} className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <img src={P('who')} alt="" width="1100" height="900" loading="lazy" decoding="async" className="aspect-[5/4] w-full rounded-[2rem] border border-edge-strong object-cover shadow-[0_30px_70px_-30px_rgb(var(--glow)/0.6)]" />
              <span className="hero-light absolute -bottom-5 right-4 flex items-center gap-3 rounded-2xl border border-edge-strong bg-white dark:bg-night px-4 py-3 shadow-[0_18px_40px_-18px_rgb(var(--glow)/0.6)]">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white"><Sparkles className="size-5" aria-hidden="true" /></span>
                <span><span className="block font-display text-base font-bold leading-tight">LAX360 Pvt Ltd</span><span className="block text-sm font-semibold text-lav">{site.tagline}</span></span>
              </span>
            </div>
          </Reveal>
          <div className="lg:col-span-7">
            <Reveal className="space-y-5 text-lg text-soft">{INTRO.map((p) => <p key={p}>{p}</p>)}</Reveal>
            <ul className="mt-7 flex flex-wrap gap-2.5" aria-label="Where we work">
              {[[Code2, 'Software & IT services'], [Bot, 'Artificial intelligence'], [Megaphone, 'Digital marketing']].map(([Icon, label]) => (
                <li key={label} className="tag"><Icon className="size-3.5 text-lav" aria-hidden="true" /> {label}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {show('story') && <StoryJourney steps={steps} />}
      {show('motto') && <Motto />}
      {show('purpose') && <Purpose blocks={blocks} />}
      {show('expertise') && <Expertise />}
      {show('features') && <Features />}
      {show('values') && <Values blocks={blocks} />}
      {show('technology') && <TechApproach />}

      {/* team, milestones and gallery blocks added in the admin panel */}
      <AboutMore blocks={blocks} skipVisionMission skipValues />

      {show('cta') && <FinalCta />}
    </PageContainer>
  )
}
