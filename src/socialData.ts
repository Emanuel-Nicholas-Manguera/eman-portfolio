import githubLogo from './assets/socials/github.svg'
import linkedinLogo from './assets/socials/linkedin.svg'
import gmailLogo from './assets/socials/gmail.svg'
import facebookLogo from './assets/socials/facebook.svg'
import type { ContactContent } from './cms/content'

export const socialProfiles = [
  { id: 'github', label: 'GitHub', logo: githubLogo },
  { id: 'linkedin', label: 'LinkedIn', logo: linkedinLogo },
  { id: 'gmail', label: 'Gmail', logo: gmailLogo },
  { id: 'facebook', label: 'Facebook', logo: facebookLogo },
] as const

export type SocialId = (typeof socialProfiles)[number]['id']
export type SocialLink = (typeof socialProfiles)[number] & { href: string; caption: string }

export function profileSocials(contact: ContactContent): SocialLink[] {
  return socialProfiles.map((profile) => {
    const { id } = profile
    const href = id === 'gmail'
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}`
      : contact[id]
    const caption = id === 'facebook' ? 'Connect with me on Facebook.' : contact[`${id}Caption`]
    return { ...profile, href, caption }
  }).filter((profile) => !!profile.href)
}
