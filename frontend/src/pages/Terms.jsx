import LegalPage from '../components/sections/LegalPage.jsx'
import { legal } from '../data/legal.js'

export default function Terms() {
  return <LegalPage doc={legal.terms} path="/terms" description="Draft terms of use outline for LAX360 Ventures — pending legal review." />
}
