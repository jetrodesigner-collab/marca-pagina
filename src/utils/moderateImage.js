const VISION_KEY = import.meta.env.VITE_GOOGLE_VISION_KEY
const MONTHLY_LIMIT = 950
const BLOCKED_LEVELS = ['LIKELY', 'VERY_LIKELY']

function monthKey() {
  const now = new Date()
  return `vision_calls_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCallCount() {
  return parseInt(localStorage.getItem(monthKey()) || '0', 10)
}

function incrementCallCount() {
  const key = monthKey()
  localStorage.setItem(key, String(getCallCount() + 1))
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Modera uma imagem via Google Cloud Vision SafeSearch.
// Acima do limite mensal, aprova silenciosamente sem chamar a API.
export async function moderateImage(file) {
  if (import.meta.env.DEV) {
    console.log('Vision key:', VISION_KEY)
  }

  if (getCallCount() >= MONTHLY_LIMIT) {
    return { approved: true, skipped: true }
  }

  try {
    const base64 = await fileToBase64(file)
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
          }],
        }),
      }
    )
    const data = await res.json()

    if (!res.ok || data.error) {
      console.error('⚠️ moderateImage: Vision API error — moderação indisponível, aprovando sem checagem', res.status, data.error)
      return { approved: true, skipped: true }
    }

    incrementCallCount()

    const safe = data.responses?.[0]?.safeSearchAnnotation
    if (safe && (BLOCKED_LEVELS.includes(safe.adult) || BLOCKED_LEVELS.includes(safe.violence))) {
      return { approved: false, reason: 'Esta imagem não é permitida. Escolha uma capa adequada.' }
    }
    return { approved: true }
  } catch (err) {
    console.error('⚠️ moderateImage: erro de rede — moderação indisponível, aprovando sem checagem', err)
    return { approved: true, skipped: true }
  }
}
