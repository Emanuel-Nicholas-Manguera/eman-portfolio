import introduction from './assets/projects/portfolio-introduction.png'
import experience from './assets/projects/portfolio-experience.png'
import dark from './assets/projects/portfolio-dark.png'

export type ProjectPhoto = { label: string; src?: string; illustration?: 'golf' | 'dost'; note: string }
export type Project = {
  id: string
  name: string
  kind: string
  organization?: string
  description: string
  technologies: string[]
  source?: string
  photos: ProjectPhoto[]
}

// Keep content separate from the gallery so a CMS can supply this shape later.
export const projects: Project[] = [
  {
    id: 'portfolio', name: 'Personal portfolio', kind: 'Personal project',
    description: 'A responsive home for my work and experience, with light and dark themes, smooth transitions, and an interactive portrait introduction.',
    technologies: ['React', 'TypeScript', 'CSS', 'Git'],
    source: 'https://github.com/Emanuel-Nicholas-Manguera/eman-portfolio',
    photos: [
      { label: 'Introduction', src: introduction, note: 'Website screenshot' },
      { label: 'Experience', src: experience, note: 'Website screenshot' },
      { label: 'Dark theme', src: dark, note: 'Earlier website design' },
    ],
  },
  {
    id: 'golfmatch', name: 'GolfMatch', kind: 'Mobile application · Team project',
    organization: 'Impulse 101 IT Solutions',
    description: 'A mobile app for the golf community. I contributed to its development as part of the team at Impulse 101 IT Solutions, collaborating on updates and maintaining the application.',
    technologies: ['TypeScript', 'JavaScript', 'SQL', 'Git'],
    photos: ['Overview', 'Courses', 'Community'].map(label => ({ label, illustration: 'golf', note: 'Illustrative preview' })),
  },
  {
    id: 'dost', name: 'DOST INSPIRE', kind: 'Web application · Internship',
    organization: 'Department of Science and Technology',
    description: 'Web modules and dashboards supporting executive insights and data analytics. My contributions included reusable interfaces, authentication, and account management features.',
    technologies: ['PHP', 'JavaScript', 'Laravel', 'Vue.js', 'Git'],
    photos: ['Dashboard', 'Reports', 'Accounts'].map(label => ({ label, illustration: 'dost', note: 'Illustrative preview' })),
  },
]
