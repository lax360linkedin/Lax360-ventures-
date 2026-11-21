import { useSearchParams } from 'react-router-dom'
import PzPage from './PzPage.jsx'
import LeaderboardView from '../components/LeaderboardView.jsx'
import { BackLink, PzHeading } from '../components/parts.jsx'

export default function PlayZoneLeaderboard() {
  const [params] = useSearchParams()
  return (
    <PzPage path="/play-zone/leaderboard" title="Play Zone Leaderboard" description="The LAX360 Play Zone leaderboard: daily, weekly and all-time rankings for every game. Opens together with the games.">
      <div className="wrap py-10 md:py-16">
        <BackLink />
        <div className="mt-8"><PzHeading as="h1" eyebrow="Leaderboard" title="Who is on top?" lead="Pick a board and a time period. Every score here was verified by the LAX360 server; guests can browse, and signed-in players appear with their nickname and avatar only." /></div>
        <div className="mt-10"><LeaderboardView initialGame={params.get('game')} /></div>
      </div>
    </PzPage>
  )
}
