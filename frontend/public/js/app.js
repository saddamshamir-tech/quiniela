/* =========================================
   QUINIELA MUNDIAL FIFA 2026
   Frontend Application Logic
   ========================================= */

'use strict';

// ============ GLOBAL STATE ============
let currentUser = null;
let allMatches = [];
let allMatchesAdmin = [];
let currentGroupFilter = null;
let rankingData = [];
let countdownTimers = [];

// ============ API HELPER ============
async function api(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`/api${endpoint}`, options);
  } catch (networkErr) {
    throw new Error('Sin conexión con el servidor. Verifica tu internet.');
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error(`Error del servidor (${res.status}). Intenta de nuevo.`);
  }

  if (!res.ok) {
    throw new Error(data.error || 'Error del servidor');
  }
  return data;
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ============ MODAL ============
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function showConfirm(title, body, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-body').textContent = body;
  const btn = document.getElementById('confirm-ok-btn');
  btn.onclick = () => { closeModal('confirm-modal'); onConfirm(); };
  document.getElementById('confirm-modal').classList.remove('hidden');
}

// ============ AUTH TABS ============
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const btns = document.querySelectorAll('.tab-btn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    btns[0].classList.add('active');
    btns[1].classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    btns[0].classList.remove('active');
    btns[1].classList.add('active');
  }
}

// ============ LOGIN ============
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Por favor completa todos los campos', 'warning');
    return;
  }

  const btn = document.querySelector('#login-form .btn');
  btn.disabled = true;
  btn.textContent = '⏳ Entrando...';

  try {
    const data = await api('/auth/login', 'POST', { email, password });
    currentUser = data.user;
    showToast(`¡Bienvenido ${data.user.nombre}! 🎉`, 'success');
    showApp();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚽ Entrar a la Quiniela';
  }
}

// ============ REGISTER ============
async function handleRegister() {
  const nombre = document.getElementById('reg-nombre').value.trim();
  const apellido = document.getElementById('reg-apellido').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const token = document.getElementById('reg-token').value.trim().toUpperCase();

  if (!nombre || !apellido || !email || !password || !token) {
    showToast('Por favor completa todos los campos', 'warning');
    return;
  }

  const btn = document.querySelector('#register-form .btn');
  btn.disabled = true;
  btn.textContent = '⏳ Registrando...';

  try {
    const data = await api('/auth/register', 'POST', { nombre, apellido, email, password, token });
    currentUser = data.user;
    showToast(`¡Cuenta creada exitosamente! 🏆`, 'success');
    showApp();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Crear Cuenta';
  }
}

// ============ LOGOUT ============
async function handleLogout() {
  try {
    await api('/auth/logout', 'POST');
    currentUser = null;
    clearCountdowns();
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    switchAuthTab('login');
    showToast('Sesión cerrada. ¡Hasta pronto! 👋', 'info');
  } catch (err) {
    showToast('Error al cerrar sesión', 'error');
  }
}

// ============ SHOW APP ============
function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  updateNavUser();
  if (currentUser?.role === 'admin') {
    document.getElementById('nav-admin').classList.remove('hidden');
  }
  showPage('home');
}

function updateNavUser() {
  if (!currentUser) return;
  const initials = (currentUser.nombre[0] + currentUser.apellido[0]).toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('nav-username').textContent = `${currentUser.nombre} ${currentUser.apellido}`;
  document.getElementById('nav-points').textContent = `${currentUser.total_points || 0} pts`;
}

// ============ PAGE NAVIGATION ============
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`page-${page}`)?.classList.add('active');
  document.getElementById(`nav-${page}`)?.classList.add('active');

  switch (page) {
    case 'home': loadHomePage(); break;
    case 'matches': loadMatchesPage(); break;
    case 'ranking': loadRanking(); break;
    case 'admin': loadAdminPage(); break;
  }
}

// ============ HOME PAGE ============
async function loadHomePage() {
  await Promise.all([loadRankingPreview(), loadNextMatches(), loadMyStats()]);
}

async function loadMyStats() {
  try {
    const data = await api('/ranking');
    const me = data.ranking.find(r => r.id === currentUser.id);
    if (!me) return;

    const card = document.getElementById('my-stats-card');
    card.style.display = 'block';
    document.getElementById('my-stats-name').textContent = `${currentUser.nombre} ${currentUser.apellido}`;
    document.getElementById('my-total-pts').textContent = me.total_points;
    document.getElementById('my-results').textContent = me.correct_results;
    document.getElementById('my-exact').textContent = me.exact_scores;
    document.getElementById('my-position').textContent = me.position;

    // Update nav
    document.getElementById('nav-points').textContent = `${me.total_points} pts`;
    currentUser.total_points = me.total_points;
  } catch (e) {}
}

async function loadRankingPreview() {
  try {
    const data = await api('/ranking');
    rankingData = data.ranking;
    const top5 = data.ranking.slice(0, 5);
    const container = document.getElementById('home-ranking');
    container.innerHTML = renderRankingTable(top5, true);
  } catch (err) {
    document.getElementById('home-ranking').innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-text">No se pudo cargar el ranking</div></div>`;
  }
}

async function loadNextMatches() {
  try {
    const data = await api('/matches');
    const now = new Date();
    const upcoming = data.matches
      .filter(m => m.status === 'scheduled' && new Date(m.match_date) > now)
      .slice(0, 3);
    const container = document.getElementById('home-matches');
    if (upcoming.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏁</div><div class="empty-text">No hay partidos próximos disponibles</div></div>`;
      return;
    }
    container.innerHTML = `<div class="matches-grid">${upcoming.map(m => renderMatchCard(m)).join('')}</div>`;
  } catch (err) {
    document.getElementById('home-matches').innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-text">Error cargando partidos</div></div>`;
  }
}

// ============ MATCHES PAGE ============
async function loadMatchesPage() {
  try {
    // Load filters
    const groupsData = await api('/matches/groups');
    const filtersContainer = document.getElementById('group-filters');
    const groups = groupsData.groups;

    // Get unique rounds
    const rounds = [...new Set(groups.map(g => g.round))];
    let filtersHTML = `<button class="filter-tab active" onclick="filterMatches(null, this)">🌍 Todos</button>`;

    rounds.forEach(round => {
      const emoji = getRoundEmoji(round);
      filtersHTML += `<button class="filter-tab" onclick="filterMatches('${round}', this)">${emoji} ${round}</button>`;
    });

    filtersContainer.innerHTML = filtersHTML;

    // Load all matches
    const data = await api('/matches');
    allMatches = data.matches;
    renderMatchesList(allMatches);
  } catch (err) {
    document.getElementById('matches-container').innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-text">Error cargando partidos</div></div>`;
    showToast('Error al cargar partidos', 'error');
  }
}

function getRoundEmoji(round) {
  const map = {
    'Fase de Grupos': '🔵',
    'Octavos de Final': '⚡',
    'Cuartos de Final': '🔥',
    'Semifinal': '🌟',
    'Tercer Lugar': '🥉',
    'Final': '🏆'
  };
  return map[round] || '⚽';
}

function filterMatches(round, btn) {
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  currentGroupFilter = round;
  const filtered = round ? allMatches.filter(m => m.round === round) : allMatches;
  renderMatchesList(filtered);
}

function renderMatchesList(matches) {
  const container = document.getElementById('matches-container');
  if (matches.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏟️</div><div class="empty-text">No hay partidos en esta categoría</div></div>`;
    return;
  }

  // Group by round and date
  const grouped = {};
  matches.forEach(m => {
    const key = m.round + (m.group_name ? ` - Grupo ${m.group_name}` : '');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  let html = '';
  Object.entries(grouped).forEach(([group, groupMatches]) => {
    html += `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:0.85rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">${group}</span>
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.06);"></div>
        </div>
        <div class="matches-grid">
          ${groupMatches.map(m => renderMatchCard(m)).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  startCountdowns();
}

// ============ RENDER MATCH CARD ============
function renderMatchCard(match) {
  const matchDate = new Date(match.match_date);
  const isLocked = match.is_locked;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  const statusHTML = isLive
    ? `<span class="match-status status-live">🔴 En Vivo</span>`
    : isFinished
    ? `<span class="match-status status-finished">✅ Finalizado</span>`
    : isLocked
    ? `<span class="match-status status-locked">🔒 Bloqueado</span>`
    : `<span class="match-status status-scheduled" data-match-id="${match.id}" data-match-time="${match.match_date}">📅 Programado</span>`;

  const roundBadgeClass = match.round === 'Fase de Grupos' ? 'badge-group' : 'badge-knockout';
  const groupLabel = match.group_name ? `Grupo ${match.group_name}` : match.round;

  const scoreDisplay = isFinished || isLive
    ? `<div class="match-score">${match.home_score ?? '-'} - ${match.away_score ?? '-'}</div>`
    : `<div class="vs-text">VS</div>`;

  let predictionHTML = '';
  if (isFinished) {
    predictionHTML = renderFinishedPrediction(match);
  } else if (isLocked) {
    predictionHTML = `
      <div class="prediction-section">
        <div class="locked-overlay">🔒 Predicciones cerradas para este partido</div>
        ${match.prediction_id ? `<div class="prediction-saved mt-8">✅ Tu predicción: ${match.predicted_home_score} - ${match.predicted_away_score}</div>` : ''}
      </div>
    `;
  } else {
    predictionHTML = renderPredictionInput(match);
  }

  return `
    <div class="match-card ${isLocked ? 'locked' : ''} ${isFinished ? 'finished' : ''}" id="match-card-${match.id}">
      <div class="match-card-header">
        <div class="match-meta">
          <span class="match-round-badge ${roundBadgeClass}">${groupLabel}</span>
          <span>📍 ${match.city}</span>
        </div>
        ${statusHTML}
      </div>
      <div class="match-body">
        <div class="match-teams">
          <div class="team">
            <div class="team-flag">${match.home_flag || '🏳'}</div>
            <div class="team-name">${match.home_team_name}</div>
            <div class="team-code">${match.home_team_code}</div>
          </div>
          <div class="match-center">
            ${scoreDisplay}
            <div class="match-date-label">
              <span>📅</span>
              <span>${formatDate(matchDate)}</span>
            </div>
            <div class="match-time">${formatTime(matchDate)}</div>
          </div>
          <div class="team">
            <div class="team-flag">${match.away_flag || '🏳'}</div>
            <div class="team-name">${match.away_team_name}</div>
            <div class="team-code">${match.away_team_code}</div>
          </div>
        </div>
        <div class="match-venue">🏟️ ${match.venue}</div>
      </div>
      ${predictionHTML}
    </div>
  `;
}

function renderPredictionInput(match) {
  const hasPrediction = match.prediction_id;
  const homeVal = hasPrediction ? match.predicted_home_score : '';
  const awayVal = hasPrediction ? match.predicted_away_score : '';

  return `
    <div class="prediction-section">
      <div class="prediction-label">🎯 Tu Predicción ${hasPrediction ? '<span style="color:var(--green);">· Guardada</span>' : ''}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div class="score-inputs">
          <div class="score-input-group">
            <span class="score-flag">${match.home_flag || '🏳'}</span>
            <input type="number" class="score-input" 
              id="pred-home-${match.id}" 
              value="${homeVal}" 
              min="0" max="20" placeholder="0"
              onchange="validateScoreInput(this)">
          </div>
          <span class="score-separator">-</span>
          <div class="score-input-group">
            <input type="number" class="score-input" 
              id="pred-away-${match.id}" 
              value="${awayVal}" 
              min="0" max="20" placeholder="0"
              onchange="validateScoreInput(this)">
            <span class="score-flag">${match.away_flag || '🏳'}</span>
          </div>
        </div>
        <button class="save-prediction-btn" onclick="savePrediction(${match.id})" style="max-width:140px;">
          💾 Guardar
        </button>
      </div>
      ${hasPrediction ? `<div class="prediction-saved"><span>✅</span> Predicción guardada</div>` : ''}
    </div>
  `;
}

function renderFinishedPrediction(match) {
  if (!match.prediction_id) {
    return `
      <div class="prediction-section">
        <div style="color:var(--text-muted);font-size:0.8rem;">😕 No hiciste predicción para este partido</div>
        <div style="margin-top:8px;font-size:0.85rem;">
          Resultado final: <strong>${match.home_flag} ${match.home_score} - ${match.away_score} ${match.away_flag}</strong>
        </div>
      </div>
    `;
  }

  const resultPts = match.points_result || 0;
  const exactPts = match.points_exact || 0;
  const totalPts = resultPts + exactPts;

  return `
    <div class="prediction-section">
      <div class="prediction-label">🎯 Tu Predicción</div>
      <div class="prediction-result">
        <span style="font-size:0.85rem;font-weight:700;">
          ${match.home_flag} ${match.predicted_home_score} - ${match.predicted_away_score} ${match.away_flag}
        </span>
        ${resultPts > 0 ? `<span class="points-earned points-result-won">✅ +1 resultado</span>` : `<span class="points-earned points-missed">❌ resultado</span>`}
        ${exactPts > 0 ? `<span class="points-earned points-exact-won">⭐ +1 exacto</span>` : ''}
        ${totalPts > 0 ? `<span class="badge badge-gold" style="margin-left:auto;">+${totalPts} pts</span>` : ''}
      </div>
    </div>
  `;
}

// ============ SAVE PREDICTION ============
async function savePrediction(matchId) {
  const homeInput = document.getElementById(`pred-home-${matchId}`);
  const awayInput = document.getElementById(`pred-away-${matchId}`);

  if (homeInput.value === '' || awayInput.value === '') {
    showToast('Ingresa ambos marcadores para guardar', 'warning');
    return;
  }

  const predicted_home_score = parseInt(homeInput.value);
  const predicted_away_score = parseInt(awayInput.value);

  if (isNaN(predicted_home_score) || isNaN(predicted_away_score)) {
    showToast('Marcadores inválidos', 'error');
    return;
  }

  const btn = homeInput.closest('.prediction-section').querySelector('.save-prediction-btn');
  btn.disabled = true;
  btn.innerHTML = '⏳ Guardando...';

  try {
    await api('/predictions', 'POST', {
      match_id: matchId,
      predicted_home_score,
      predicted_away_score
    });
    showToast('¡Predicción guardada! 🎯', 'success');

    // Update match in allMatches
    const matchIdx = allMatches.findIndex(m => m.id === matchId);
    if (matchIdx >= 0) {
      allMatches[matchIdx].prediction_id = true;
      allMatches[matchIdx].predicted_home_score = predicted_home_score;
      allMatches[matchIdx].predicted_away_score = predicted_away_score;
    }

    // Visual feedback
    btn.innerHTML = '✅ Guardado';
    btn.style.background = 'rgba(0,208,132,0.2)';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar';
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);

  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '💾 Guardar';
  }
}

function validateScoreInput(input) {
  let val = parseInt(input.value);
  if (isNaN(val) || val < 0) input.value = 0;
  if (val > 20) input.value = 20;
}

// ============ RANKING ============
async function loadRanking() {
  const container = document.getElementById('ranking-body');
  container.innerHTML = '<div class="skeleton" style="height:300px;margin:8px;border-radius:8px;"></div>';
  try {
    const data = await api('/ranking');
    rankingData = data.ranking;
    container.innerHTML = renderRankingTable(data.ranking, false);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-text">Error cargando ranking</div></div>`;
    showToast('Error al cargar ranking', 'error');
  }
}

function renderRankingTable(ranking, preview = false) {
  if (ranking.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Aún no hay participantes</div></div>`;
  }

  return ranking.map((player, idx) => {
    const pos = player.position || idx + 1;
    const isMe = player.id === currentUser?.id;
    const rankClass = pos === 1 ? 'rank-1' : pos === 2 ? 'rank-2' : pos === 3 ? 'rank-3' : 'rank-other';
    const rankIcon = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const initials = (player.nombre[0] + player.apellido[0]).toUpperCase();

    return `
      <div class="ranking-row ${isMe ? 'current-user' : ''}">
        <div><span class="rank-badge ${rankClass}">${rankIcon}</span></div>
        <div class="player-info">
          <div class="player-avatar" style="${isMe ? 'background:linear-gradient(135deg,var(--gold),#ff9a3c);color:var(--primary);' : ''}">${initials}</div>
          <div>
            <div class="player-name">${player.nombre} ${player.apellido} ${isMe ? '👈' : ''}</div>
          </div>
        </div>
        <div class="points-total">${player.total_points}</div>
        <div class="stats-mini">
          <span class="stat-pill stat-green">✅ ${player.correct_results}</span>
        </div>
        <div class="stats-mini">
          <span class="stat-pill stat-gold">⭐ ${player.exact_scores}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============ ADMIN PAGE ============
async function loadAdminPage() {
  if (currentUser?.role !== 'admin') return;
  await Promise.all([loadAdminMatches(), loadTokens(), loadAdminUsers()]);
}

async function loadAdminMatches() {
  try {
    const data = await api('/admin/matches');
    allMatchesAdmin = data.matches;
    renderAdminMatches(allMatchesAdmin);
  } catch (err) {
    showToast('Error cargando partidos admin', 'error');
  }
}

function renderAdminMatches(matches) {
  const container = document.getElementById('admin-matches-list');
  if (matches.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-text">No hay partidos</div></div>`;
    return;
  }

  container.innerHTML = matches.map(m => {
    const matchDate = new Date(m.match_date);
    const statusColors = {
      scheduled: '#8892a4', live: 'var(--green)', finished: '#6366f1', postponed: 'var(--accent)'
    };
    const statusLabels = {
      scheduled: '📅 Programado', live: '🔴 En Vivo', finished: '✅ Finalizado', postponed: '⏸️ Aplazado'
    };

    return `
      <div class="admin-match-item">
        <div class="admin-match-teams">
          <span>${m.home_flag} ${m.home_team_name}</span>
          <span style="color:var(--text-muted);">vs</span>
          <span>${m.away_team_name} ${m.away_flag}</span>
          <span style="margin-left:auto;font-size:0.72rem;color:${statusColors[m.status] || 'white'};">${statusLabels[m.status] || m.status}</span>
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:8px;">
          📅 ${formatDate(matchDate)} ${formatTime(matchDate)} | 🏟️ ${m.venue} | 🎯 ${m.prediction_count} predicciones
        </div>
        ${m.status === 'finished'
          ? `<div style="font-size:0.82rem;color:var(--green);">✅ Resultado: ${m.home_score} - ${m.away_score}</div>`
          : `
          <div class="admin-score-form">
            <span style="font-size:0.78rem;color:var(--text-muted);">${m.home_flag}</span>
            <input type="number" class="admin-score-input" id="admin-home-${m.id}" value="${m.home_score ?? ''}" min="0" max="20" placeholder="0">
            <span style="color:var(--text-muted);">-</span>
            <input type="number" class="admin-score-input" id="admin-away-${m.id}" value="${m.away_score ?? ''}" min="0" max="20" placeholder="0">
            <span style="font-size:0.78rem;color:var(--text-muted);">${m.away_flag}</span>
            <button class="btn btn-success btn-sm" style="width:auto;padding:6px 12px;" onclick="saveMatchResult(${m.id})">💾</button>
            <select class="admin-score-input" style="width:auto;font-size:0.72rem;" id="admin-status-${m.id}" onchange="updateMatchStatus(${m.id}, this.value)">
              <option value="scheduled" ${m.status==='scheduled'?'selected':''}>Prog.</option>
              <option value="live" ${m.status==='live'?'selected':''}>Live</option>
              <option value="finished" ${m.status==='finished'?'selected':''}>Fin.</option>
              <option value="postponed" ${m.status==='postponed'?'selected':''}>Aplaz.</option>
            </select>
          </div>
          `
        }
      </div>
    `;
  }).join('');
}

function filterAdminMatches(searchVal) {
  const search = (searchVal || document.getElementById('admin-match-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('admin-status-filter')?.value;

  const filtered = allMatchesAdmin.filter(m => {
    const matchesSearch = !search ||
      m.home_team_name.toLowerCase().includes(search) ||
      m.away_team_name.toLowerCase().includes(search) ||
      m.city?.toLowerCase().includes(search) ||
      m.venue?.toLowerCase().includes(search);
    const matchesStatus = !statusFilter || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderAdminMatches(filtered);
}

async function saveMatchResult(matchId) {
  const homeScore = parseInt(document.getElementById(`admin-home-${matchId}`).value);
  const awayScore = parseInt(document.getElementById(`admin-away-${matchId}`).value);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    showToast('Ingresa ambos marcadores', 'warning');
    return;
  }

  try {
    await api(`/matches/${matchId}/result`, 'PUT', { home_score: homeScore, away_score: awayScore });
    showToast('✅ Resultado guardado y puntos calculados', 'success');
    loadAdminMatches();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateMatchStatus(matchId, status) {
  try {
    await api(`/matches/${matchId}/status`, 'PUT', { status });
    showToast('Estado actualizado', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadTokens() {
  try {
    const data = await api('/admin/tokens');
    const container = document.getElementById('tokens-list');
    const available = data.tokens.filter(t => !t.used);
    const used = data.tokens.filter(t => t.used);

    container.innerHTML = `
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:8px;">
        ${available.length} disponibles · ${used.length} usados
      </div>
      <div class="token-grid">
        ${available.map(t => `<span class="token-badge token-available">${t.token}</span>`).join('')}
        ${used.slice(0, 10).map(t => `<span class="token-badge token-used" title="Usado por: ${t.nombre || ''} ${t.apellido || ''}">${t.token}</span>`).join('')}
      </div>
    `;
  } catch (err) {
    showToast('Error cargando tokens', 'error');
  }
}

async function addToken() {
  const input = document.getElementById('new-token-input');
  const token = input.value.trim().toUpperCase();

  if (!token || token.length < 1) {
    showToast('Ingresa un token válido', 'warning');
    return;
  }

  try {
    await api('/admin/tokens', 'POST', { tokens: [token] });
    input.value = '';
    showToast(`Token "${token}" agregado`, 'success');
    loadTokens();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminUsers() {
  try {
    const data = await api('/admin/users');
    const container = document.getElementById('admin-users-list');
    container.innerHTML = `
      <div style="max-height:300px;overflow-y:auto;">
        ${data.users.map(u => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div>
              <div style="font-size:0.85rem;font-weight:600;">${u.nombre} ${u.apellido} ${u.role==='admin'?'👑':''}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">${u.email} · ${u.prediction_count} pred.</div>
            </div>
            <div class="badge badge-gold">${u.total_points} pts</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    showToast('Error cargando usuarios', 'error');
  }
}

async function createAdmin() {
  const nombre = document.getElementById('admin-nombre').value.trim();
  const apellido = document.getElementById('admin-apellido').value.trim();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-pass').value;

  if (!nombre || !apellido || !email || !password) {
    showToast('Completa todos los campos', 'warning');
    return;
  }

  try {
    await api('/admin/create-admin', 'POST', { nombre, apellido, email, password });
    showToast('Admin creado exitosamente 👑', 'success');
    ['admin-nombre', 'admin-apellido', 'admin-email', 'admin-pass'].forEach(id => document.getElementById(id).value = '');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============ COUNTDOWNS ============
function clearCountdowns() {
  countdownTimers.forEach(t => clearInterval(t));
  countdownTimers = [];
}

function startCountdowns() {
  clearCountdowns();

  document.querySelectorAll('[data-match-time]').forEach(el => {
    const matchTime = new Date(el.getAttribute('data-match-time'));
    const matchId = el.getAttribute('data-match-id');

    const timer = setInterval(() => {
      const now = new Date();
      const diff = matchTime - now;

      if (diff <= 0) {
        clearInterval(timer);
        el.textContent = '🔒 Cerrado';
        el.className = 'match-status status-locked';
        const card = document.getElementById(`match-card-${matchId}`);
        if (card) {
          const predSection = card.querySelector('.prediction-section');
          if (predSection) {
            const inputs = predSection.querySelectorAll('input');
            const btn = predSection.querySelector('.save-prediction-btn');
            inputs.forEach(i => i.disabled = true);
            if (btn) btn.disabled = true;
          }
        }
        return;
      }

      if (diff <= 5 * 60 * 1000) {
        // Less than 5 minutes
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        el.innerHTML = `⚠️ Cierra en ${mins}:${secs.toString().padStart(2,'0')}`;
        el.className = 'match-status countdown';
      } else if (diff <= 60 * 60 * 1000) {
        // Less than 1 hour
        const mins = Math.floor(diff / 60000);
        el.textContent = `⏰ En ${mins} min`;
      }
    }, 1000);

    countdownTimers.push(timer);
  });
}

// ============ DATE HELPERS ============
function formatDate(date) {
  return date.toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit'
  }) + ' (hora local)';
}

// ============ KEYBOARD NAVIGATION ============
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginEmail = document.getElementById('login-email');
    const loginPass = document.getElementById('login-password');
    if (document.activeElement === loginEmail || document.activeElement === loginPass) {
      handleLogin();
    }
  }
});

// ============ INIT ============
async function init() {
  try {
    const data = await api('/auth/me');
    currentUser = data.user;
    showApp();
  } catch (err) {
    // Not authenticated or server error - show auth screen either way
    document.getElementById('auth-screen').classList.remove('hidden');
    // Only show error toast if it's a real connection problem (not just 401)
    if (err.message && !err.message.includes('401') && !err.message.includes('No autorizado') && !err.message.includes('Token')) {
      showToast('⚠️ ' + err.message, 'warning', 6000);
    }
  } finally {
    document.getElementById('loader').style.opacity = '0';
    document.getElementById('loader').style.pointerEvents = 'none';
    setTimeout(() => document.getElementById('loader').classList.add('hidden'), 300);
  }
}

// Token input auto uppercase
document.addEventListener('input', (e) => {
  if (e.target.id === 'reg-token' || e.target.id === 'new-token-input') {
    e.target.value = e.target.value.toUpperCase();
  }
});

// Start app
window.addEventListener('load', () => {
  setTimeout(init, 500);
});
