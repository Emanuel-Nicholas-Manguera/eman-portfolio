import { useEffect, useRef, useState } from 'react'
import { gmailComposeUrl, type SocialLink } from './socialData'
import type { ContactContent } from './cms/content'
import './Contact.css'

function ContactArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  )
}

export function Contact({ content, socialLinks }: { content: ContactContent; socialLinks: SocialLink[] }) {
  const words = content.heading.split(' ')
  const email = content.email
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: .1 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <section ref={sectionRef} className="contact-section" id="contact" aria-labelledby="contact-title" data-visible={visible} tabIndex={-1}>
        <div className="contact-invitation">
          <p className="section-eyebrow">Contact</p>
          <h2 id="contact-title">{words.slice(0,2).join(' ')}{words.length>2&&<><br />{words.slice(2,-1).join(' ')} <span>{words.at(-1)}</span></>}</h2>
          <p className="contact-description">{content.description}</p>
          <a className="contact-email" href={gmailComposeUrl(email)} target="_blank" rel="noopener noreferrer" aria-label={`Email ${email} in Gmail (opens in a new tab)`}>
            <span>{email}</span>
            <ContactArrow />
          </a>
          {socialLinks.length > 0 && <nav className="contact-socials" aria-label="More ways to connect">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>
                {link.label}<ContactArrow />
              </a>
            ))}
          </nav>}
        </div>
      </section>
      <footer className="site-footer">
        <span>{content.name}</span>
        <span>{content.location}</span>
      </footer>
    </>
  )
}
