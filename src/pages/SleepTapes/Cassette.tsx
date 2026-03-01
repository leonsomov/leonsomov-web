import { useState, useEffect } from 'react'
import styles from './SleepTapes.module.css'

const SPIN = ['-', '\\', '|', '/']

interface CassetteProps {
  currentTrack: number | null
  isPlaying: boolean
  onClickBody: () => void
  onClickTrack: (index: number) => void
}

export function Cassette({
  currentTrack,
  isPlaying,
  onClickBody,
  onClickTrack,
}: CassetteProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 200)
    return () => clearInterval(id)
  }, [isPlaying])

  const hub = isPlaying ? SPIN[frame] : 'o'
  const t = (i: number) =>
    currentTrack === i ? styles.activeTrack : styles.track

  const clickTrack = (i: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onClickTrack(i)
  }

  return (
    <pre className={styles.tape} onClick={onClickBody}>
{'.-----------------------------------------------------.\n'}
{'|                                                     |\n'}
{"|  .-----------------------------------------------.  |\n"}
{'|  |                                               |  |\n'}
{'|  |             '}<span className={styles.title}>{'S L E E P   T A P E S'}</span>{'             |  |\n'}
{'|  |                                               |  |\n'}
{'|  |              '}<span className={t(0)} onClick={clickTrack(0)}>I</span>{'       '}<span className={t(1)} onClick={clickTrack(1)}>II</span>{'      '}<span className={t(2)} onClick={clickTrack(2)}>III</span>{'              |  |\n'}
{'|  |                                               |  |\n'}
{'|  |              '}<span className={styles.subtitle}>{'beautiful  memories'}</span>{'              |  |\n'}
{'|  |                                               |  |\n'}
{"|  '-----------------------------------------------'  |\n"}
{'|                                                     |\n'}
{"|  .-----------------------------------------------.  |\n"}
{'|  |            .---.             .---.            |  |\n'}
{'|  |            | '}<span className={styles.reel}>{hub}</span>{' |=============| '}<span className={styles.reel}>{hub}</span>{' |            |  |\n'}
{'|  |            \'---\'             \'---\'            |  |\n'}
{"|  '-----------------------------------------------'  |\n"}
{'|                                                     |\n'}
{'|         ___________             ___________         |\n'}
{"|________/           \\___________/           \\________|\n"}
{"'-----------------------------------------------------'"}
    </pre>
  )
}
