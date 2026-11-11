export type Kind =
  | 'introduction'
  | 'experience'
  | 'project'
  | 'about'
  | 'contact'
export type PhotoContent = {
  label: string
  note: string
  assetId?: string
  illustration?: 'golf' | 'dost'
}
export const socialPlatforms = {
  behance: 'Behance',
  bluesky: 'Bluesky',
  codepen: 'CodePen',
  devdotto: 'DEV Community',
  discord: 'Discord',
  dribbble: 'Dribbble',
  facebook: 'Facebook',
  github: 'GitHub',
  gitlab: 'GitLab',
  gmail: 'Gmail',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  mastodon: 'Mastodon',
  medium: 'Medium',
  patreon: 'Patreon',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  snapchat: 'Snapchat',
  spotify: 'Spotify',
  stackoverflow: 'Stack Overflow',
  telegram: 'Telegram',
  threads: 'Threads',
  tiktok: 'TikTok',
  twitch: 'Twitch',
  vimeo: 'Vimeo',
  whatsapp: 'WhatsApp',
  x: 'X',
  youtube: 'YouTube',
  website: 'Other website',
} as const

export type SocialPlatform = keyof typeof socialPlatforms
export type SocialProfile = {
  id?: string
  platform: SocialPlatform
  destination: string
  caption: string
  label?: string
}
export type SocialProfileEntry = SocialProfile & { id: string }
export const socialLabelLimit = 80

export type IntroductionContent = {
  name: string
  location: string
  role: string
  description: string
  graduateRole: string
  graduateDescription: string
  suitAssetId?: string
  graduationAssetId?: string
  actionLabel: string
  scrollLabel: string
  socialLinks?: SocialProfile[]
}
export type ExperienceContent = {
  id: string
  name: string
  company: string
  department?: string
  role: string
  location: string
  kind: string
  dates: { start: string; end: string; label: string } | null
  summary: string
  contributions: { title: string; detail: string }[]
  languages: string[]
}
export type ProjectContent = {
  name: string
  kind: string
  organization?: string
  description: string
  technologies: string[]
  source?: string
  photos: PhotoContent[]
}
export type AboutContent = {
  heading: string
  description: string
  education: { title: string; detail: string }[]
  recognitions: { title: string; detail: string }[]
  certificates: { title: string; detail: string; url?: string }[]
}
export type ContactContent = {
  name: string
  location: string
  heading: string
  description: string
  email: string
  github: string
  linkedin: string
  facebook: string
  githubCaption: string
  linkedinCaption: string
  gmailCaption: string
}
export type Content =
  | IntroductionContent
  | ExperienceContent
  | ProjectContent
  | AboutContent
  | ContactContent
export type CmsDocument = {
  id: string
  kind: Kind
  slug: string
  title: string
  content: Content
  sort_order: number
  updated_at: string
  deleted_at: string | null
}
export type CmsAsset = {
  id: string
  bucket_id: string
  object_path: string
  original_filename: string
  alt_text: string
  mime_type: string
  byte_size: number
  archived_at: string | null
  original_asset_id: string | null
  url?: string
}
export type Publication = {
  document_id: string
  kind: Kind
  slug: string
  title: string
  content: Content
  sort_order: number
  published_at: string
}
export type PublicAsset = {
  asset_id: string
  document_id: string
  object_path: string
  alt_text: string
  caption: string
  sort_order: number
  url?: string
}
export const kinds: Kind[] = [
  'introduction',
  'experience',
  'project',
  'about',
  'contact',
]
export function safeLink(value: string, allowMail = false) {
  try {
    const u = new URL(value)
    return ['https:', 'http:', ...(allowMail ? ['mailto:'] : [])].includes(
      u.protocol,
    )
      ? u.href
      : ''
  } catch {
    return ''
  }
}
function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isSocialProfile(value: unknown): value is SocialProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<SocialProfile>
  return typeof profile.platform === 'string'
    && Object.hasOwn(socialPlatforms, profile.platform)
    && typeof profile.destination === 'string'
    && typeof profile.caption === 'string'
    && (profile.id === undefined || typeof profile.id === 'string')
    && (profile.label === undefined || typeof profile.label === 'string')
}

function socialDestination(profile: SocialProfile) {
  const destination = profile.destination.trim()
  return profile.platform === 'gmail'
    ? (validEmail(destination) ? destination : '')
    : safeLink(destination)
}

export function identifySocialLinks(value: unknown): SocialProfileEntry[] {
  if (!Array.isArray(value)) return []

  const used = new Set<string>()
  return value.flatMap((profile, index) => {
    if (!isSocialProfile(profile)) return []
    let id = profile.id || `legacy-${profile.platform}-${index}`
    while (used.has(id)) id += '-copy'
    used.add(id)
    return [{ ...profile, id }]
  })
}

export function resolveSocialLinks(value: unknown, contact?: ContactContent | null): SocialProfileEntry[] {
  // Older Introduction records inherit the published Contact links. An explicit
  // empty list means the owner removed all profiles.
  if (value === undefined && contact) {
    value = [
      { platform: 'github', destination: contact.github, caption: contact.githubCaption ?? '' },
      { platform: 'linkedin', destination: contact.linkedin, caption: contact.linkedinCaption ?? '' },
      { platform: 'gmail', destination: contact.email, caption: contact.gmailCaption ?? '' },
      { platform: 'facebook', destination: contact.facebook, caption: 'Connect with me on Facebook.' },
    ]
  }
  return identifySocialLinks(value).flatMap((profile) => {
    const destination = socialDestination(profile)
    if (!destination) return []
    return [{ ...profile, destination, label: profile.label?.trim().slice(0, socialLabelLimit) }]
  })
}

export function assetIds(content: Content): string[] {
  const c = content as IntroductionContent & ProjectContent
  return [
    ...new Set(
      [
        c.suitAssetId,
        c.graduationAssetId,
        ...(c.photos ?? []).map((p) => p.assetId),
      ].filter((id): id is string => !!id),
    ),
  ]
}
export function validateContent(
  kind: Kind,
  title: string,
  content: Content,
  forPublication = true,
) {
  if (!title.trim() || title.length > 200)
    throw new Error('Enter a title of 1–200 characters.')
  const c = content as unknown as Record<string, unknown>
  const required: Record<Kind, string[]> = {
    introduction: ['name', 'role', 'description'],
    experience: ['name', 'company', 'role', 'summary'],
    project: ['name', 'description'],
    about: ['heading'],
    contact: ['name', 'email'],
  }
  for (const field of forPublication ? required[kind] : [])
    if (typeof c[field] !== 'string' || !String(c[field]).trim())
      throw new Error(
        `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`,
      )
  if (
    forPublication &&
    kind === 'contact' &&
    !validEmail(String(c.email))
  )
    throw new Error('Enter a valid email address.')
  for (const field of ['source', 'github', 'linkedin', 'facebook'])
    if (c[field] && !safeLink(String(c[field])))
      throw new Error(`Enter a valid https:// link for ${field}.`)
  if (kind === 'introduction' && c.socialLinks !== undefined) {
    if (!Array.isArray(c.socialLinks) || !c.socialLinks.every(isSocialProfile))
      throw new Error('Choose a supported platform for each social link.')
    for (const profile of c.socialLinks) {
      const label = socialPlatforms[profile.platform]
      if ((profile.label?.trim().length ?? 0) > socialLabelLimit)
        throw new Error(`Use ${socialLabelLimit} characters or fewer for a link name.`)
      if ((forPublication || profile.destination.trim()) && !socialDestination(profile)) {
        throw new Error(profile.platform === 'gmail'
          ? 'Enter a valid email address for Gmail.'
          : `Enter a valid profile URL for ${label}.`)
      }
    }
  }
  if (forPublication && kind === 'project') {
    const photos = (content as ProjectContent).photos
    if (!photos.length) throw new Error('Add at least one project image.')
    if (photos.some((p) => !p.label.trim() || (!p.assetId && !p.illustration)))
      throw new Error('Choose an image and a label for each photo.')
  }
  if (forPublication && kind === 'experience') {
    const dates = (content as ExperienceContent).dates
    if (
      dates &&
      (!/^\d{4}-\d{2}$/.test(dates.start) ||
        !/^\d{4}-\d{2}$/.test(dates.end) ||
        dates.start > dates.end)
    )
      throw new Error(
        'Enter a valid start and end month in chronological order.',
      )
  }
  if (
    kind === 'about' &&
    (content as AboutContent).certificates.some(
      (c) => c.url && !safeLink(c.url),
    )
  )
    throw new Error('Enter a valid certificate link.')
}
export function blankContent(kind: Kind): Content {
  switch (kind) {
    case 'introduction':
      return {
        name: '',
        location: '',
        role: '',
        description: '',
        graduateRole: '',
        graduateDescription: '',
        actionLabel: 'View projects',
        scrollLabel: 'Explore my experience.',
      }
    case 'experience':
      return {
        id: crypto.randomUUID(),
        name: '',
        company: '',
        department: '',
        role: '',
        location: '',
        kind: 'Professional experience',
        dates: null,
        summary: '',
        contributions: [],
        languages: [],
      }
    case 'project':
      return {
        name: '',
        kind: 'Personal project',
        description: '',
        technologies: [],
        photos: [],
      }
    case 'about':
      return {
        heading: 'A little about me.',
        description: '',
        education: [],
        recognitions: [],
        certificates: [],
      }
    case 'contact':
      return {
        name: '',
        location: '',
        heading: 'Let’s build something meaningful.',
        description: '',
        email: '',
        github: '',
        linkedin: '',
        facebook: '',
        githubCaption: 'Explore what I’m building.',
        linkedinCaption: 'Let’s connect professionally.',
        gmailCaption: 'Have something in mind? Let’s talk.',
      }
  }
}
