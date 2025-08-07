// Variables globales
let currentTab = null;
let currentUser = null;
let storedData = null;

// Elementos del DOM
const checkButton = document.getElementById('checkButton');
const stopButton = document.getElementById('stopButton');
const refreshButton = document.getElementById('refreshButton');
const statusText = document.getElementById('statusText');
const resultsDiv = document.getElementById('results');

// Funciones de almacenamiento local
function saveUserData(username, data) {
  const userData = {
    username: username,
    followers: data.followers,
    following: data.following,
    timestamp: new Date().toISOString(),
    profilePicUrl: data.profilePicUrl || null
  };
  
  localStorage.setItem(`instagram_analyzer_${username}`, JSON.stringify(userData));
  console.log('[IG-EXT] Datos guardados para usuario:', username);
}

function getUserData(username) {
  const data = localStorage.getItem(`instagram_analyzer_${username}`);
  return data ? JSON.parse(data) : null;
}

function getAllStoredUsers() {
  const users = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('instagram_analyzer_')) {
      const username = key.replace('instagram_analyzer_', '');
      const data = getUserData(username);
      if (data) {
        users.push(data);
      }
    }
  }
  return users;
}

// Función para obtener el usuario actual de la URL
async function getCurrentUsername() {
  try {
    if (!currentTab) return null;
    
    const url = currentTab.url;
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (match) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error('[IG-EXT] Error al obtener username:', error);
    return null;
  }
}

// Función para obtener información del perfil actual
async function getCurrentProfileInfo() {
  try {
    if (!currentTab) return null;
    
    const response = await sendMessageToTab({ action: "getProfileInfo" });
    return response && response.success ? response.profileInfo : null;
  } catch (error) {
    console.error('[IG-EXT] Error al obtener información del perfil:', error);
    return null;
  }
}

// Función para comparar datos
function compareUserData(oldData, newData) {
  // Verificar que estamos comparando el mismo usuario
  if (oldData.username !== newData.username) {
    console.log('[IG-EXT] Comparando usuarios diferentes, no se realizará comparación');
    return null;
  }
  
  const oldFollowers = new Set(oldData.followers.map(f => typeof f === 'object' ? f.username : f));
  const newFollowers = new Set(newData.followers.map(f => typeof f === 'object' ? f.username : f));
  const oldFollowing = new Set(oldData.following.map(f => typeof f === 'object' ? f.username : f));
  const newFollowing = new Set(newData.following.map(f => typeof f === 'object' ? f.username : f));
  
  // Encontrar diferencias
  const startedFollowing = newData.following.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !oldFollowing.has(username);
  });
  
  const stoppedFollowing = oldData.following.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !newFollowing.has(username);
  });
  
  const gainedFollowers = newData.followers.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !oldFollowers.has(username);
  });
  
  const lostFollowers = oldData.followers.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !newFollowers.has(username);
  });
  
  return {
    startedFollowing,
    stoppedFollowing,
    gainedFollowers,
    lostFollowers,
    oldTimestamp: oldData.timestamp,
    username: oldData.username
  };
}

// Función para formatear fecha
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Función para calcular tiempo transcurrido
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else {
    return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[IG-EXT] Página de análisis cargada');
  
  // Event listeners
  checkButton.addEventListener('click', startAnalysis);
  stopButton.addEventListener('click', stopAnalysis);
  refreshButton.addEventListener('click', refreshConnection);
  
  // Buscar la pestaña de Instagram activa
  await findInstagramTab();
  
  // Obtener usuario actual y verificar datos almacenados
  if (currentTab) {
    await checkCurrentUser();
  }
});

// Buscar la pestaña de Instagram
async function findInstagramTab() {
  try {
    const tabs = await chrome.tabs.query({});
    const instagramTabs = tabs.filter(tab => 
      tab.url && tab.url.includes('instagram.com')
    );
    
    if (instagramTabs.length > 0) {
      // Si hay múltiples pestañas de Instagram, usar la primera
      currentTab = instagramTabs[0];
      
      if (instagramTabs.length === 1) {
        updateStatus(`Pestaña de Instagram encontrada: ${currentTab.url}. Listo para analizar.`);
      } else {
        updateStatus(`Se encontraron ${instagramTabs.length} pestañas de Instagram. Usando: ${currentTab.url}. Listo para analizar.`);
      }
    } else {
      updateStatus('⚠️ No se encontró ninguna pestaña de Instagram. Abre Instagram y recarga esta página.');
      checkButton.disabled = true;
    }
  } catch (error) {
    console.error('[IG-EXT] Error al buscar pestaña de Instagram:', error);
    updateStatus('❌ Error al conectar con Instagram. Recarga la página.');
    checkButton.disabled = true;
  }
}

// Verificar usuario actual y mostrar estado
async function checkCurrentUser() {
  currentUser = await getCurrentUsername();
  
  if (currentUser) {
    storedData = getUserData(currentUser);
    
    if (storedData) {
      // Mostrar información de análisis previo
      const timeAgo = getTimeAgo(storedData.timestamp);
      const formattedDate = formatDate(storedData.timestamp);
      
      updateStatus(`✅ Última revisión: ${timeAgo} atrás (${formattedDate})`);
      
      // Cambiar texto del botón
      checkButton.innerHTML = `
        <span class="button-icon">🔄</span>
        Actualizar análisis
      `;
    } else {
      // Primer análisis
      updateStatus(`👤 Analizando perfil: @${currentUser}`);
      
      // Cambiar texto del botón
      checkButton.innerHTML = `
        <span class="button-icon">🔍</span>
        Hacer primer análisis
      `;
    }
    
    // Mostrar información del usuario después de un pequeño delay
    setTimeout(() => {
      showUserInfo();
    }, 100);
  } else {
    updateStatus('⚠️ No se pudo detectar el usuario actual');
  }
}

// Función para crear URL de imagen con proxy
function createImageUrl(originalUrl) {
  if (!originalUrl) return null;
  
  // Usar un servicio de proxy de imágenes que funciona sin restricciones de CORS
  // Este servicio está diseñado específicamente para manejar imágenes de redes sociales
  return `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=150&h=150&fit=cover&output=jpg&q=85`;
}

// Mostrar información del usuario actual
async function showUserInfo() {
  if (!currentUser) return;
  
  try {
    const profileInfo = await getCurrentProfileInfo();
    const profilePicUrl = profileInfo?.profilePicUrl || storedData?.profilePicUrl;
    
    // Actualizar el header con información del usuario
    const headerContent = document.querySelector('.header-content');
    if (headerContent) {
      // Verificar si ya se agregó la información del usuario para evitar duplicados
      const existingUserInfo = headerContent.querySelector('.user-info-section');
      if (existingUserInfo) {
        existingUserInfo.remove();
      }
      
      const userInfoHtml = `
        <div class="user-info-section" style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem;">
          ${profilePicUrl ? `
            <img src="${createImageUrl(profilePicUrl)}" 
                 alt="${currentUser}" 
                 style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid white; object-fit: cover;" />
          ` : ''}
          <div style="text-align: left;">
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 600;">@${currentUser}</h2>
            ${storedData ? `
              <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">
                📊 ${storedData.followers.length} seguidores • ${storedData.following.length} siguiendo
              </p>
            ` : ''}
          </div>
        </div>
      `;
      
      headerContent.innerHTML += userInfoHtml;
    }
  } catch (error) {
    console.error('[IG-EXT] Error al mostrar información del usuario:', error);
  }
}

// Actualizar estado
function updateStatus(message) {
  statusText.textContent = message;
  console.log('[IG-EXT] Estado:', message);
}

// Iniciar análisis
async function startAnalysis() {
  console.log('[IG-EXT] ===== INICIANDO ANÁLISIS =====');
  console.log('[IG-EXT] currentTab:', currentTab);
  console.log('[IG-EXT] currentUser:', currentUser);
  
  if (!currentTab || !currentUser) {
    const errorMsg = '❌ No se encontró la pestaña de Instagram o el usuario. Recarga la página.';
    console.error('[IG-EXT] Error:', errorMsg);
    updateStatus(errorMsg);
    return;
  }

  try {
    console.log('[IG-EXT] Iniciando análisis completo del perfil...');
    
    // Actualizar UI
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

    // Obtener información del perfil
    console.log('[IG-EXT] Obteniendo información del perfil...');
    updateStatus('🔄 Obteniendo información del perfil...');
    const profileInfo = await getCurrentProfileInfo();
    console.log('[IG-EXT] Información del perfil obtenida:', profileInfo);

    // Primero obtener seguidores
    console.log('[IG-EXT] Analizando seguidores...');
    updateStatus('🔄 Analizando seguidores...');
    const followersResponse = await sendMessageToTab({ action: "analizarSeguidores" });
    console.log('[IG-EXT] Respuesta de seguidores:', followersResponse);

    if (!followersResponse || !followersResponse.success) {
      throw new Error(followersResponse?.error || 'Error al analizar seguidores. Asegúrate de estar en tu perfil de Instagram.');
    }

    // Luego obtener seguidos
    console.log('[IG-EXT] Analizando seguidos...');
    updateStatus('🔄 Analizando seguidos...');
    const followingResponse = await sendMessageToTab({ action: "analizarSeguidos" });
    console.log('[IG-EXT] Respuesta de seguidos:', followingResponse);

    if (!followingResponse || !followingResponse.success) {
      throw new Error(followingResponse?.error || 'Error al analizar seguidos. Asegúrate de estar en tu perfil de Instagram.');
    }

    const { followers } = followersResponse;
    const { following } = followingResponse;

    console.log('[IG-EXT] Datos extraídos:', { followers: followers.length, following: following.length });
    
    // Preparar datos para almacenamiento
    const newData = {
      username: currentUser,
      followers,
      following,
      profilePicUrl: profileInfo?.profilePicUrl || null
    };

    // Comparar con datos anteriores si existen
    let comparisonData = null;
    if (storedData) {
      comparisonData = compareUserData(storedData, newData);
      console.log('[IG-EXT] Datos de comparación:', comparisonData);
    }

    // Guardar nuevos datos
    saveUserData(currentUser, newData);
    
    // Actualizar datos almacenados en memoria
    storedData = getUserData(currentUser);
    
    updateStatus('✅ Análisis completado exitosamente');

    // Mostrar resultados con comparaciones
    displayResults(followers, following, comparisonData);

  } catch (error) {
    console.error('[IG-EXT] Error en el análisis completo:', error);
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

// Refrescar conexión con Instagram
async function refreshConnection() {
  try {
    updateStatus('🔄 Refrescando conexión...');
    refreshButton.disabled = true;
    
    // Limpiar estado actual
    currentTab = null;
    currentUser = null;
    storedData = null;
    checkButton.disabled = true;
    
    // Buscar pestañas de Instagram nuevamente
    await findInstagramTab();
    
    // Obtener usuario actual y verificar datos almacenados
    await checkCurrentUser();
    
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

// Función para obtener imagen como base64 usando fetch
async function getImageAsBase64(imageUrl) {
  try {
    console.log('[IG-EXT] Intentando obtener imagen como base64:', imageUrl);
    
    // Usar un proxy para evitar CORS
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=150&h=150&fit=cover&output=jpg&q=85`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[IG-EXT] ✅ Imagen convertida a base64 exitosamente');
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.log('[IG-EXT] ❌ Error al obtener imagen como base64:', error);
    return null;
  }
}

// Función para crear una card de usuario
function createUserCard(user) {
  console.log('[IG-EXT] ===== PROCESANDO USUARIO =====');
  console.log('[IG-EXT] Usuario recibido:', user);
  console.log('[IG-EXT] Tipo de usuario:', typeof user);
  
  const isObject = typeof user === 'object' && user !== null;
  console.log('[IG-EXT] ¿Es objeto?', isObject);
  
  const username = isObject ? user.username : user;
  const profilePicUrl = isObject ? user.profile_pic_url : null;
  const fullName = isObject ? user.full_name : username;
  const isPrivate = isObject ? user.is_private : false;
  const isVerified = isObject ? user.is_verified : false;
  const followedByViewer = isObject ? user.followed_by_viewer : false;
  const requestedByViewer = isObject ? user.requested_by_viewer : false;
  
  console.log('[IG-EXT] Datos extraídos:');
  console.log('[IG-EXT] - username:', username);
  console.log('[IG-EXT] - profilePicUrl:', profilePicUrl);
  console.log('[IG-EXT] - fullName:', fullName);
  console.log('[IG-EXT] - isPrivate:', isPrivate);
  console.log('[IG-EXT] - isVerified:', isVerified);
  console.log('[IG-EXT] - followedByViewer:', followedByViewer);
  console.log('[IG-EXT] - requestedByViewer:', requestedByViewer);
  
  // Crear URL de imagen con proxy
  const imageUrl = profilePicUrl ? createImageUrl(profilePicUrl) : null;
  const fallbackUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiNlMWU1ZWEiLz4KPHBhdGggZD0iTTI1IDEyQzI3LjU2IDEyIDMwIDE0LjQ0IDMwIDE3QzMwIDE5LjU2IDI3LjU2IDIyIDI1IDIyQzIyLjQ0IDIyIDIwIDE5LjU2IDIwIDE3QzIwIDE0LjQ0IDIyLjQ0IDEyIDI1IDEyWiIgZmlsbD0iIzk5OWE5YiIvPgo8cGF0aCBkPSJNMzUgMzVDMzUgMzAuNTkgMzAuNTEgMjcgMjUgMjdDMTkuNDkgMjcgMTUgMzAuNTkgMTUgMzVIMzVaIiBmaWxsPSIjOTk5YTliIi8+Cjwvc3ZnPgo=';
  
  console.log('[IG-EXT] URL original:', profilePicUrl);
  console.log('[IG-EXT] URL con proxy:', imageUrl);
  console.log('[IG-EXT] ===== FIN PROCESANDO USUARIO =====');
  
  return `
    <div class="user-card">
      <div class="user-avatar">
        <img src="${imageUrl || fallbackUrl}" 
             alt="${username}" 
             onerror="console.log('[IG-EXT] ❌ Error al cargar imagen en HTML:', '${imageUrl}'); this.src='${fallbackUrl}';" />
        ${isVerified ? '<span class="verified-badge">✓</span>' : ''}
      </div>
      <div class="user-info">
        <div class="username">@${username}</div>
        <div class="full-name">${fullName}</div>
        <div class="user-status">
          ${isPrivate ? '<span class="private-badge">🔒 Privado</span>' : ''}
          ${followedByViewer ? '<span class="following-badge">✅ Siguiendo</span>' : ''}
          ${requestedByViewer ? '<span class="requested-badge">📤 Solicitado</span>' : ''}
        </div>
      </div>
      <div class="user-actions">
        <a href="https://www.instagram.com/${username}/" target="_blank" class="profile-link">
          Ver perfil
        </a>
      </div>
    </div>
  `;
}

// Función para crear sección de comparaciones
function createComparisonSection(comparisonData) {
  const { startedFollowing, stoppedFollowing, gainedFollowers, lostFollowers, oldTimestamp, username } = comparisonData;
  const timeAgo = getTimeAgo(oldTimestamp);
  const formattedDate = formatDate(oldTimestamp);
  
  return `
    <div class="dashboard-section">
      <h2>📈 Cambios desde la última revisión</h2>
      <p style="text-align: center; color: #6c757d; margin-bottom: 2rem;">
        Última revisión: ${timeAgo} atrás (${formattedDate})
      </p>
      
      <div class="comparison-metrics">
        <div class="comparison-row">
          <div class="comparison-card positive">
            <div class="comparison-icon">➕</div>
            <div class="comparison-content">
              <div class="comparison-number">${startedFollowing.length}</div>
              <div class="comparison-label">Comenzó a seguir</div>
            </div>
          </div>
          <div class="comparison-card negative">
            <div class="comparison-icon">➖</div>
            <div class="comparison-content">
              <div class="comparison-number">${stoppedFollowing.length}</div>
              <div class="comparison-label">Dejó de seguir</div>
            </div>
          </div>
        </div>
        
        <div class="comparison-row">
          <div class="comparison-card positive">
            <div class="comparison-icon">🎉</div>
            <div class="comparison-content">
              <div class="comparison-number">${gainedFollowers.length}</div>
              <div class="comparison-label">Le comenzaron a seguir</div>
            </div>
          </div>
          <div class="comparison-card negative">
            <div class="comparison-icon">😢</div>
            <div class="comparison-content">
              <div class="comparison-number">${lostFollowers.length}</div>
              <div class="comparison-label">Le dejaron de seguir</div>
            </div>
          </div>
        </div>
      </div>
      
      ${startedFollowing.length > 0 ? createUserSection(
        '➕ Comenzó a seguir', 
        startedFollowing, 
        'No hay nuevos seguidos'
      ) : ''}
      
      ${stoppedFollowing.length > 0 ? createUserSection(
        '➖ Dejó de seguir', 
        stoppedFollowing, 
        'No hay seguidos eliminados'
      ) : ''}
      
      ${gainedFollowers.length > 0 ? createUserSection(
        '🎉 Le comenzaron a seguir', 
        gainedFollowers, 
        'No hay nuevos seguidores'
      ) : ''}
      
      ${lostFollowers.length > 0 ? createUserSection(
        '😢 Le dejaron de seguir', 
        lostFollowers, 
        'No hay seguidores perdidos'
      ) : ''}
    </div>
  `;
}

// Función para crear una sección de usuarios
function createUserSection(title, users, emptyMessage) {
  if (!users || users.length === 0) {
    return `
      <div class="user-section">
        <h3>${title}</h3>
        <div class="empty-message">${emptyMessage}</div>
      </div>
    `;
  }
  
  return `
    <div class="user-section">
      <h3>${title} (${users.length})</h3>
      <div class="user-grid">
        ${users.map(user => createUserCard(user)).join('')}
      </div>
    </div>
  `;
}

// Mostrar resultados
function displayResults(followers, following, comparisonData = null) {
  console.log('[IG-EXT] ===== INICIO DE LOGS DE DATOS =====');
  console.log('[IG-EXT] Datos completos de followers:', followers);
  console.log('[IG-EXT] Datos completos de following:', following);
  console.log('[IG-EXT] Datos de comparación:', comparisonData);
  
  // Log de muestra de usuarios
  if (followers.length > 0) {
    console.log('[IG-EXT] Ejemplo de datos de follower:', followers[0]);
    console.log('[IG-EXT] Tipo de datos follower:', typeof followers[0]);
    console.log('[IG-EXT] ¿Es objeto?', typeof followers[0] === 'object');
    if (typeof followers[0] === 'object') {
      console.log('[IG-EXT] Propiedades del follower:', Object.keys(followers[0]));
      console.log('[IG-EXT] profile_pic_url del follower:', followers[0].profile_pic_url);
    }
  }
  
  if (following.length > 0) {
    console.log('[IG-EXT] Ejemplo de datos de following:', following[0]);
    console.log('[IG-EXT] Tipo de datos following:', typeof following[0]);
    console.log('[IG-EXT] ¿Es objeto?', typeof following[0] === 'object');
    if (typeof following[0] === 'object') {
      console.log('[IG-EXT] Propiedades del following:', Object.keys(following[0]));
      console.log('[IG-EXT] profile_pic_url del following:', following[0].profile_pic_url);
    }
  }
  
  console.log('[IG-EXT] ===== FIN DE LOGS DE DATOS =====');

  // Calcular quién no te sigue de vuelta
  const followersSet = new Set(followers.map(f => typeof f === 'object' ? f.username : f));
  const followingSet = new Set(following.map(f => typeof f === 'object' ? f.username : f));
  const notFollowingBack = following.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !followersSet.has(username);
  });
  const youDontFollowBack = followers.filter(user => {
    const username = typeof user === 'object' ? user.username : user;
    return !followingSet.has(username);
  });

  // Calcular métricas y porcentajes
  const totalFollowers = followers.length;
  const totalFollowing = following.length;
  const notFollowingBackCount = notFollowingBack.length;
  const youDontFollowBackCount = youDontFollowBack.length;
  const mutualFollowers = totalFollowers - youDontFollowBackCount;
  const mutualFollowing = totalFollowing - notFollowingBackCount;

  // Calcular porcentajes
  const notFollowingBackPercentage = totalFollowing > 0 ? ((notFollowingBackCount / totalFollowing) * 100).toFixed(1) : 0;
  const youDontFollowBackPercentage = totalFollowers > 0 ? ((youDontFollowBackCount / totalFollowers) * 100).toFixed(1) : 0;
  const mutualPercentage = totalFollowers > 0 ? ((mutualFollowers / totalFollowers) * 100).toFixed(1) : 0;

  // Crear sección de comparaciones si hay datos previos
  const comparisonSection = comparisonData ? createComparisonSection(comparisonData) : '';

  // Mostrar resultados
  resultsDiv.innerHTML = `
    <div class="results-container">
      <div class="dashboard-section">
        <h2>📊 Dashboard del Perfil</h2>
        
        <!-- Métricas principales -->
        <div class="main-metrics">
          <div class="metric-card primary">
            <div class="metric-icon">👥</div>
            <div class="metric-content">
              <div class="metric-number">${totalFollowers}</div>
              <div class="metric-label">Seguidores</div>
            </div>
          </div>
          <div class="metric-card primary">
            <div class="metric-icon">👤</div>
            <div class="metric-content">
              <div class="metric-number">${totalFollowing}</div>
              <div class="metric-label">Siguiendo</div>
            </div>
          </div>
          <div class="metric-card success">
            <div class="metric-icon">🤝</div>
            <div class="metric-content">
              <div class="metric-number">${mutualFollowers}</div>
              <div class="metric-label">Mutuales</div>
            </div>
          </div>
        </div>

        <!-- Métricas estratégicas -->
        <div class="strategic-metrics">
          <div class="metric-card warning">
            <div class="metric-icon">❌</div>
            <div class="metric-content">
              <div class="metric-number">${notFollowingBackCount}</div>
              <div class="metric-label">No siguen de vuelta a ${currentUser}</div>
              <div class="metric-percentage">${notFollowingBackPercentage}% de los que sigues</div>
            </div>
          </div>
          <div class="metric-card info">
            <div class="metric-icon">🚫</div>
            <div class="metric-content">
              <div class="metric-number">${youDontFollowBackCount}</div>
              <div class="metric-label">No sigues de vuelta</div>
              <div class="metric-percentage">${youDontFollowBackPercentage}% de tus seguidores</div>
            </div>
          </div>
        </div>

        <!-- Análisis de engagement -->
        <div class="engagement-analysis">
          <h3>📈 Análisis de Engagement</h3>
          <div class="engagement-metrics">
            <div class="engagement-card">
              <div class="engagement-title">Tasa de Seguimiento Mutuo</div>
              <div class="engagement-value">${mutualPercentage}%</div>
              <div class="engagement-description">
                ${mutualFollowers} de ${totalFollowers} seguidores te siguen de vuelta
              </div>
            </div>
            <div class="engagement-card">
              <div class="engagement-title">Ratio de Seguimiento</div>
              <div class="engagement-value">${totalFollowing > 0 ? (totalFollowers / totalFollowing).toFixed(2) : 0}</div>
              <div class="engagement-description">
                Seguidores por cada persona que sigues
              </div>
            </div>
          </div>
        </div>
      </div>
      
      ${comparisonSection}
      
      ${createUserSection(
        `❌ No siguen de vuelta a ${currentUser}`, 
        notFollowingBack, 
        '¡Todos te siguen de vuelta! 🎉'
      )}
      
      ${createUserSection(
        '🚫 No sigues de vuelta', 
        youDontFollowBack, 
        '¡Sigues a todos tus seguidores! 🎉'
      )}
      
      ${createUserSection(
        '📋 Lista completa de seguidores', 
        followers, 
        'No hay seguidores'
      )}
      
      ${createUserSection(
        '📋 Lista completa de seguidos', 
        following, 
        'No sigues a nadie'
      )}
      
      ${comparisonData ? `
        <div class="dashboard-section">
          <h2>📊 Resumen de cambios desde la última revisión</h2>
          <p style="text-align: center; color: #6c757d; margin-bottom: 2rem;">
            Desde la última revisión (${getTimeAgo(comparisonData.oldTimestamp)} atrás):
          </p>
          
          ${comparisonData.stoppedFollowing.length > 0 ? createUserSection(
            `El usuario ${currentUser} dejó de seguir a:`, 
            comparisonData.stoppedFollowing, 
            'No dejó de seguir a nadie'
          ) : ''}
          
          ${comparisonData.lostFollowers.length > 0 ? createUserSection(
            `El usuario ${currentUser} dejó de tener los siguientes seguidores:`, 
            comparisonData.lostFollowers, 
            'No perdió seguidores'
          ) : ''}
          
          ${comparisonData.startedFollowing.length > 0 ? createUserSection(
            `El usuario ${currentUser} comenzó a seguir:`, 
            comparisonData.startedFollowing, 
            'No comenzó a seguir a nadie'
          ) : ''}
          
          ${comparisonData.gainedFollowers.length > 0 ? createUserSection(
            `El usuario ${currentUser} comenzó a ser seguido por:`, 
            comparisonData.gainedFollowers, 
            'No ganó nuevos seguidores'
          ) : ''}
        </div>
      ` : ''}
    </div>
  `;
} 