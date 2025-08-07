// Variables globales
let currentTab = null;
let currentUser = null;

// Elementos del DOM
const checkButton = document.getElementById('checkButton');
const stopButton = document.getElementById('stopButton');
const refreshButton = document.getElementById('refreshButton');
const statusText = document.getElementById('statusText');
const resultsDiv = document.getElementById('results');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[IG-EXT] Página de análisis cargada');
  
  // Event listeners
  checkButton.addEventListener('click', startAnalysis);
  stopButton.addEventListener('click', stopAnalysis);
  refreshButton.addEventListener('click', refreshConnection);
  
  // Buscar la pestaña de Instagram activa
  await findInstagramTab();
});

// Buscar la pestaña de Instagram
async function findInstagramTab() {
  try {
    const tabs = await chrome.tabs.query({});
    const instagramTabs = tabs.filter(tab => 
      tab.url && tab.url.includes('instagram.com')
    );
    
    if (instagramTabs.length > 0) {
      currentTab = instagramTabs[0];
      updateStatus(`Pestaña de Instagram encontrada: ${currentTab.url}`);
      
      // Obtener username de la URL
      const urlMatch = currentTab.url.match(/instagram\.com\/([^\/\?]+)/);
      if (urlMatch) {
        currentUser = urlMatch[1];
        updateStatus(`Usuario detectado: @${currentUser}`);
      }
    } else {
      updateStatus('⚠️ No se encontró ninguna pestaña de Instagram');
      checkButton.disabled = true;
    }
  } catch (error) {
    console.error('[IG-EXT] Error al buscar pestaña de Instagram:', error);
    updateStatus('❌ Error al conectar con Instagram');
    checkButton.disabled = true;
  }
}

// Actualizar estado
function updateStatus(message) {
  statusText.textContent = message;
  console.log('[IG-EXT] Estado:', message);
}

// Iniciar análisis
async function startAnalysis() {
  console.log('[IG-EXT] Iniciando análisis...');
  
  if (!currentTab || !currentUser) {
    updateStatus('❌ No se encontró la pestaña de Instagram o el usuario');
    return;
  }

  try {
    checkButton.disabled = true;
    stopButton.style.display = 'inline-flex';
    updateStatus('🔄 Iniciando análisis...');
    
    // Mostrar spinner
    resultsDiv.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <div class="loading-spinner" style="width: 40px; height: 40px; border-width: 4px; margin: 0 auto 1rem;"></div>
        <p style="font-size: 1.1rem; color: #6c757d;">Cargando datos del perfil...</p>
      </div>
    `;

    // Obtener seguidores
    updateStatus('🔄 Analizando seguidores...');
    const followersResponse = await sendMessageToTab({ action: "analizarSeguidores" });

    if (!followersResponse || !followersResponse.success) {
      throw new Error(followersResponse?.error || 'Error al analizar seguidores');
    }

    // Obtener seguidos
    updateStatus('🔄 Analizando seguidos...');
    const followingResponse = await sendMessageToTab({ action: "analizarSeguidos" });

    if (!followingResponse || !followingResponse.success) {
      throw new Error(followingResponse?.error || 'Error al analizar seguidos');
    }

    const { followers } = followersResponse;
    const { following } = followingResponse;

    console.log('[IG-EXT] Datos extraídos:', { followers: followers.length, following: following.length });
    updateStatus('✅ Análisis completado exitosamente');

    // Mostrar resultados simples
    displaySimpleResults(followers, following);

  } catch (error) {
    console.error('[IG-EXT] Error en el análisis:', error);
    updateStatus(`❌ Error: ${error.message}`);
    resultsDiv.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #dc3545;">
        <h3>❌ Error en el análisis</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()" class="primary-button" style="margin-top: 1rem;">
          🔄 Reintentar
        </button>
      </div>
    `;
  } finally {
    checkButton.disabled = false;
    stopButton.style.display = 'none';
  }
}

// Detener análisis
async function stopAnalysis() {
  try {
    updateStatus('🛑 Deteniendo análisis...');
    stopButton.disabled = true;

    if (currentTab) {
      await sendMessageToTab({ action: "detenerOperacion" });
    }

    updateStatus('⏹️ Análisis detenido');
    resultsDiv.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #ffc107;">
        <h3>⏹️ Análisis detenido</h3>
        <p>El análisis fue detenido por el usuario.</p>
        <button onclick="location.reload()" class="primary-button" style="margin-top: 1rem;">
          🔄 Reiniciar
        </button>
      </div>
    `;
  } catch (error) {
    console.error('[IG-EXT] Error al detener análisis:', error);
    updateStatus('❌ Error al detener análisis');
  } finally {
    checkButton.disabled = false;
    stopButton.disabled = false;
    stopButton.style.display = 'none';
  }
}

// Refrescar conexión
async function refreshConnection() {
  try {
    updateStatus('🔄 Refrescando conexión...');
    refreshButton.disabled = true;
    
    currentTab = null;
    currentUser = null;
    checkButton.disabled = true;
    
    await findInstagramTab();
    
    if (currentTab && currentUser) {
      updateStatus('✅ Conexión refrescada exitosamente');
    } else {
      updateStatus('❌ No se pudo conectar con Instagram');
    }
  } catch (error) {
    console.error('[IG-EXT] Error al refrescar conexión:', error);
    updateStatus('❌ Error al refrescar conexión');
  } finally {
    refreshButton.disabled = false;
  }
}

// Enviar mensaje a la pestaña
function sendMessageToTab(message) {
  return new Promise((resolve, reject) => {
    if (!currentTab) {
      reject(new Error('No hay pestaña de Instagram disponible'));
      return;
    }

    chrome.tabs.sendMessage(currentTab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Mostrar resultados simples
function displaySimpleResults(followers, following) {
  const followersSet = new Set(followers.map(f => typeof f === 'object' ? f.username : f));
  const followingSet = new Set(following.map(f => typeof f === 'object' ? f.username : f));
  const notFollowingBack = following.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !followersSet.has(username);
  });

  resultsDiv.innerHTML = `
    <div class="results-container">
      <div class="dashboard-section">
        <h2>📊 Dashboard del Perfil</h2>
        
        <div class="main-metrics">
          <div class="metric-card primary">
            <div class="metric-icon">👥</div>
            <div class="metric-content">
              <div class="metric-number">${followers.length}</div>
              <div class="metric-label">Seguidores</div>
            </div>
          </div>
          <div class="metric-card primary">
            <div class="metric-icon">👤</div>
            <div class="metric-content">
              <div class="metric-number">${following.length}</div>
              <div class="metric-label">Siguiendo</div>
            </div>
          </div>
          <div class="metric-card warning">
            <div class="metric-icon">❌</div>
            <div class="metric-content">
              <div class="metric-number">${notFollowingBack.length}</div>
              <div class="metric-label">No siguen de vuelta a ${currentUser}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="user-section">
        <h3>❌ No siguen de vuelta a ${currentUser} (${notFollowingBack.length})</h3>
        <div class="user-grid">
          ${notFollowingBack.map(user => {
            const username = typeof user === 'object' ? user.username : user;
            return `
              <div class="user-card">
                <div class="user-info">
                  <div class="username">@${username}</div>
                </div>
                <div class="user-actions">
                  <a href="https://www.instagram.com/${username}/" target="_blank" class="profile-link">
                    Ver perfil
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
} 