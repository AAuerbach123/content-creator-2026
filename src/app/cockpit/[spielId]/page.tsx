import SpielSeite from './SpielSeite'

export default async function Page({ params }: { params: Promise<{ spielId: string }> }) {
  const { spielId } = await params
  return <SpielSeite spielId={spielId} />
}
