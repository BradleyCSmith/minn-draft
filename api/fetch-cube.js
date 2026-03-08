export default async function handler(req, res) {
  const { id } = req.query

  if (!id || typeof id !== 'string' || !/^[\w-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid cube id' })
  }

  try {
    const upstream = await fetch(
      `https://cubecobra.com/cube/download/plaintext/${id}`
    )
    if (!upstream.ok) {
      return res.status(502).json({ error: `CubeCobra returned ${upstream.status}` })
    }
    const text = await upstream.text()
    res.setHeader('Content-Type', 'text/plain')
    res.status(200).send(text)
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach CubeCobra' })
  }
}
