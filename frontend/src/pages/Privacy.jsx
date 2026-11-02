import LegalPage from '../components/sections/LegalPage.jsx'
import { legal } from '../data/legal.js'

export default function Privacy() {
  return <LegalPage doc={legal.privacy} path="/privacy" description="Draft privacy policy outline for LAX360 Ventures — pending legal review." />
}
