import { useState } from 'react'
import styles from './SessionSection.module.css'

interface SessionSectionProps {
  title: string
  embedUrl: string
}

export function SessionSection({ title, embedUrl }: SessionSectionProps) {
  const [active, setActive] = useState(false)

  return (
    <section className={styles.section}>
      <div className={styles.contentWrap}>
        <h2 className={styles.sectionLabel}>{title}</h2>
        <div
          className={`${styles.embedWrap} ${active ? styles.embedActive : ''}`}
          onClick={() => !active && setActive(true)}
        >
          <iframe
            src={embedUrl}
            title={title}
            className={styles.iframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
          {!active && <div className={styles.overlay} />}
        </div>
      </div>
    </section>
  )
}
