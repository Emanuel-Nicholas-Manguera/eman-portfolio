import type {
  IntroductionContent,
  ExperienceContent,
  ProjectContent,
  AboutContent,
  ContactContent,
  Publication,
  PublicAsset,
} from './content.ts'
import { safeLink } from './content.ts'
import type { Project } from '../projectData'
export type PortfolioData = {
  introduction:
    | (IntroductionContent & { suitSrc?: string; graduationSrc?: string })
    | null
  experiences: ExperienceContent[]
  projects: Project[]
  about: AboutContent | null
  contact: ContactContent | null
}
export function resolvePortfolio(
  publications: Publication[],
  assets: PublicAsset[],
): PortfolioData {
  const sorted = [...publications].sort(
    (a, b) =>
      a.sort_order - b.sort_order || a.document_id.localeCompare(b.document_id),
  )
  const getAsset = (doc: string, id?: string) =>
    assets.find((a) => a.document_id === doc && a.asset_id === id)
  const introDoc = sorted.find((p) => p.kind === 'introduction')
  const intro = introDoc?.content as IntroductionContent | undefined
  const contactDoc = sorted.find((p) => p.kind === 'contact')
  const contact = contactDoc?.content as ContactContent | undefined
  return {
    introduction:
      intro && introDoc
        ? {
            ...intro,
            suitSrc: getAsset(introDoc.document_id, intro.suitAssetId)?.url,
            graduationSrc: getAsset(
              introDoc.document_id,
              intro.graduationAssetId,
            )?.url,
          }
        : null,
    experiences: sorted
      .filter((p) => p.kind === 'experience')
      .map((p) => ({ ...(p.content as ExperienceContent), id: p.document_id })),
    projects: sorted
      .filter((p) => p.kind === 'project')
      .map((p) => {
        const c = p.content as ProjectContent
        return {
          ...c,
          id: p.document_id,
          source: c.source ? safeLink(c.source) : undefined,
          photos: (c.photos ?? []).map((photo) => {
            const a = getAsset(p.document_id, photo.assetId)
            return { ...photo, src: a?.url, alt: a?.alt_text || photo.label }
          }),
        }
      })
      .filter((p) => p.photos.length > 0),
    about:
      (sorted.find((p) => p.kind === 'about')?.content as AboutContent) ?? null,
    contact: contact
      ? {
          ...contact,
          github: safeLink(contact.github),
          linkedin: safeLink(contact.linkedin),
          facebook: safeLink(contact.facebook),
        }
      : null,
  }
}
