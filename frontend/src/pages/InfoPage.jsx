import { Link } from 'react-router-dom'
import { Badge, Card } from '../components/index.js'

const pages = {
  bantuan: {
    badge: 'Bantuan BK',
    title: 'Kamu tidak harus menyusun semuanya sendiri.',
    description: 'Jika kamu merasa kesulitan mengatur waktu belajar atau ingin membicarakan cara belajar yang sesuai, Guru BK dapat membantu.',
    sections: [
      {
        title: 'Kapan dapat meminta bantuan?',
        body: 'Kamu dapat menghubungi Guru BK ketika jadwal terasa sulit dijalankan, tugas menumpuk, ada kegiatan yang berbenturan, atau kamu ingin mencari cara belajar yang lebih sesuai.',
      },
      {
        title: 'Bagaimana cara menghubungi Guru BK?',
        body: 'Gunakan mekanisme yang berlaku di sekolah, misalnya menemui Guru BK pada waktu yang disediakan, menghubungi melalui wali kelas, atau mengikuti jadwal layanan BK sekolah.',
      },
      {
        title: 'Apa yang perlu disampaikan?',
        body: 'Ceritakan bagian yang ingin kamu diskusikan dan bantuan seperti apa yang kamu harapkan. Kamu boleh memulai dari hal sederhana. Tidak perlu menuliskan informasi pribadi yang tidak diperlukan di aplikasi.',
      },
    ],
  },
  kebijakan: {
    badge: 'Kebijakan Data',
    title: 'Data apa yang disimpan dan siapa yang dapat melihatnya?',
    description: 'Jadwal Belajarku menyimpan data seperlunya untuk mendukung latihan menyusun jadwal belajar dan pengelolaan layanan BK.',
    sections: [
      {
        title: 'Data yang disimpan',
        body: 'Data akun seperti nama, username, peran, status akun, dan waktu login. Data dasar siswa berupa nama, NIS, dan kelas. Data latihan meliputi daftar tugas, jadwal mingguan, dan refleksi. Sistem juga menyimpan komentar Guru BK, ringkasan aktivitas, serta ringkasan pencatatan layanan BK sesuai fungsi masing-masing.',
      },
      {
        title: 'Apa yang dapat dilihat siswa?',
        body: 'Siswa dapat melihat dan mengelola data latihan miliknya sendiri, termasuk tugas, jadwal, refleksi, riwayat, materi belajar, dan komentar Guru BK yang ditujukan kepadanya.',
      },
      {
        title: 'Apa yang dapat dilihat Guru BK?',
        body: 'Guru BK dapat melihat latihan belajar siswa yang menjadi binaannya, termasuk tugas, jadwal mingguan, dan refleksi. Jika siswa mengaktifkan pilihan “hanya untuk saya” pada refleksi, Guru BK hanya melihat status bahwa refleksi sudah terisi atau belum, bukan isi refleksinya.',
      },
      {
        title: 'Apa yang dapat dilihat admin?',
        body: 'Admin mengelola akun, data siswa, kelas, penugasan, materi, dan log aktivitas. Admin dapat melihat ringkasan layanan BK seperti guru, siswa atau kelas, jenis layanan, dan tanggal. Isi topik serta tindak lanjut catatan layanan yang bersifat sensitif tidak ditampilkan pada rekap admin.',
      },
      {
        title: 'Gunakan data dengan bijak',
        body: 'Masukkan hanya informasi yang diperlukan untuk latihan. Hindari menulis kata sandi, alamat, nomor telepon, atau cerita pribadi yang sensitif di kolom tugas, jadwal, maupun refleksi. Penggunaan data siswa nyata perlu mengikuti izin dan persetujuan yang berlaku di sekolah.',
      },
    ],
  },
  batasan: {
    badge: 'Batas Produk',
    title: 'Jadwal Belajarku adalah media latihan, bukan pengganti konseling.',
    description: 'Aplikasi ini membantu siswa berlatih menyusun rencana belajar mingguan melalui tugas, prioritas, perkiraan durasi, jadwal, dan refleksi.',
    sections: [
      {
        title: 'Bukan layanan konseling daring',
        body: 'Aplikasi ini tidak menggantikan pertemuan atau layanan Bimbingan dan Konseling di sekolah. Jika membutuhkan pendampingan, siswa tetap dapat menghubungi Guru BK sesuai mekanisme sekolah.',
      },
      {
        title: 'Tidak melakukan diagnosis atau penilaian psikologis',
        body: 'Aplikasi tidak mendiagnosis kondisi psikologis, tidak memberikan label terhadap siswa, dan tidak menentukan apakah seorang siswa rajin atau tidak disiplin. Skor refleksi hanya menjadi bahan bagi siswa untuk menilai apakah rencananya terasa realistis.',
      },
      {
        title: 'Contoh bukan aturan wajib',
        body: 'Materi dan contoh jadwal merupakan bahan inspirasi. Setiap siswa dapat menyesuaikan hari, jam, kegiatan, dan durasi berdasarkan kebutuhan serta keadaan masing-masing.',
      },
      {
        title: 'Hasil tetap perlu ditinjau bersama',
        body: 'Aplikasi tidak menjamin perubahan kebiasaan atau hasil belajar. Keputusan pendampingan dan tindak lanjut tetap dilakukan bersama Guru BK dan pihak sekolah sesuai kebutuhan.',
      },
    ],
  },
}

export default function InfoPage({ type = 'bantuan' }) {
  const page = pages[type] || pages.bantuan

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-belajar-100 bg-gradient-to-br from-white via-white to-belajar-50 p-5 shadow-soft sm:p-8">
        <Badge variant="blue">{page.badge}</Badge>
        <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">{page.title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{page.description}</p>
      </section>

      <div className="space-y-4">
        {page.sections.map((section, index) => (
          <Card key={section.title}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-belajar-50 text-sm font-bold text-belajar-700">{index + 1}</span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
                <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-600">{section.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/materi" className="font-semibold text-belajar-700 hover:text-belajar-900">Baca materi belajar →</Link>
        <Link to="/" className="font-semibold text-slate-600 hover:text-slate-900">Kembali ke halaman awal</Link>
      </div>
    </div>
  )
}
