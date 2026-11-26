<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Jadwal Belajar Mingguan</title>
    <style>
        @page { margin: 18mm 16mm 18mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; color: #202833; font-size: 9.5pt; line-height: 1.45; background: #fff; }
        h1 { font-size: 18pt; margin: 0 0 3px; color: #172033; }
        h2 { font-size: 12pt; margin: 18px 0 8px; color: #172033; }
        .muted { color: #596575; }
        .header { border-bottom: 1px solid #9aa4b2; padding-bottom: 12px; margin-bottom: 14px; }
        .identity { width: 100%; margin-top: 12px; border-collapse: collapse; }
        .identity td { padding: 4px 10px 4px 0; vertical-align: top; }
        .identity .label { width: 75px; color: #596575; }
        table.data { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.data th, table.data td { border: 1px solid #aeb7c2; padding: 6px 7px; text-align: left; vertical-align: top; }
        table.data th { font-size: 8.5pt; font-weight: bold; background: #fff; }
        table.data td { overflow-wrap: break-word; }
        .col-day { width: 15%; }
        .col-time { width: 17%; }
        .col-type { width: 18%; }
        .col-content { width: 50%; }
        .sub { display: block; margin-top: 3px; color: #596575; font-size: 8pt; }
        .empty { color: #596575; text-align: center !important; padding: 16px !important; }
        .reflection { page-break-inside: auto; }
        .reflection-block { border: 1px solid #aeb7c2; padding: 9px 10px; margin-bottom: 8px; page-break-inside: avoid; }
        .reflection-label { font-weight: bold; margin-bottom: 4px; }
        .note { border-top: 1px solid #c6cdd5; padding-top: 8px; margin-top: 16px; font-size: 8pt; color: #596575; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Jadwal Belajar Mingguan</h1>
        <div class="muted">Jadwal Belajarku · Latihan menyusun waktu belajar</div>
        <table class="identity">
            <tr>
                <td class="label">Nama</td><td><strong>{{ $nama }}</strong></td>
                <td class="label">Kelas</td><td><strong>{{ $kelas }}</strong></td>
            </tr>
            <tr>
                <td class="label">Periode</td><td colspan="3">Minggu ke-{{ $minggu }} tahun {{ $tahun }} · {{ $rentangTanggal }}</td>
            </tr>
        </table>
    </div>

    <h2>Rencana kegiatan</h2>
    <table class="data">
        <thead>
            <tr>
                <th class="col-day">Hari</th>
                <th class="col-time">Waktu</th>
                <th class="col-type">Jenis</th>
                <th class="col-content">Kegiatan</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($jadwal as $item)
                <tr>
                    <td>{{ $item['hari'] }}</td>
                    <td>{{ $item['waktu'] }}</td>
                    <td>{{ $item['jenis'] }}</td>
                    <td>
                        {{ $item['kegiatan'] }}
                        @if ($item['tugas']) <span class="sub">Tugas: {{ $item['tugas'] }}</span> @endif
                        @if ($item['catatan']) <span class="sub">Catatan: {{ $item['catatan'] }}</span> @endif
                    </td>
                </tr>
            @empty
                <tr><td colspan="4" class="empty">Belum ada kegiatan yang disusun untuk minggu ini.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="reflection">
        <h2>Refleksi mingguan</h2>
        @if ($refleksi)
            <div class="reflection-block">
                <div class="reflection-label">Seberapa sesuai jadwal dengan keadaanmu?</div>
                {{ $skorLabel[$refleksi->skor_realistis] ?? 'Belum dipilih' }} ({{ $refleksi->skor_realistis ?? '—' }}/4)
            </div>
            <div class="reflection-block">
                <div class="reflection-label">Hal yang berhasil dilakukan</div>
                {!! nl2br(e($refleksi->terlaksana ?: 'Belum ada catatan.')) !!}
            </div>
            <div class="reflection-block">
                <div class="reflection-label">Hal yang terasa menantang</div>
                {!! nl2br(e($refleksi->hambatan ?: 'Belum ada catatan.')) !!}
            </div>
            <div class="reflection-block">
                <div class="reflection-label">Hal yang ingin dicoba berikutnya</div>
                {!! nl2br(e($refleksi->perbaikan ?: 'Belum ada catatan.')) !!}
            </div>
            @if ($refleksi->hanya_untuk_saya)
                <div class="note">Refleksi ini ditandai pribadi dan dicetak untuk pemilik akun.</div>
            @endif
        @else
            <div class="reflection-block muted">Belum ada refleksi yang disimpan untuk minggu ini.</div>
        @endif
    </div>

    <div class="note">Dokumen ini merupakan lembar latihan belajar. Jadwal dapat disesuaikan dengan kegiatan dan kebutuhanmu.</div>
</body>
</html>
