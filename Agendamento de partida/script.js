const API_URL = 'http://localhost:3000/api';

let currentMatches = [];
let currentMatchDetails = null;

const matchesList = document.getElementById('matchesList');
const createMatchForm = document.getElementById('createMatchForm');
const addPlayerForm = document.getElementById('addPlayerForm');
const playersList = document.getElementById('playersList');
const attendanceList = document.getElementById('attendanceList');
const matchInfo = document.getElementById('matchInfo');
const deleteMatchBtn = document.getElementById('deleteMatchBtn');

const createMatchModal = new bootstrap.Modal(document.getElementById('createMatchModal'));
const matchDetailsModal = new bootstrap.Modal(document.getElementById('matchDetailsModal'));

const formatDate = (dateString) => {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('pt-BR', options);
};

const formatRelativeDate = (dateString) => {
  const matchDate = new Date(dateString);
  const today = new Date();
  
  today.setHours(0, 0, 0, 0);
  const matchDateOnly = new Date(matchDate);
  matchDateOnly.setHours(0, 0, 0, 0);
  
  const diffTime = matchDateOnly.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays === -1) return 'Ontem';
  if (diffDays > 0 && diffDays < 7) return `Em ${diffDays} dias`;
  if (diffDays < 0 && diffDays > -7) return `Há ${Math.abs(diffDays)} dias`;
  
  return formatDate(dateString);
};

const showToast = (message, type = 'success') => {

  let toastContainer = document.querySelector('.toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  

  const toastId = `toast-${Date.now()}`;
  const toastHtml = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header bg-${type} text-white">
        <strong class="me-auto">Futebol entre Amigos</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
  toast.show();
  
 
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
};

const loadMatches = async () => {
  try {
    const response = await fetch(`${API_URL}/matches`);
    if (!response.ok) throw new Error('Erro ao carregar partidas');
    
    const data = await response.json();
    currentMatches = data;
    
    renderMatches(data);
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao carregar partidas', 'danger');
  }
};

const renderMatches = (matches) => {
  if (matches.length === 0) {
    matchesList.innerHTML = `
      <div class="col-12 empty-state">
        <i class="fas fa-futbol"></i>
        <h4>Nenhuma partida agendada</h4>
        <p>Clique em "Nova Partida" para começar.</p>
      </div>
    `;
    return;
  }
  
  matches.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  matchesList.innerHTML = matches.map(match => {
    const matchDate = new Date(`${match.date}T${match.time}`);
    const isPast = matchDate < new Date();
    
    return `
      <div class="col-md-4 mb-4">
        <div class="card match-card ${isPast ? 'border-secondary' : 'border-success'}">
          <div class="card-header ${isPast ? 'bg-secondary' : 'bg-success'} text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">${match.title}</h5>
            <span class="badge bg-light text-dark rounded-pill">
              ${match.players.length} jogadores
            </span>
          </div>
          <div class="card-body">
            <div class="match-location mb-2">
              <i class="fas fa-map-marker-alt"></i> ${match.location}
            </div>
            <p class="match-date mb-1">
              <i class="far fa-calendar-alt me-1"></i> ${formatDate(match.date)}
            </p>
            <p class="mb-2">
              <i class="far fa-clock me-1"></i> ${match.time}
            </p>
            <div class="progress mb-3" style="height: 10px;">
              <div class="progress-bar bg-success" role="progressbar" 
                style="width: ${calculateConfirmationRate(match)}%;" 
                aria-valuenow="${calculateConfirmationRate(match)}" 
                aria-valuemin="0" 
                aria-valuemax="100"></div>
            </div>
            <div class="text-end">
              <small>${getConfirmedCount(match)} confirmados de ${match.players.length}</small>
            </div>
          </div>
          <div class="card-footer bg-white">
            <button class="btn btn-outline-success w-100" 
              onclick="openMatchDetails('${match.id}')">
              <i class="fas fa-info-circle me-1"></i> Detalhes
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

const calculateConfirmationRate = (match) => {
  if (match.players.length === 0) return 0;
  const confirmedCount = match.players.filter(player => player.confirmed).length;
  return Math.round((confirmedCount / match.players.length) * 100);
};

const getConfirmedCount = (match) => {
  return match.players.filter(player => player.confirmed).length;
};

const openMatchDetails = async (matchId) => {
  try {
    const response = await fetch(`${API_URL}/matches/${matchId}`);
    if (!response.ok) throw new Error('Erro ao carregar detalhes da partida');
    
    const match = await response.json();
    currentMatchDetails = match;
    
    // Renderizar informações da partida
    renderMatchInfo(match);
    
    // Renderizar lista de jogadores
    renderPlayersList(match.players);
    
    // Renderizar lista de presença
    renderAttendanceList(match.players);
    
    // Configurar botão de exclusão
    deleteMatchBtn.onclick = () => deleteMatch(match.id);
    
    // Abrir modal
    matchDetailsModal.show();
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao carregar detalhes da partida', 'danger');
  }
};

// Renderizar informações da partida
const renderMatchInfo = (match) => {
  const matchDate = new Date(`${match.date}T${match.time}`);
  const isPast = matchDate < new Date();
  
  matchInfo.innerHTML = `
    <h4>${match.title}</h4>
    <div class="d-flex flex-wrap mt-3 mb-2">
      <div class="me-4 mb-2">
        <i class="fas fa-map-marker-alt text-secondary me-1"></i> ${match.location}
      </div>
      <div class="me-4 mb-2">
        <i class="far fa-calendar-alt text-secondary me-1"></i> ${formatDate(match.date)}
        <small class="text-muted">(${formatRelativeDate(match.date)})</small>
      </div>
      <div class="mb-2">
        <i class="far fa-clock text-secondary me-1"></i> ${match.time}
      </div>
    </div>
    ${isPast ? '<div class="alert alert-secondary">Esta partida já ocorreu.</div>' : ''}
  `;
  
  // Atualizar título do modal
  document.getElementById('matchDetailsModalLabel').textContent = `Detalhes da Partida: ${match.title}`;
};

// Renderizar lista de jogadores
const renderPlayersList = (players) => {
  if (players.length === 0) {
    playersList.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-3">
          <i class="fas fa-users text-muted me-2"></i>
          Nenhum jogador adicionado
        </td>
      </tr>
    `;
    return;
  }
  
  playersList.innerHTML = players.map(player => `
    <tr>
      <td>${player.name}</td>
      <td>${player.phone}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger player-action" onclick="removePlayer('${player.id}')">
          <i class="fas fa-times"></i>
        </button>
      </td>
    </tr>
  `).join('');
};

// Renderizar lista de presenças
const renderAttendanceList = (players) => {
  if (players.length === 0) {
    attendanceList.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-3">
          <i class="fas fa-users text-muted me-2"></i>
          Nenhum jogador adicionado
        </td>
      </tr>
    `;
    return;
  }
  
  attendanceList.innerHTML = players.map(player => `
    <tr>
      <td>${player.name}</td>
      <td>${player.phone}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input confirmation-toggle" 
            type="checkbox" 
            id="confirm-${player.id}" 
            ${player.confirmed ? 'checked' : ''}
            onchange="toggleConfirmation('${player.id}', this.checked)">
          <label class="form-check-label" for="confirm-${player.id}">
            <span class="badge ${player.confirmed ? 'bg-success' : 'bg-secondary'} confirmation-badge">
              ${player.confirmed ? 'Confirmado' : 'Pendente'}
            </span>
          </label>
        </div>
      </td>
    </tr>
  `).join('');
};

// Criar nova partida
createMatchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const title = document.getElementById('matchTitle').value;
  const location = document.getElementById('matchLocation').value;
  const date = document.getElementById('matchDate').value;
  const time = document.getElementById('matchTime').value;
  
  try {
    const response = await fetch(`${API_URL}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, location, date, time })
    });
    
    if (!response.ok) throw new Error('Erro ao criar partida');
    
    const match = await response.json();
    
    // Recarregar lista de partidas
    loadMatches();
    
    // Limpar formulário e fechar modal
    createMatchForm.reset();
    createMatchModal.hide();
    
    showToast('Partida criada com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao criar partida', 'danger');
  }
});

// Adicionar jogador
addPlayerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  if (!currentMatchDetails) return;
  
  const name = document.getElementById('playerName').value;
  const phone = document.getElementById('playerPhone').value;
  
  try {
    const response = await fetch(`${API_URL}/matches/${currentMatchDetails.id}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, phone })
    });
    
    if (!response.ok) throw new Error('Erro ao adicionar jogador');
    
    const player = await response.json();
    
    // Atualizar detalhes da partida
    await refreshMatchDetails();
    
    // Limpar formulário
    addPlayerForm.reset();
    
    showToast('Jogador adicionado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao adicionar jogador', 'danger');
  }
});

// Remover jogador
const removePlayer = async (playerId) => {
  if (!currentMatchDetails) return;
  
  if (!confirm('Tem certeza que deseja remover este jogador?')) return;
  
  try {
    const response = await fetch(`${API_URL}/matches/${currentMatchDetails.id}/players/${playerId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Erro ao remover jogador');
    
    // Atualizar detalhes da partida
    await refreshMatchDetails();
    
    // Atualizar lista de partidas
    loadMatches();
    
    showToast('Jogador removido com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao remover jogador', 'danger');
  }
};

// Alternar confirmação de presença
const toggleConfirmation = async (playerId, confirmed) => {
  if (!currentMatchDetails) return;
  
  try {
    const response = await fetch(`${API_URL}/matches/${currentMatchDetails.id}/players/${playerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirmed })
    });
    
    if (!response.ok) throw new Error('Erro ao atualizar confirmação');
    
    // Atualizar detalhes da partida
    await refreshMatchDetails();
    
    // Atualizar lista de partidas
    loadMatches();
    
    showToast(`Presença ${confirmed ? 'confirmada' : 'desmarcada'} com sucesso!`);
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao atualizar confirmação', 'danger');
  }
};

// Excluir partida
const deleteMatch = async (matchId) => {
  if (!confirm('Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.')) return;
  
  try {
    const response = await fetch(`${API_URL}/matches/${matchId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Erro ao excluir partida');
    
    // Fechar modal
    matchDetailsModal.hide();
    
    // Recarregar lista de partidas
    loadMatches();
    
    showToast('Partida excluída com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    showToast('Erro ao excluir partida', 'danger');
  }
};

// Atualizar detalhes da partida
const refreshMatchDetails = async () => {
  if (!currentMatchDetails) return;
  
  try {
    const response = await fetch(`${API_URL}/matches/${currentMatchDetails.id}`);
    if (!response.ok) throw new Error('Erro ao atualizar detalhes da partida');
    
    const match = await response.json();
    currentMatchDetails = match;
    
    // Atualizar listas
    renderPlayersList(match.players);
    renderAttendanceList(match.players);
    
    return match;
  } catch (error) {
    console.error('Erro:', error);
    return null;
  }
};

// Expor funções para uso global
window.openMatchDetails = openMatchDetails;
window.removePlayer = removePlayer;
window.toggleConfirmation = toggleConfirmation;
window.deleteMatch = deleteMatch;

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  // Carregar partidas
  loadMatches();
});