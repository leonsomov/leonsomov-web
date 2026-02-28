import { useState } from 'react'
import { FogCanvas } from './components/FogCanvas'
import { Monogram } from './components/Monogram'
import { SessionSection } from './components/SessionSection'
import styles from './components/App.module.css'

const projects = [
  { name: 'Leon Somov & Jazzu', desc: '7 albums, two MTV EMA Best Baltic Act awards, M.A.M.A. Band of the Year' },
  { name: 'Highly Sedated', desc: 'Steve Angello\'s SIZE Records, BBC Radio 1, live with Lithuanian Chamber Orchestra' },
  { name: 'Cabin Sessions', desc: 'audiovisual live project, Ziro Festival India, experimental electronics' },
  { name: 'Cello Duo', desc: 'experimental electronics meets cello, vinyl-only release' },
  { name: '"Ruta"', desc: 'original film score' },
  { name: 'M-1 Radio', desc: 'jingles and sound identity for Lithuania\'s biggest commercial radio station' },
  { name: 'Geeky Punks', desc: 'sound synthesis education, courses and mentoring' },
]

const links = [
  { label: 'Spotify', url: 'https://open.spotify.com/artist/5tqSjP3EGoOTriKogeTNO2' },
  { label: 'YouTube', url: 'https://www.youtube.com/@leonsomov' },
  { label: 'Instagram', url: 'https://www.instagram.com/leonsomov' },
]

export function App() {
  const [bioExpanded, setBioExpanded] = useState(false)

  return (
    <>
      <FogCanvas />
      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.monogramHeading} aria-label="Leon Somov">
            <span className="sr-only">Leon Somov</span>
            <Monogram className={styles.monogramSvg} />
          </h1>
          <p className={styles.heroTagline}>composer / producer / sound artist</p>
        </section>

        {/* Atmospheric silhouette — full bleed */}
        <div className={styles.atmosphereWrap}>
          <img
            src="/photos/long-exposure-1.webp"
            alt=""
            className={styles.atmosphereImg}
          />
        </div>

        {/* Bio — short intro always visible, full bio expandable */}
        <section className={styles.bioSection}>
          <div className={styles.contentWrap}>
            <div className={styles.bioIntro}>
              <p className={styles.bioLead}>
                Two decades of shaping electronic music — from concert halls
                and club systems to film scores, theatre stages, and interactive
                installations across the world.
              </p>
              <p className={styles.bioSummary}>
                Award-winning composer and producer. Modular synth enthusiast.
                MTV Europe Music Awards recipient. BBC Radio 1 featured artist.
                Sound synthesis educator.
              </p>
            </div>

            <div
              className={styles.bioFull}
              style={{
                maxHeight: bioExpanded ? '2000px' : '0',
                opacity: bioExpanded ? 1 : 0,
              }}
            >
              <p className={styles.bioBody}>
                Leon Somov is a composer, producer, and modular synth enthusiast
                whose career spans over twenty years of genre-defying work. With
                Jazzu he built one of the Baltic region's most celebrated electronic
                acts — seven albums, two MTV Europe Music Awards for Best Baltic Act,
                multiple M.A.M.A. awards including Band of the Year and Producer of
                the Year, and a live show that redefined what electronic music could
                be on stage.
              </p>
              <p className={styles.bioBody}>
                His production work reached Steve Angello's SIZE Records through the
                Highly Sedated project, with their debut single broadcasted on BBC
                Radio 1. The project later recorded a live orchestral album with the
                Lithuanian Chamber Orchestra at the Palace of the Grand Dukes of
                Lithuania — a collision of electronic music and classical tradition.
              </p>
              <p className={styles.bioBody}>
                Beyond the studio, Leon creates interactive audiovisual exhibitions
                and immersive sound installations, with works shown in Brussels and
                Vilnius. He composes for film — including the original score for
                "Ruta" — and has written music for productions by the legendary
                theatre director Eimuntas Nekrosius. His jingles have aired on M-1,
                Lithuania's biggest commercial radio station, and he crafts sound
                identities for companies and brands.
              </p>
              <p className={styles.bioBody}>
                In 2024, he set a Lithuanian national record by performing live on a
                synthesizer from a plane flying at 300 meters over the Curonian
                Lagoon, streamed in real time via 5G. Recent performances have taken
                him to Los Angeles, Portland, and India's Ziro Festival of Music,
                with many more to come.
              </p>
              <p className={styles.bioBody}>
                His latest project, Cello Duo, pairs experimental electronics with
                cello for a vinyl-only release. As a member of Geeky Punks, he
                teaches sound synthesis — bringing the same depth to education that
                he brings to every recording, and working to make the world of
                modular synths accessible to everyone.
              </p>
            </div>

            <button
              className={styles.bioToggle}
              onClick={() => setBioExpanded(!bioExpanded)}
              aria-expanded={bioExpanded}
            >
              {bioExpanded ? 'less' : 'read more'}
            </button>
          </div>
        </section>

        {/* Performance — hands on modular */}
        <div className={styles.photoFull}>
          <img
            src="/photos/performance-1.webp"
            alt=""
            className={styles.photoFullImg}
            loading="lazy"
          />
        </div>

        {/* Projects */}
        <section className={styles.projectsSection}>
          <div className={styles.contentWrap}>
            <h2 className={styles.sectionLabel}>selected work</h2>
            <div className={styles.projectList}>
              {projects.map((p) => (
                <div key={p.name} className={styles.projectRow}>
                  <span className={styles.projectName}>{p.name}</span>
                  <span className={styles.projectDesc}>{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gear close-up */}
        <div className={styles.dividerStrip}>
          <img
            src="/photos/gear-detail.webp"
            alt=""
            className={styles.dividerImg}
            loading="lazy"
          />
        </div>

        {/* Sessions */}
        <SessionSection
          title="modular sessions"
          embedUrl="https://www.youtube.com/embed/videoseries?list=PLwWE9mKZM0Clbh7_8jaYmDk88Dj6hljNf"
        />

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.contentWrap}>
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
            <p className={styles.credit}>Photos by Ieva Jura</p>
          </div>
        </footer>
      </main>
    </>
  )
}
