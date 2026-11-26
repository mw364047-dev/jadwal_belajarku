import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

const days = [
  { name: 'Senin', short: 'Sen', items: [{ time: '15.30', title: 'Istirahat', kind: 'rest' }, { time: '16.00', title: 'Matematika', kind: 'study' }] },
  { name: 'Selasa', short: 'Sel', items: [{ time: '15.45', title: 'Mengerjakan tugas', kind: 'task' }, { time: '16.30', title: 'Bahasa Indonesia', kind: 'study' }] },
  { name: 'Rabu', short: 'Rab', items: [{ time: '15.30', title: 'Istirahat', kind: 'rest' }, { time: '16.00', title: 'IPA', kind: 'study' }] },
  { name: 'Kamis', short: 'Kam', items: [{ time: '16.00', title: 'IPS', kind: 'study' }, { time: '17.00', title: 'Membaca', kind: 'task' }] },
  { name: 'Jumat', short: 'Jum', items: [{ time: '14.30', title: 'Waktu bebas', kind: 'rest' }, { time: '16.00', title: 'Mengulang materi', kind: 'study' }] },
  { name: 'Sabtu', short: 'Sab', items: [{ time: '09.00', title: 'Menyelesaikan tugas', kind: 'task' }] },
  { name: 'Minggu', short: 'Min', items: [{ time: '16.00', title: 'Menyiapkan pekan', kind: 'rest' }] },
]

const features = [
  { number: '01', title: 'Catat tugas', description: 'Simpan mata pelajaran, tenggat, dan perkiraan waktu yang kamu perlukan.', mark: 'Daftar tugas' },
  { number: '02', title: 'Susun jadwal mingguan', description: 'Atur waktu belajar, istirahat, ibadah, dan kegiatan lainnya.', mark: 'Rencana mingguan' },
  { number: '03', title: 'Tinjau dan refleksikan', description: 'Lihat kembali rencanamu dan catat hal yang ingin kamu perbaiki.', mark: 'Catatan refleksi' },
]

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    task: <><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2m4 0h2M8 16.5h2"/></>,
    reflection: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 6h16M8 10h8M8 14h6"/></>,
  }
  return <svg {...common}>{paths[name] || paths.book}</svg>
}

function PlannerDemo() {
  const [activeDay, setActiveDay] = useState(0)
  const active = days[activeDay]

  return (
    <div className="jb-planner" aria-label="Pratinjau jadwal belajar mingguan interaktif">
      <div className="jb-planner-topline">
        <span className="jb-paper-tab">Rencana mingguan</span>
        <span className="jb-week-note">Contoh, bebas disesuaikan</span>
      </div>
      <div className="jb-planner-heading">
        <div>
          <p className="jb-eyebrow">Buku rencana belajar</p>
          <h2>Jadwal pekan ini</h2>
        </div>
        <div className="jb-sticky-note" aria-label="Catatan kecil: sisihkan waktu istirahat">
          <span>catatan kecil</span>
          <strong>Jangan lupa<br />waktu jeda.</strong>
        </div>
      </div>

      <div className="jb-week-grid" role="group" aria-label="Pilih hari untuk melihat kegiatan">
        {days.map((day, index) => (
          <button
            key={day.name}
            type="button"
            className={`jb-day-button ${activeDay === index ? 'is-active' : ''}`}
            onClick={() => setActiveDay(index)}
            aria-pressed={activeDay === index}
            style={{ '--day-index': index }}
          >
            <span>{day.short}</span>
            <i className="jb-day-dots" aria-hidden="true">
              {day.items.map((item, itemIndex) => <b key={`${item.kind}-${itemIndex}`} className={`dot-${item.kind}`} />)}
            </i>
          </button>
        ))}
      </div>

      <div className="jb-agenda" aria-live="polite">
        <div className="jb-agenda-label">
          <strong>{active.name}</strong>
          <span>{active.items.length} kegiatan</span>
        </div>
        {active.items.map((item, index) => (
          <div className={`jb-agenda-item kind-${item.kind}`} key={`${active.name}-${item.time}-${item.title}`}>
            <span className="jb-agenda-time">{item.time}</span>
            <span className="jb-agenda-mark" aria-hidden="true" />
            <span className="jb-agenda-title">{item.title}</span>
            <span className="jb-agenda-kind">{item.kind === 'study' ? 'Belajar' : item.kind === 'task' ? 'Tugas' : 'Jeda'}</span>
          </div>
        ))}
      </div>
      <div className="jb-planner-footer">
        <span><i className="legend-study" /> Belajar</span>
        <span><i className="legend-task" /> Tugas</span>
        <span><i className="legend-rest" /> Istirahat</span>
      </div>
    </div>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  const links = [
    ['Fitur', '#fitur'],
    ['Cara kerja', '#cara-kerja'],
    ['Manfaat', '#manfaat'],
    ['Tentang', '#tentang'],
  ]

  return (
    <header className="jb-navbar">
      <div className="jb-nav-inner">
        <Link to="/" className="jb-brand" aria-label="Jadwal Belajarku, beranda">
          <img src="/images/logo-jadwal-belajarku.png" alt="Jadwal Belajarku" />
        </Link>
        <nav className={`jb-nav-links ${open ? 'is-open' : ''}`} aria-label="Navigasi utama">
          {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
        <Link className="jb-nav-login" to="/login">Masuk</Link>
        <button className="jb-menu-toggle" type="button" aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <Icon name={open ? 'close' : 'menu'} size={24}/>
        </button>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="jb-footer">
      <div className="jb-footer-main">
        <div className="jb-footer-brand">
          <img src="/images/logo-jadwal-belajarku.png" alt="Jadwal Belajarku" />
          <p>Media latihan belajar mingguan dan pendukung layanan Bimbingan dan Konseling.</p>
        </div>
        <div className="jb-footer-links">
          <strong>Jelajahi</strong>
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#manfaat">Manfaat</a>
          <Link to="/login">Masuk</Link>
        </div>
        <div className="jb-footer-links">
          <strong>Informasi</strong>
          <Link to="/bantuan-bk">Bantuan BK</Link>
          <Link to="/kebijakan-data">Kebijakan data</Link>
          <Link to="/batasan-produk">Batas produk</Link>
          <a href={`${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/cetak/templat`} target="_blank" rel="noreferrer">Templat jadwal kosong</a>
        </div>
        <div className="jb-footer-links">
          <strong>Kontak</strong>
          <p>Hubungi guru BK melalui mekanisme komunikasi yang berlaku di sekolahmu.</p>
        </div>
      </div>
      <div className="jb-footer-bottom">
        <span>© {new Date().getFullYear()} Jadwal Belajarku</span>
        <span>Media pendukung latihan belajar, bukan pengganti konseling.</span>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="jb-landing">
      <a className="jb-skip-link" href="#konten">Lewati ke konten</a>
      <Navbar />

      <section className="jb-hero" id="konten">
        <div className="jb-hero-copy">
          <span className="jb-intro-label"><i /> Media pendukung layanan Bimbingan dan Konseling</span>
          <h1>Atur waktu belajar, mulai dari langkah kecil.</h1>
          <p className="jb-hero-description">Catat kegiatan, susun jadwal mingguan, dan lihat kembali rencana belajarmu dengan cara yang sederhana.</p>
          <div className="jb-hero-actions">
            <Link className="jb-button jb-button-primary" to="/login">Masuk</Link>
            <a className="jb-button jb-button-secondary" href="#cara-kerja">Lihat cara kerja</a>
          </div>
          <p className="jb-for-whom">Untuk siswa kelas VIII dan guru BK</p>
        </div>
        <div className="jb-hero-visual">
          <PlannerDemo />
        </div>
      </section>

      <section className="jb-section jb-feature-section" id="fitur">
        <div className="jb-section-heading">
          <span className="jb-section-kicker">Isi buku rencanamu</span>
          <h2>Hal penting untuk mengatur kegiatan belajar</h2>
          <p>Mulai dari mencatat hal yang perlu dikerjakan, lalu sesuaikan dengan waktumu.</p>
        </div>
        <div className="jb-feature-list">
          {features.map((feature, index) => (
            <article className="jb-feature-row" key={feature.number}>
              <span className="jb-feature-number">{feature.number}</span>
              <span className="jb-feature-icon"><Icon name={index === 0 ? 'task' : index === 1 ? 'calendar' : 'reflection'} size={25}/></span>
              <div className="jb-feature-copy">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
              <span className="jb-feature-mark">{feature.mark}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="jb-section jb-how-section" id="cara-kerja">
        <div className="jb-section-heading">
          <span className="jb-section-kicker">Mulai dari hal sederhana</span>
          <h2>Tiga langkah untuk memulai</h2>
          <p>Kamu bisa menyesuaikan rencana saat kegiatan atau kebutuhan berubah.</p>
        </div>
        <ol className="jb-steps">
          <li><span className="jb-step-number">1</span><div><h3>Masuk ke aplikasi</h3><p>Gunakan akun yang diberikan oleh sekolah.</p></div></li>
          <li><span className="jb-step-number">2</span><div><h3>Susun jadwal belajar</h3><p>Catat tugas, pilih prioritas, dan atur waktunya.</p></div></li>
          <li><span className="jb-step-number">3</span><div><h3>Pantau perkembangan</h3><p>Tinjau rencana dan tuliskan refleksi mingguan.</p></div></li>
        </ol>
      </section>

      <section className="jb-section jb-benefit-section" id="manfaat">
        <div className="jb-section-heading">
          <span className="jb-section-kicker">Ruang belajar bersama</span>
          <h2>Manfaat untuk kegiatan belajar dan pendampingan</h2>
        </div>
        <div className="jb-benefit-columns">
          <article className="jb-benefit-column">
            <h3>Untuk siswa</h3>
            <ul>
              <li><Icon name="check" size={18}/> Melihat tugas dan tenggat dalam satu tempat.</li>
              <li><Icon name="check" size={18}/> Membuat jadwal yang sesuai dengan rutinitas.</li>
              <li><Icon name="check" size={18}/> Meninjau pengalaman belajar melalui refleksi.</li>
            </ul>
          </article>
          <article className="jb-benefit-column">
            <h3>Untuk guru BK</h3>
            <ul>
              <li><Icon name="check" size={18}/> Melihat perkembangan latihan siswa binaan.</li>
              <li><Icon name="check" size={18}/> Memberikan komentar dan umpan balik.</li>
              <li><Icon name="check" size={18}/> Mendokumentasikan ringkasan layanan BK.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="jb-section jb-about-section" id="tentang">
        <div className="jb-about-paper">
          <div>
            <span className="jb-section-kicker">Tentang Jadwal Belajarku</span>
            <h2>Rencana yang baik tetap memberi ruang untuk berubah.</h2>
            <p>Aplikasi ini menjadi media latihan menyusun jadwal belajar mingguan dan pendukung layanan BK bidang belajar. Isinya dapat disesuaikan dengan kegiatan serta kebutuhan setiap siswa.</p>
          </div>
          <span className="jb-about-stamp">Boleh<br/>disesuaikan</span>
        </div>
      </section>

      <section className="jb-cta-section">
        <div className="jb-cta-note" aria-hidden="true">catatan<br/>mingguan</div>
        <div>
          <span className="jb-cta-kicker">Mulai dari satu langkah</span>
          <h2>Mulai atur waktu belajarmu.</h2>
          <p>Catat satu kegiatan yang ingin kamu mulai minggu ini.</p>
        </div>
        <Link to="/login" className="jb-cta-button">Masuk</Link>
      </section>

      <Footer />
    </main>
  )
}
