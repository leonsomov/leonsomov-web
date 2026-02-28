import { useState, useCallback, useEffect } from 'react'
import styles from './OverlayMenu.module.css'

const projects = [
  { name: 'Leon Somov & Jazzu', desc: '7 albums', url: 'https://open.spotify.com/artist/6CTezLRkBux4t2uCws1OUO' },
  { name: 'Highly Sedated', desc: 'SIZE Records', url: 'https://open.spotify.com/artist/14GNc5eQN6ia67v1ZhDMAv' },
  { name: '"Rūta"', desc: 'original score', url: 'https://www.imdb.com/title/tt31893591/' },
  { name: 'Geeky Punks', desc: 'member — synth education', url: 'https://geekypunks.com' },
]

const links = [
  { label: 'Spotify', url: 'https://open.spotify.com/artist/5tqSjP3EGoOTriKogeTNO2' },
  { label: 'Bandcamp', url: 'https://leonsomov.bandcamp.com' },
  { label: 'SoundCloud', url: 'https://soundcloud.com/leonsomov' },
  { label: 'YouTube', url: 'https://www.youtube.com/@leonsomov' },
  { label: 'Instagram', url: 'https://www.instagram.com/leonsomov' },
  { label: 'Geeky Punks', url: 'https://geekypunks.com' },
]

export function OverlayMenu() {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => setOpen(v => !v), [])
  const close = useCallback(() => setOpen(false), [])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      {/* Menu trigger button */}
      <button
        className={styles.menuBtn}
        onClick={toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span className={styles.menuIcon}>
          <span className={`${styles.menuLine} ${open ? styles.menuLineOpen : ''}`} />
          <span className={`${styles.menuLine} ${open ? styles.menuLineOpen : ''}`} />
          <span className={`${styles.menuLine} ${open ? styles.menuLineOpen : ''}`} />
        </span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className={styles.backdrop}
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        <button className={styles.closeBtn} onClick={close} aria-label="Close menu">
          &times;
        </button>

        <div className={styles.panelContent}>
          {/* Bio */}
          <section className={styles.section}>
            <p className={styles.bio}>Sound, code, and the space between.</p>
            <picture>
              <img
                src="/photos/portrait.webp"
                alt="Leon Somov performing — photo by Ieva Jura"
                className={styles.photo}
                loading="lazy"
                width="1200"
                height="800"
              />
            </picture>
          </section>

          {/* Projects */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>projects</h3>
            <div className={styles.projectList}>
              {projects.map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.projectRow}
                >
                  <span className={styles.projectName}>{p.name}</span>
                  <span className={styles.projectDesc}>{p.desc}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Links */}
          <section className={styles.section}>
            <nav className={styles.linkRow}>
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.link}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </section>

          <p className={styles.credit}>Photos by Ieva Jura</p>
        </div>
      </div>
    </>
  )
}
