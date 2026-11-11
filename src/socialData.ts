import { socialPlatforms, type SocialPlatform, type SocialProfileEntry } from './cms/content'

export type SocialSelection = { id: string; platform: SocialPlatform }
export type SocialLink = SocialSelection & { label: string; logo: string; href: string; caption: string }

const logos = import.meta.glob<string>('./assets/socials/*.svg', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
})

export const socialWallpaperPlatforms = ['github', 'linkedin', 'gmail', 'facebook', 'x', 'instagram', 'discord'] as const

export function gmailComposeUrl(email: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
}

export function profileSocials(links: SocialProfileEntry[]): SocialLink[] {
  const counts = new Map<SocialPlatform, number>()
  for (const { platform } of links) counts.set(platform, (counts.get(platform) ?? 0) + 1)

  const occurrences = new Map<SocialPlatform, number>()
  return links.map(({ id, platform, destination, caption, label }) => {
    const occurrence = (occurrences.get(platform) ?? 0) + 1
    occurrences.set(platform, occurrence)
    const platformLabel = platform === 'website' ? new URL(destination).hostname : socialPlatforms[platform]
    return {
      id,
      platform,
      label: label || ((counts.get(platform) ?? 0) > 1 ? `${platformLabel} ${occurrence}` : platformLabel),
      logo: logos[`./assets/socials/${platform}.svg`] ?? logos['./assets/socials/website.svg'],
      href: platform === 'gmail' ? gmailComposeUrl(destination) : destination,
      caption,
    }
  })
}
