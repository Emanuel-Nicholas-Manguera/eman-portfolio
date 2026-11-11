import { Introduction } from './Introduction'
import { Experience } from './Experience'
import { Projects } from './Projects'
import { Contact } from './Contact'
import type { PortfolioData } from './cms/portfolio'
import { resolveSocialLinks } from './cms/content'
import { profileSocials, type SocialSelection } from './socialData'
export function PortfolioBody({
  data,
  introductionReady = true,
  social,
  onSocialSelect,
}: {
  introductionReady?: boolean
  data: PortfolioData
  social: SocialSelection | null
  onSocialSelect: (id: SocialSelection) => void
}) {
  const socialLinks = profileSocials(resolveSocialLinks(data.introduction?.socialLinks, data.contact))
  const contactLinks = data.introduction?.socialLinks === undefined
    ? ['linkedin', 'github', 'facebook'].flatMap((id) => socialLinks.filter((link) => link.platform === id))
    : socialLinks.filter((link) => link.platform !== 'gmail')
  return (
    <>
      {data.introduction && (
        <Introduction
          ready={introductionReady}
          content={data.introduction}
          background={data.about}
          socialLinks={socialLinks}
          social={social}
          onSocialSelect={onSocialSelect}
        />
      )}
      {!!data.experiences.length && (
        <Experience
          key={data.experiences.map((e) => e.id).join('|')}
          experiences={data.experiences}
        />
      )}
      {!!data.projects.length && (
        <Projects
          key={data.projects.map((p) => p.id + ':' + p.photos.length).join('|')}
          projects={data.projects}
        />
      )}
      {data.contact && <Contact content={data.contact} socialLinks={contactLinks} />}
    </>
  )
}
