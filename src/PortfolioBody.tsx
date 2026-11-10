import { Introduction } from './Introduction'
import { Experience } from './Experience'
import { Projects } from './Projects'
import { About } from './About'
import { Contact } from './Contact'
import type { PortfolioData } from './cms/portfolio'
import type { SocialId } from './socialData'
export function PortfolioBody({
  data,
  social,
  onSocialSelect,
}: {
  data: PortfolioData
  social: SocialId | null
  onSocialSelect: (id: SocialId) => void
}) {
  return (
    <>
      {data.introduction && (
        <Introduction
          content={data.introduction}
          contact={data.contact}
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
      {data.about && <About content={data.about} />}
      {data.contact && <Contact content={data.contact} />}
    </>
  )
}
