const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_EDGE = 2400

const COMPANY_SUFFIXES = [
  'pvt ltd',
  'private limited',
  'ltd',
  'limited',
  'llp',
  'inc',
  'inc.',
  'corp',
  'corporation',
  'company',
  'co.',
  'co',
  'enterprises',
  'enterprise',
  'industries',
  'industry',
  'services',
  'solutions',
  'technologies',
  'technology',
  'systems',
  'consultancy',
  'consultants',
  'associates',
  'group',
  'traders',
  'trading',
  'international',
  'investments',
  'investment',
  'hospital',
  'clinic',
  'restaurant',
  'cafe',
  'foods',
  'motors',
  'builders',
  'developers',
  'agency',
  'agencies',
]

const DESIGNATION_WORDS = [
  'founder',
  'co-founder',
  'director',
  'managing director',
  'manager',
  'general manager',
  'assistant manager',
  'sales manager',
  'marketing manager',
  'hr manager',
  'manager hr',
  'manager - hr',
  'manager-hr',
  'proprietor',
  'owner',
  'partner',
  'ceo',
  'cto',
  'cfo',
  'coo',
  'president',
  'vice president',
  'vp',
  'executive',
  'sales executive',
  'business development',
  'business development manager',
  'consultant',
  'advisor',
  'engineer',
  'architect',
  'advocate',
  'lawyer',
  'doctor',
  'pediatrician',
  'intensivist',
  'surgeon',
  'physician',
  'dentist',
  'specialist',
  'designer',
  'accountant',
  'chartered accountant',
  'hr',
]

const QUALIFICATION_WORDS = [
  'mbbs',
  'md',
  'ms',
  'dnb',
  'dch',
  'bds',
  'mch',
  'frcs',
  'ca',
  'cs',
  'mba',
  'bba',
  'bcom',
  'mcom',
  'be',
  'b.e',
  'btech',
  'b.tech',
  'mtech',
  'm.tech',
  'phd',
  'fellow',
  'picu',
]

const ADDRESS_WORDS = [
  'road',
  'rd',
  'street',
  'st',
  'lane',
  'nagar',
  'colony',
  'building',
  'complex',
  'plaza',
  'floor',
  'office',
  'shop',
  'city',
  'near',
  'opp',
  'opposite',
  'behind',
  'beside',
  'above',
  'below',
  'sector',
  'phase',
  'park',
  'avenue',
  'chowk',
  'pune',
  'mumbai',
  'nagpur',
  'maharashtra',
]

const CATEGORY_RULES = [
  {
    category: 'Clinic',
    words: [
      'doctor',
      'dr.',
      'dr ',
      'clinic',
      'hospital',
      'medical',
      'pediatrician',
      'intensivist',
      'surgeon',
      'physician',
      'dentist',
      'healthcare',
    ],
  },
  {
    category: 'Restaurant',
    words: [
      'restaurant',
      'cafe',
      'food',
      'foods',
      'dining',
      'cuisine',
      'veg cuisine',
      'pure veg',
      'vegetarian',
      'hotel',
      'kitchen',
      'bakery',
    ],
  },
  {
    category: 'Financial Services',
    words: [
      'investment',
      'investments',
      'finance',
      'financial',
      'insurance',
      'wealth',
      'mutual fund',
      'portfolio',
      'securities',
    ],
  },
  {
    category: 'Professional Services',
    words: [
      'services',
      'consultancy',
      'consultants',
      'consulting',
      'solutions',
      'associates',
      'agency',
    ],
  },
]

function normalizeText(value = '') {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeLine(value = '') {
  return value
    .replace(/[|•●▪■◆]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhone(value = '') {
  let digits = value.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2)
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return digits
  }

  return ''
}

function isEmail(line) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(line)
}

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  )

  return match?.[0] || ''
}

function extractWebsite(text, email = '') {
  const withoutEmail = email
    ? text.replace(new RegExp(escapeRegExp(email), 'gi'), ' ')
    : text

  const matches = withoutEmail.match(
    /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s]*)?\b/gi
  )

  if (!matches) return ''

  const valid = matches.find((item) => {
    const value = item.toLowerCase()

    return (
      !value.includes('@') &&
      !value.endsWith('gmail.com') &&
      !value.endsWith('yahoo.com') &&
      !value.endsWith('outlook.com') &&
      !value.endsWith('hotmail.com')
    )
  })

  return valid || ''
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsAny(text, words) {
  const lower = text.toLowerCase()
  return words.some((word) => lower.includes(word))
}

function isLikelyPhoneLine(line) {
  if (
    /^\s*(?:mob(?:ile)?|phone|contact(?:\s*no\.?)?|tel(?:ephone)?)\s*:/i.test(
      line
    )
  ) {
    return true
  }

  const matches = line.match(
    /(?:\+?\s*91[\s.-]*)?0?[6-9](?:[\s.-]*\d){9}/g
  )

  return Boolean(matches?.length)
}

function isLikelyAddressLine(line) {
  const lower = line.toLowerCase()

  if (/\b\d{6}\b/.test(lower)) return true

  if (/\b\d{3}\s\d{3}\b/.test(lower)) return true

  if (containsAny(lower, ADDRESS_WORDS)) return true

  if (
    /\b(?:sr\.?\s*no|survey\s*no|plot\s*no|shop\s*no|office\s*no|floor)\b/i.test(
      line
    )
  ) {
    return true
  }

  return false
}

function scoreCompanyCandidate(line) {
  const clean = normalizeLine(line)
  const lower = clean.toLowerCase()

  if (!clean || clean.length < 2) return -100
  if (isEmail(clean)) return -100
  if (isLikelyPhoneLine(clean)) return -100
  if (isLikelyAddressLine(clean)) return -70

  let score = 0

  if (containsAny(lower, COMPANY_SUFFIXES)) score += 55

  if (
    /\b(?:pvt\.?\s*ltd\.?|private\s+limited|llp|limited|ltd\.?)\b/i.test(clean)
  ) {
    score += 50
  }

  if (
    /\b(?:services|solutions|industries|enterprises|group|international|investment|investments|consultancy|associates|restaurant|clinic|hospital)\b/i.test(
      clean
    )
  ) {
    score += 25
  }

  const wordCount = clean.split(/\s+/).length

  if (wordCount >= 2 && wordCount <= 8) score += 12
  if (clean.length >= 5 && clean.length <= 70) score += 8

  if (clean === clean.toUpperCase() && /[A-Z]/.test(clean)) {
    score += 7
  }

  if (containsAny(lower, DESIGNATION_WORDS)) score -= 35
  if (containsAny(lower, QUALIFICATION_WORDS)) score -= 35

  if (/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i.test(clean)) {
    score -= 40
  }

  return score
}

function looksLikeHumanName(line) {
  const clean = normalizeLine(line)

  if (!clean || clean.length < 3 || clean.length > 55) return false
  if (isEmail(clean)) return false
  if (isLikelyPhoneLine(clean)) return false
  if (isLikelyAddressLine(clean)) return false

  const lower = clean.toLowerCase()

  if (containsAny(lower, COMPANY_SUFFIXES)) return false
  if (containsAny(lower, DESIGNATION_WORDS)) return false
  if (containsAny(lower, QUALIFICATION_WORDS)) return false

  const stripped = clean
    .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|adv\.?)\s+/i, '')
    .trim()

  const words = stripped.split(/\s+/)

  if (words.length < 2 || words.length > 4) return false

  return words.every((word) =>
    /^[A-Za-z][A-Za-z.'-]*$/.test(word)
  )
}

function scorePersonCandidate(line, index, companyIndex) {
  if (!looksLikeHumanName(line)) return -100

  const clean = normalizeLine(line)

  let score = 40

  if (/^(dr\.?|mr\.?|mrs\.?|ms\.?|adv\.?)\s+/i.test(clean)) {
    score += 20
  }

  const words = clean
    .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|adv\.?)\s+/i, '')
    .split(/\s+/)

  if (words.length === 2 || words.length === 3) score += 12

  if (companyIndex >= 0) {
    const distance = Math.abs(index - companyIndex)

    if (distance <= 3) score += 14
    if (distance <= 1) score += 6
  }

  if (index <= 4) score += 8

  return score
}

function scoreDesignationCandidate(line, personIndex) {
  const clean = normalizeLine(line)
  const lower = clean.toLowerCase()

  if (!clean) return -100
  if (isEmail(clean)) return -100
  if (isLikelyPhoneLine(clean)) return -100
  if (isLikelyAddressLine(clean)) return -100

  let score = 0

  if (containsAny(lower, DESIGNATION_WORDS)) score += 60
  if (containsAny(lower, QUALIFICATION_WORDS)) score += 15

  if (personIndex >= 0) {
    const distance = Math.abs(personIndex - line.index)

    if (distance <= 2) score += 15
  }

  return score
}

function detectCategory(text) {
  const lower = text.toLowerCase()

  let bestCategory = ''
  let bestScore = 0

  for (const rule of CATEGORY_RULES) {
    let score = 0

    for (const word of rule.words) {
      if (lower.includes(word)) {
        score += word.includes(' ') ? 3 : 1
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestCategory = rule.category
    }
  }

  return bestScore > 0 ? bestCategory : ''
}

function mergeCompanyLines(lines) {
  const merged = [...lines]

  for (let i = 0; i < lines.length - 1; i += 1) {
    const current = normalizeLine(lines[i])
    const next = normalizeLine(lines[i + 1])

    if (!current || !next) continue

    const combined = `${current} ${next}`

    const currentScore = scoreCompanyCandidate(current)
    const nextScore = scoreCompanyCandidate(next)
    const combinedScore = scoreCompanyCandidate(combined)

    if (
      combinedScore >= currentScore + 15 &&
      combinedScore >= nextScore + 15 &&
      combined.length <= 90
    ) {
      merged.push(combined)
    }
  }

  return [...new Set(merged)]
}

function chooseCompany(lines) {
  const candidates = mergeCompanyLines(lines)
    .map((line) => ({
      line,
      score: scoreCompanyCandidate(line),
    }))
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]

  if (!best || best.score < 45) {
    return {
      value: '',
      confidence: 0,
      originalIndex: -1,
    }
  }

  const originalIndex = lines.findIndex((line) => {
    const normalized = normalizeLine(line)
    return best.line.includes(normalized)
  })

  return {
    value: best.line,
    confidence: Math.min(99, best.score),
    originalIndex,
  }
}

function choosePerson(lines, company) {
  const candidates = lines
    .map((line, index) => ({
      line: normalizeLine(line),
      index,
      score: scorePersonCandidate(
        line,
        index,
        company.originalIndex
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]

  if (!best || best.score < 45) {
    return {
      value: '',
      confidence: 0,
      index: -1,
    }
  }

  return {
    value: best.line,
    confidence: Math.min(99, best.score),
    index: best.index,
  }
}

function chooseDesignation(lines, person) {
  const candidates = lines
    .map((line, index) => {
      const clean = normalizeLine(line)
      const lower = clean.toLowerCase()

      let score = 0

      if (containsAny(lower, DESIGNATION_WORDS)) {
        score += 65
      }

      if (containsAny(lower, QUALIFICATION_WORDS)) {
        score += 15
      }

      if (person.index >= 0) {
        const distance = Math.abs(index - person.index)

        if (distance === 1) score += 20
        else if (distance === 2) score += 10
      }

      if (clean === person.value) score = -100
      if (isLikelyPhoneLine(clean)) score = -100
      if (isEmail(clean)) score = -100
      if (isLikelyAddressLine(clean)) score = -100

      return {
        line: clean,
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]

  if (!best || best.score < 50) {
    return {
      value: '',
      confidence: 0,
    }
  }

  return {
    value: best.line,
    confidence: Math.min(99, best.score),
  }
}

function extractPhones(text) {
  const matches =
    text.match(
      /(?:\+?\s*91[\s.-]*)?0?[6-9](?:[\s.-]*\d){9}/g
    ) || []

  return [
    ...new Set(
      matches
        .map(normalizePhone)
        .filter(Boolean)
    ),
  ]
}

function extractAddress(lines) {
  const addressLines = []

  let started = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = normalizeLine(lines[i])

    if (!line) {
      if (started && addressLines.length >= 2) break
      continue
    }

    if (isLikelyPhoneLine(line)) continue

    const addressLike = isLikelyAddressLine(line)

    if (addressLike) {
      started = true
      addressLines.push(line)
      continue
    }

    if (started) {
      const continuation =
        line.length > 5 &&
        !isEmail(line) &&
        !isLikelyPhoneLine(line) &&
        !looksLikeHumanName(line)

      if (continuation && addressLines.length < 5) {
        addressLines.push(line)
      } else {
        break
      }
    }
  }

  return addressLines
    .map((line) => line.replace(/,\s*$/, ''))
    .join(', ')
}

export function extractBusinessCardFields(rawText) {
  const text = normalizeText(rawText)

  const lines = text
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)

  const email = extractEmail(text)
  const website = extractWebsite(text, email)
  const phones = extractPhones(text)

  const company = chooseCompany(lines)
  const person = choosePerson(lines, company)
  const designation = chooseDesignation(lines, person)

  const address = extractAddress(lines)
  const category = detectCategory(text)

  return {
    businessName: company.value,
    contactName: person.value,
    designation: designation.value,
    phone: phones[0] || '',
    secondaryPhone: phones[1] || '',
    email,
    website,
    address,
    category,

    confidence: {
      businessName: company.confidence,
      contactName: person.confidence,
      designation: designation.confidence,
    },
  }
}

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
    } catch {
      // Fall back to normal browser decoding.
    }
  }

  const url = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function preprocessImage(file) {
  if (!file?.type.startsWith('image/')) {
    throw new Error(
      'Please choose a valid business-card image.'
    )
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      'This image is too large. Please choose an image smaller than 20 MB.'
    )
  }

  let image

  try {
    image = await decodeImage(file)
  } catch {
    throw new Error(
      'The selected image could not be opened. Try another photo.'
    )
  }

  const sourceWidth =
    image.width || image.naturalWidth || 1

  const sourceHeight =
    image.height || image.naturalHeight || 1

  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight)
  )

  const width = Math.max(
    1,
    Math.round(sourceWidth * scale)
  )

  const height = Math.max(
    1,
    Math.round(sourceHeight * scale)
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    throw new Error(
      'Unable to prepare this image for scanning.'
    )
  }

  context.drawImage(image, 0, 0, width, height)

  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  )

  const pixels = imageData.data

  for (let i = 0; i < pixels.length; i += 4) {
    const gray =
      pixels[i] * 0.299 +
      pixels[i + 1] * 0.587 +
      pixels[i + 2] * 0.114

    const contrasted = Math.max(
      0,
      Math.min(
        255,
        (gray - 128) * 1.12 + 128
      )
    )

    pixels[i] = contrasted
    pixels[i + 1] = contrasted
    pixels[i + 2] = contrasted
  }

  context.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              'Unable to prepare the image for scanning.'
            )
          )
          return
        }

        resolve(blob)
      },
      'image/jpeg',
      0.95
    )
  })
}

async function rotateImage(imageBlob, degrees) {
  const image = await decodeImage(imageBlob)
  const sourceWidth =
    image.width || image.naturalWidth || 1
  const sourceHeight =
    image.height || image.naturalHeight || 1
  const swapsDimensions = degrees % 180 !== 0
  const canvas = document.createElement('canvas')
  canvas.width = swapsDimensions
    ? sourceHeight
    : sourceWidth
  canvas.height = swapsDimensions
    ? sourceWidth
    : sourceHeight

  try {
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error(
        'Unable to prepare this image for scanning.'
      )
    }

    context.translate(
      canvas.width / 2,
      canvas.height / 2
    )
    context.rotate((degrees * Math.PI) / 180)
    context.drawImage(
      image,
      -sourceWidth / 2,
      -sourceHeight / 2
    )

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(
              new Error(
                'Unable to prepare this image for scanning.'
              )
            )
          }
        },
        'image/jpeg',
        0.95
      )
    })
  } finally {
    if (typeof image.close === 'function') {
      image.close()
    }
    canvas.width = 0
    canvas.height = 0
  }
}

function scoreOcrText(text = '') {
  const clean = normalizeText(text)

  if (!clean) return 0

  let score = 0

  const words = clean.match(/[A-Za-z]{2,}/g) || []
  score += Math.min(words.length, 50)

  if (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
      clean
    )
  ) {
    score += 20
  }

  if (
    /(?:\+?\s*91[\s.-]*)?0?[6-9](?:[\s.-]*\d){9}/.test(
      clean
    )
  ) {
    score += 18
  }

  if (/\b\d{6}\b|\b\d{3}\s\d{3}\b/.test(clean)) {
    score += 12
  }

  if (
    containsAny(clean.toLowerCase(), [
      ...COMPANY_SUFFIXES,
      ...ADDRESS_WORDS,
      ...DESIGNATION_WORDS,
    ])
  ) {
    score += 15
  }

  return score
}

function isWeakOcrResult(text, score) {
  return score < 35 || normalizeText(text).length < 80
}

export async function scanBusinessCard(
  file,
  onProgress
) {
  const image = await preprocessImage(file)

  const { createWorker, PSM } = await import(
    'tesseract.js'
  )

  const worker = await createWorker('eng', 1, {
    workerPath:
      `${import.meta.env.BASE_URL}tesseract/worker.min.js`,
corePath:
  `${import.meta.env.BASE_URL}tesseract/`,    
    langPath:
      `${import.meta.env.BASE_URL}tesseract/lang`,
    logger: (message) => {
      if (
        message.status === 'recognizing text' &&
        typeof message.progress === 'number'
      ) {
        onProgress?.(
          Math.round(message.progress * 100)
        )
      }
    },
  })

  try {
    const recognizeImage = async (candidateImage) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
      })

      const firstResult =
        await worker.recognize(candidateImage, {
          rotateAuto: true,
        })

      let text = firstResult.data.text || ''
      let score = scoreOcrText(text)

      if (isWeakOcrResult(text, score)) {
        await worker.setParameters({
          tessedit_pageseg_mode:
            PSM.SINGLE_BLOCK,
          preserve_interword_spaces: '1',
        })

        const secondResult =
          await worker.recognize(candidateImage, {
            rotateAuto: true,
          })
        const secondText =
          secondResult.data.text || ''
        const secondScore =
          scoreOcrText(secondText)

        if (secondScore > score) {
          text = secondText
          score = secondScore
        }
      }

      return { text, score }
    }

    let bestResult = await recognizeImage(image)

    if (isWeakOcrResult(
      bestResult.text,
      bestResult.score
    )) {
      for (const degrees of [90, 180, 270]) {
        const rotatedImage =
          await rotateImage(image, degrees)
        const rotatedResult =
          await recognizeImage(rotatedImage)

        if (rotatedResult.score > bestResult.score) {
          bestResult = rotatedResult
        }
      }
    }

    const fields =
      extractBusinessCardFields(bestResult.text)

    return {
      rawText: normalizeText(bestResult.text),
      fields,
    }
  } finally {
    await worker.terminate()
  }
}
