<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Templat Kosong Jadwal Belajar</title>
    <style>
        @page { margin: 15mm 15mm 16mm 15mm; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; color: #202833; font-size: 9pt; line-height: 1.4; }
        h1 { font-size: 17pt; margin: 0 0 4px; }
        h2 { font-size: 12pt; margin: 14px 0 7px; }
        p { margin: 4px 0 8px; }
        .muted { color: #596575; }
        .top { border-bottom: 1px solid #9aa4b2; padding-bottom: 8px; margin-bottom: 10px; }
        .identity { width: 100%; border-collapse: collapse; margin-top: 9px; }
        .identity td { padding: 3px 4px 3px 0; }
        .line { display: inline-block; border-bottom: 1px solid #596575; height: 15px; }
        .w-identity { width: 240px; }
        .w-date { width: 120px; }
        table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.grid th, table.grid td { border: 1px solid #8f99a6; padding: 5px; vertical-align: top; }
        table.grid th { text-align: left; font-weight: bold; }
        .schedule th:nth-child(1) { width: 15%; }
        .schedule th:nth-child(2) { width: 18%; }
        .schedule th:nth-child(3) { width: 47%; }
        .schedule th:nth-child(4) { width: 20%; }
        .schedule td { height: 23px; }
        .tasks th:nth-child(1) { width: 7%; }
        .tasks th:nth-child(2) { width: 37%; }
        .tasks th:nth-child(3) { width: 23%; }
        .tasks th:nth-child(4) { width: 15%; }
        .tasks th:nth-child(5) { width: 18%; }
        .tasks td { height: 27px; }
        .page-break { page-break-before: always; }
        .question { border: 1px solid #9aa4b2; padding: 8px; margin-bottom: 8px; page-break-inside: avoid; }
        .answer-lines { height: 42px; border-bottom: 1px dotted #aeb7c2; margin-top: 5px; }
        .score { margin: 8px 0 12px; }
        .footer { border-top: 1px solid #c6cdd5; margin-top: 12px; padding-top: 6px; color: #596575; font-size: 8pt; }
    </style>
</head>
<body>
    <div class="top">
        <h1>Templat Jadwal Belajar Mingguan</h1>
        <p class="muted">Jadwal Belajarku · Lembar kosong untuk dicetak dan diisi</p>
        <table class="identity">
            <tr>
                <td>Nama: <span class="line w-identity"></span></td>
                <td>Kelas: <span class="line w-date"></span></td>
                <td>Minggu ke: <span class="line" style="width:45px"></span></td>
            </tr>
            <tr><td colspan="3">Periode tanggal: <span class="line" style="width:250px"></span></td></tr>
        </table>
    </div>

    <h2>1. Tabel jadwal mingguan</h2>
    <p class="muted">Tuliskan kegiatan dan waktu yang ingin kamu rencanakan. Sisakan waktu untuk istirahat dan kegiatan lain.</p>
    <table class="grid schedule">
        <thead><tr><th>Hari</th><th>Waktu</th><th>Kegiatan</th><th>Jenis</th></tr></thead>
        <tbody>
            @foreach ($hari as $namaHari)
                @for ($baris = 0; $baris < 3; $baris++)
                    <tr>
                        @if ($baris === 0)<td rowspan="3">{{ $namaHari }}</td>@endif
                        <td></td><td></td><td></td>
                    </tr>
                @endfor
            @endforeach
        </tbody>
    </table>

    <div class="page-break"></div>
    <div class="top">
        <h1>Daftar Tugas dan Refleksi</h1>
        <p class="muted">Lanjutkan mengisi lembar latihan belajarmu.</p>
    </div>

    <h2>2. Daftar tugas</h2>
    <p class="muted">Catat tugas, tenggat, dan perkiraan waktu yang kamu perlukan.</p>
    <table class="grid tasks">
        <thead><tr><th>No.</th><th>Mata pelajaran / tugas</th><th>Tenggat</th><th>Durasi</th><th>Prioritas</th></tr></thead>
        <tbody>
            @for ($i = 1; $i <= 8; $i++)
                <tr><td>{{ $i }}</td><td></td><td></td><td></td><td></td></tr>
            @endfor
        </tbody>
    </table>

    <h2>3. Refleksi mingguan</h2>
    <div class="question">
        <strong>Seberapa sesuai jadwal dengan keadaanmu minggu ini? (lingkari satu)</strong>
        <div class="score">1 — Belum sesuai &nbsp;&nbsp; 2 — Mulai tercapai &nbsp;&nbsp; 3 — Cukup sesuai &nbsp;&nbsp; 4 — Sangat sesuai</div>
    </div>
    <div class="question">
        <strong>Hal apa yang berhasil kamu lakukan minggu ini?</strong>
        <div class="answer-lines"></div>
    </div>
    <div class="question">
        <strong>Hal apa yang terasa menantang?</strong>
        <div class="answer-lines"></div>
    </div>
    <div class="question">
        <strong>Hal apa yang ingin kamu coba minggu depan?</strong>
        <div class="answer-lines"></div>
    </div>

    <div class="footer">Contoh isian dan pembagian waktu bukan aturan wajib. Sesuaikan dengan kebutuhan dan kegiatanmu.</div>
</body>
</html>
