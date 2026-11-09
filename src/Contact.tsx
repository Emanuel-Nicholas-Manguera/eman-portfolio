import { useEffect, useRef, useState } from 'react'
import { socials } from './socialData'
import './Contact.css'

const email = 'emanuel.nicholas.nm@gmail.com'
const gmail = socials.find((social) => social.id === 'gmail')!
const contactLinks = [
  ...socials.filter((social) => social.id === 'linkedin' || social.id === 'github').reverse(),
  { label: 'Facebook', href: 'https://web.facebook.com/profile.php?id=61592447112540' },
]

function ContactArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  )
}

export function Contact() {
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
      <section ref={sectionRef} className="contact-section" id="contact" aria-labelledby="contact-title" data-visible={visible}>
        <div className="contact-invitation">
          <p className="section-eyebrow">Contact</p>
          <h2 id="contact-title">Let’s build<br />something <span>meaningful.</span></h2>
          <p className="contact-description">Have an opportunity or a project in mind?<br />I’d love to hear about it.</p>
          <a className="contact-email" href={gmail.href} target="_blank" rel="noopener noreferrer" aria-label={`Email ${email} in Gmail (opens in a new tab)`}>
            <span>{email}</span>
            <ContactArrow />
          </a>
          <nav className="contact-socials" aria-label="More ways to connect">
            {contactLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>
                {link.label}<ContactArrow />
              </a>
            ))}
          </nav>
        </div>
      </section>
      <footer className="site-footer">
        <span>Emanuel Nicholas</span>
        <span>Paranaque, Philippines</span>
      </footer>
    </>
  )
}
