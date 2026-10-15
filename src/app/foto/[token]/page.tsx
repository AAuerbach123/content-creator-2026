import '../../portal/[token]/portal.css'
import FotoSeite from './FotoSeite'

export const metadata = { title: 'Ihr Gewinnerfoto · Telemedia', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function Seite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <FotoSeite token={token} />
}
