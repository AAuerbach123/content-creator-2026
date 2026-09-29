import ReviewSeite from './ReviewSeite'

export default async function Review({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ReviewSeite token={token} />
}
