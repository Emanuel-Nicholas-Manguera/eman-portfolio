import type {
  IntroductionContent,
  ContactContent,
  AboutContent,
} from './content'
import suit from '../assets/portraits/emanuel-suit.png'
import graduation from '../assets/portraits/emanuel-graduation.png'
import { experiences } from '../experienceData'
import { projects } from '../projectData'
export { experiences, projects, suit, graduation }
export const introduction: IntroductionContent = {
  name: 'Emanuel Nicholas',
  location: 'Paranaque, Philippines',
  role: 'Software Developer',
  description:
    'I build websites and mobile applications, with experience in full-stack development, improving existing systems, and troubleshooting. I enjoy working with teams to create practical, reliable software.',
  graduateRole: 'BS Computer Science Graduate',
  graduateDescription:
    'I earned my degree from Lyceum of the Philippines University–Manila, graduating Magna Cum Laude in 2026. I was a DOST scholar and a Dean’s List awardee for eight consecutive semesters.',
  actionLabel: 'View projects',
  scrollLabel: 'A little about me. Then, where I’ve contributed.',
}
export const contact: ContactContent = {
  name: 'Emanuel Nicholas',
  location: 'Paranaque, Philippines',
  heading: 'Let’s build something meaningful.',
  description:
    'Have an opportunity or a project in mind?\nI’d love to hear about it.',
  email: 'emanuel.nicholas.nm@gmail.com',
  github: 'https://github.com/Emanuel-Nicholas-Manguera',
  linkedin: 'https://www.linkedin.com/in/emanuel-nicholas-manguera-556327351/',
  facebook: 'https://web.facebook.com/profile.php?id=61592447112540',
  githubCaption: 'Explore what I’m building.',
  linkedinCaption: 'Let’s connect professionally.',
  gmailCaption: 'Have something in mind? Let’s talk.',
}
export const about: AboutContent = {
  heading: 'A little about me.',
  description: '',
  education: [
    {
      title: 'BS Computer Science',
      detail: 'Lyceum of the Philippines University–Manila · 2026',
    },
  ],
  recognitions: [
    { title: 'Magna Cum Laude', detail: '' },
    { title: 'DOST Scholar', detail: '' },
    { title: 'Dean’s List', detail: 'Eight consecutive semesters' },
  ],
  certificates: [],
}
