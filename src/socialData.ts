import githubLogo from './assets/socials/github.svg'
import linkedinLogo from './assets/socials/linkedin.svg'
import gmailLogo from './assets/socials/gmail.svg'
import facebookLogo from './assets/socials/facebook.svg'
import xLogo from './assets/socials/x.svg'
import instagramLogo from './assets/socials/instagram.svg'
import { socialPlatforms, type SocialId, type SocialProfile } from './cms/content'

export type { SocialId } from './cms/content'
export type SocialLink = { id: SocialId; label: string; logo: string; href: string; caption: string }

const logos: Record<SocialId, string> = {
  github: githubLogo,
  linkedin: linkedinLogo,
  gmail: gmailLogo,
  facebook: facebookLogo,
  x: xLogo,
  instagram: instagramLogo,
}

export const socialProfiles = (Object.keys(socialPlatforms) as SocialId[]).map((id) => ({
  id,
  label: socialPlatforms[id],
  logo: logos[id],
}))

export function gmailComposeUrl(email: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
}

export function profileSocials(links: SocialProfile[]): SocialLink[] {
  return links.map(({ platform, destination, caption }) => ({
    id: platform,
    label: socialPlatforms[platform],
    logo: logos[platform],
    href: platform === 'gmail' ? gmailComposeUrl(destination) : destination,
    caption,
  }))
}
