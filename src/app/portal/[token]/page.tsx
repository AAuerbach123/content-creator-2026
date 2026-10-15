import './portal.css'
import PortalSeite from './PortalSeite'

export const metadata = {
  title: 'Korrekturportal · Telemedia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PortalSeite token={token} />
}
