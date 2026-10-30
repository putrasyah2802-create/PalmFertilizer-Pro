// ============== STATE ==============
let currentUser = null;

// ============== AUTH ==============
function toggleForm(type) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(type + 'Form').classList.add('active');
}

// Register
document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;

  if (pass !== pass2) {
    showToast('❌ Password tidak cocok!', '#dc2626');
    return;
  }

  let users = JSON.parse(localStorage.getItem('pcp_users') || '[]');
  if (users.find(u => u.email === email)) {
    showToast('❌ Email sudah terdaftar!', '#dc2626');
    return;
  }

  users.push({ name, email, pass });
  localStorage.setItem('pcp_users', JSON.stringify(users));
  showToast('✅ Registrasi berhasil! Silakan masuk.', '#16a34a');
  toggleForm('login');
  document.getElementById('loginEmail').value = email;
});

// Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;

  const users = JSON.parse(localStorage.getItem('pcp_users') || '[]');
  const user = users.find(u => u.email === email && u.pass === pass);

  if (!user) {
    showToast('❌ Email atau password salah!', '#dc2626');
    return;
  }

  currentUser = user;
  localStorage.setItem('pcp_current', JSON.stringify(user));
  showToast(`✅ Selamat datang, ${user.name}!`, '#16a34a');
  setTimeout(enterApp, 600);
});

// Check session
window.addEventListener('load', () => {
  const saved = localStorage.getItem('pcp_current');
  if (saved) {
    currentUser = JSON.parse(saved);
    enterApp();
  }
});

function enterApp() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;
  document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  loadHistory();
}

function logout() {
  if (!confirm('Yakin ingin keluar?')) return;
  localStorage.removeItem('pcp_current');
  currentUser = null;
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('authPage').classList.remove('hidden');
  toggleForm('login');
  showToast('👋 Berhasil logout', '#134e4a');
}

// ============== NAVIGATION ==============
function showSection(section, el) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(section + 'Section').classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  const titles = {
    calc: 'Kalkulator Pemupukan',
    history: 'Riwayat Perhitungan',
    about: 'Tentang Aplikasi'
  };
  document.getElementById('pageTitle').textContent = titles[section];
  if (section === 'history') loadHistory();
}

// ============== KALKULASI ==============
// Dosis standar pupuk (kg/pohon/tahun) berdasarkan umur & jenis tanah
const DOSIS_STANDAR = {
  '0-3':   { N: 0.5, P: 0.25, K: 0.4, Mg: 0.1 },
  '4-8':   { N: 1.0, P: 0.5,  K: 0.9, Mg: 0.25 },
  '9-13':  { N: 1.5, P: 0.75, K: 1.4, Mg: 0.4 },
  '14-20': { N: 1.2, P: 0.6,  K: 1.1, Mg: 0.35 },
  '>20':   { N: 0.9, P: 0.45, K: 0.8, Mg: 0.3 }
};

const FAKTOR_TANAH = {
  mineral: 1.0,
  gambut: 1.2,
  pasir: 1.3,
  liat: 0.9
};

function hitungPemupukan() {
  const luas = parseFloat(document.getElementById('luas').value);
  const umur = document.getElementById('umur').value;
  const tanah = document.getElementById('tanah').value;
  const pohonPerHa = parseInt(document.getElementById('pohon').value);
  const harga = parseFloat(document.getElementById('harga').value);

  if (!luas || luas <= 0) {
    showToast('⚠️ Isi luas lahan terlebih dahulu!', '#f59e0b');
    return;
  }
  if (!harga || harga <= 0) {
    showToast('⚠️ Isi harga pupuk terlebih dahulu!', '#f59e0b');
    return;
  }

  const totalPohon = Math.round(luas * pohonPerHa);
  const dosis = DOSIS_STANDAR[umur];
  const faktor = FAKTOR_TANAH[tanah];

  // Hitung kebutuhan per jenis pupuk (Kg)
  const hasil = {};
  let totalKg = 0;
  for (const jenis in dosis) {
    const perPohon = dosis[jenis] * faktor;
    const totalJenis = perPohon * totalPohon;
    hasil[jenis] = { perPohon, totalKg: totalJenis };
    totalKg += totalJenis;
  }

  const totalBiaya = totalKg * harga;

  // Simpan hasil
  const result = {
    id: Date.now(),
    tanggal: new Date().toISOString(),
    luas, umur, tanah, pohonPerHa,
    totalPohon, harga, totalKg, totalBiaya, hasil
  };

  tampilkanHasil(result);
  simpanRiwayat(result);
}

function tampilkanHasil(r) {
  const box = document.getElementById('resultBox');
  const umurLabel = {
    '0-3': 'TBM (0-3 thn)',
    '4-8': 'TM Muda (4-8 thn)',
    '9-13': 'TM Dewasa (9-13 thn)',
    '14-20': 'TM Tua (14-20 thn)',
    '>20': 'TM Rentan (>20 thn)'
  }[r.umur];

  const tanahLabel = {
    mineral: 'Mineral', gambut: 'Gambut', pasir: 'Pasir', liat: 'Liat'
  }[r.tanah];

  let detailHTML = '';
  const nama = { N: 'Nitrogen (Urea)', P: 'Fosfor (TSP)', K: 'Kalium (KCl)', Mg: 'Magnesium (Kieserit)' };
  for (const j in r.hasil) {
    detailHTML += `
      <div class="row">
        <span>${nama[j]}</span>
        <span><b>${r.hasil[j].totalKg.toFixed(1)} Kg</b> (${r.hasil[j].perPohon.toFixed(2)} kg/phn)</span>
      </div>`;
  }

  box.innerHTML = `
    <div class="result-item"><span class="label">Luas Lahan</span><span class="value">${r.luas} Ha</span></div>
    <div class="result-item"><span class="label">Total Pohon</span><span class="value">${r.totalPohon.toLocaleString('id-ID')} pohon</span></div>
    <div class="result-item"><span class="label">Umur Tanaman</span><span class="value">${umurLabel}</span></div>
    <div class="result-item"><span class="label">Jenis Tanah</span><span class="value">${tanahLabel}</span></div>
    <div class="result-item"><span class="label">Total Kebutuhan Pupuk</span><span class="value">${r.totalKg.toFixed(1)} Kg</span></div>
    <div class="pupuk-detail">
      <h4>📦 Rincian Kebutuhan Pupuk</h4>
      ${detailHTML}
    </div>
    <div class="result-total">
      <span>💰 Estimasi Biaya</span>
      <span class="value">Rp ${r.totalBiaya.toLocaleString('id-ID')}</span>
    </div>
  `;
}

// ============== HISTORY ==============
function simpanRiwayat(result) {
  const key = 'pcp_history_' + currentUser.email;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift(result);
  localStorage.setItem(key, JSON.stringify(list));
  loadHistory();
}

function loadHistory() {
  if (!currentUser) return;
  const key = 'pcp_history_' + currentUser.email;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const container = document.getElementById('historyList');

  if (list.length === 0) {
    container.innerHTML = '<p class="empty">Belum ada riwayat perhitungan.</p>';
    return;
  }

  container.innerHTML = list.map(r => {
    const tgl = new Date(r.tanggal).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    return `
      <div class="history-item">
        <div class="h-info">
          <div class="h-title">${r.luas} Ha — ${r.totalKg.toFixed(1)} Kg pupuk</div>
          <div class="h-meta">${tgl} • ${r.totalPohon.toLocaleString('id-ID')} pohon</div>
        </div>
        <div class="h-cost">Rp ${r.totalBiaya.toLocaleString('id-ID')}</div>
      </div>`;
  }).join('');
}

function clearHistory() {
  if (!confirm('Hapus semua riwayat perhitungan?')) return;
  const key = 'pcp_history_' + currentUser.email;
  localStorage.removeItem(key);
  loadHistory();
  showToast('🗑️ Riwayat dihapus', '#134e4a');
}

// ============== TOAST ==============
function showToast(msg, bg = '#134e4a') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = bg;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============== CLOCK ==============
setInterval(() => {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}, 1000);