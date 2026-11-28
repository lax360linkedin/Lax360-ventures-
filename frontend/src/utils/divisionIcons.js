import { Bot, Code2, GraduationCap, Layers, Server, Smartphone, TrendingUp, Workflow } from 'lucide-react'

// One consistent Lucide icon per service category (keyed by category slug).
const ICONS = {
  software: Code2,
  ai: Bot,
  growth: TrendingUp,
  headless: Server,
  automation: Workflow,
  mobile: Smartphone,
  education: GraduationCap,
  training: GraduationCap,
}
/** The icon of a division by its id; a division an administrator added gets a generic one. */
export const divisionIcons = new Proxy(ICONS, { get: (target, key) => target[key] || Layers })
