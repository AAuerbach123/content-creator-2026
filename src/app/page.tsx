import { redirect } from 'next/navigation'

// Startseite = Cockpit 2027. Die bisherige Oberfläche liegt unter /erweitert.
export default function Home() {
  redirect('/cockpit')
}
