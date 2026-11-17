import { Briefcase, Building2, CalendarDays, Globe, Headset, Link2, Mail, MapPin, MessageCircle, Phone, Users } from 'lucide-react'
import SocialIcon from './SocialIcon.jsx'

/** The generic icons an administrator can give a custom platform or "other" link (the same names the server accepts). */
export const GENERIC_ICONS = { globe: Globe, link: Link2, mail: Mail, phone: Phone, message: MessageCircle, 'map-pin': MapPin, briefcase: Briefcase, headset: Headset, calendar: CalendarDays, users: Users }

/** The icon of a social link or contact detail: the platform's official mark for social links and WhatsApp, a consistent line icon for everything else. */
export default function ChannelIcon({ channel, className = 'size-4', strokeWidth = 1.75 }) {
  const { kind, type, icon } = channel
  if (kind === 'social') {
    if (type === 'custom' && GENERIC_ICONS[icon]) { const G = GENERIC_ICONS[icon]; return <G className={className} strokeWidth={strokeWidth} aria-hidden="true" /> }
    return <SocialIcon platform={type} className={className} />
  }
  if (type === 'whatsapp') return <SocialIcon platform="whatsapp" className={className} />
  const Icon = type === 'phone' ? Phone : type === 'email' ? Mail : type === 'address' ? MapPin : type === 'branch' ? Building2 : type === 'enquiry' ? Headset : GENERIC_ICONS[icon] || Link2
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}

/** Opens in a new tab only for real web pages (not tel: / mailto: / an address). */
export const opensNewTab = (c) => /^https?:/.test(c.href || '')
