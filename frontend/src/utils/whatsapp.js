import { mergeSite } from '../hooks/useSite.js'
import { getState } from '../services/siteService.js'

// The number may be overridden in the admin panel; read it at call time so links are always current.
export const whatsappLink = (text = 'Hi LAX360 Pvt Ltd, I would like to discuss a requirement.') =>
  `https://wa.me/${mergeSite(getState().settings).whatsappNumber}?text=${encodeURIComponent(text)}`
