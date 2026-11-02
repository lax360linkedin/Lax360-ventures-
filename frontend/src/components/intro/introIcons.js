// The 26 service icons that rain down in the welcome intro (decorative; the tiles are aria-hidden).
//
// - Generic concepts use the project's existing Lucide icon set.
// - Product logos (Claude, Google Gemini, Cursor, GitHub Copilot, Google Ads, Meta) use the official vector paths from the `simple-icons`
//   package (CC0 data; the marks remain trademarks of their owners and are used here only to depict the tools/platforms we work with).
// - OpenAI / ChatGPT has no mark in that package, so it gets a generic Lucide chat icon rather than a redrawn logo.
import {
  BarChart3, Bot, BrainCircuit, Box, Building2, Cloud, Code2, Cog, Database, DraftingCompass, Globe, Megaphone, MessageSquareText, MessagesSquare,
  PenTool, Search, Share2, Smartphone, Sparkles, Workflow,
} from 'lucide-react'
import { siClaude, siCursor, siGithubcopilot, siGoogleads, siGooglegemini, siMeta } from 'simple-icons'

const lucide = (group, Icon, color) => ({ group, Icon, color })
const brand = (group, icon) => ({ group, path: icon.path, color: `#${icon.hex}` })

export const INTRO_ICONS = [
  // Software & development
  lucide('software', Code2, '#7c3aed'), // software development
  lucide('software', Globe, '#6d28d9'), // web development
  lucide('software', Smartphone, '#8b5cf6'), // mobile apps
  lucide('software', PenTool, '#a855f7'), // UI / UX design
  lucide('software', Database, '#5b21b6'), // databases
  lucide('software', Cloud, '#3b82f6'), // cloud systems
  // AI & automation
  lucide('ai', Bot, '#2563eb'), // AI agents
  lucide('ai', Workflow, '#0ea5e9'), // AI automation
  lucide('ai', MessagesSquare, '#6366f1'), // chatbots
  lucide('ai', BrainCircuit, '#7c3aed'), // machine learning
  lucide('ai', Sparkles, '#d946ef'), // generative AI
  // AI developer tools
  brand('tools', siClaude),
  lucide('tools', MessageSquareText, '#10a37f'), // ChatGPT / OpenAI (generic: no official mark in the icon set)
  brand('tools', siGooglegemini),
  brand('tools', siCursor),
  brand('tools', siGithubcopilot),
  // Digital marketing
  lucide('marketing', Megaphone, '#f97316'), // digital marketing
  lucide('marketing', Search, '#ea580c'), // SEO
  brand('marketing', siGoogleads),
  brand('marketing', siMeta),
  lucide('marketing', Share2, '#ec4899'), // social media marketing
  lucide('marketing', BarChart3, '#f59e0b'), // analytics
  // CAD & engineering
  lucide('cad', Cog, '#0d9488'), // mechanical CAD
  lucide('cad', Building2, '#0891b2'), // civil CAD
  lucide('cad', DraftingCompass, '#14b8a6'), // 2D drafting
  lucide('cad', Box, '#0284c7'), // 3D modelling
]
