import githubLogo from './assets/socials/github.svg'
import linkedinLogo from './assets/socials/linkedin.svg'
import gmailLogo from './assets/socials/gmail.svg'

export type SocialId = 'github' | 'linkedin' | 'gmail'

export const socials: {
  id: SocialId
  label: string
  logo: string
  href: string
  caption: string
}[] = [
  {
    id: 'github',
    label: 'GitHub',
    logo: githubLogo,
    href: 'https://github.com/Emanuel-Nicholas-Manguera',
    caption: 'Explore what I’m building.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    logo: linkedinLogo,
    href: 'https://www.linkedin.com/in/emanuel-nicholas-manguera-556327351/',
    caption: 'Let’s connect professionally.',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    logo: gmailLogo,
    href: 'https://mail.google.com/mail/?view=cm&fs=1&to=emanuel.nicholas.nm%40gmail.com',
    caption: 'Have something in mind? Let’s talk.',
  },
]

export function profileSocials(contact: import('./cms/content').ContactContent): typeof socials {
  return socials.map(s => ({...s, href: s.id === 'gmail' ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}` : contact[s.id], caption: contact[`${s.id}Caption`]})).filter(s => !!s.href)
}
