document.getElementById("checkButton").addEventListener("click", async () => {
  const checkButton = document.getElementById("checkButton");
  const stopButton = document.getElementById("stopButton");
  const resultsDiv = document.getElementById("results");

  console.log('[IG-EXT] Botón presionado, iniciando análisis completo del perfil...');
  resultsDiv.innerHTML = '<span class="loading-spinner"></span> Cargando datos del perfil...';
  checkButton.disabled = true;
  stopButton.style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Verificar que estemos en Instagram
  if (!tab.url || !tab.url.includes('instagram.com')) {
    resultsDiv.innerHTML = '<span style="color: red;">❌ Error: Debes estar en Instagram para usar esta extensión.</span>';
      checkButton.disabled = false;
      stopButton.style.display = 'none';
        return;
  }
  
  try {
    // Primero obtener seguidores
    resultsDiv.innerHTML = '<span class="loading-spinner"></span> Analizando seguidores...';
    const followersResponse = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: "analizarSeguidores" }, resolve);
    });

    if (!followersResponse || !followersResponse.success) {
      throw new Error(followersResponse?.error || 'Error al analizar seguidores. Asegúrate de estar en tu perfil de Instagram.');
    }

    // Luego obtener seguidos
    resultsDiv.innerHTML = '<span class="loading-spinner"></span> Analizando seguidos...';
    const followingResponse = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: "analizarSeguidos" }, resolve);
    });

    if (!followingResponse || !followingResponse.success) {
      throw new Error(followingResponse?.error || 'Error al analizar seguidos. Asegúrate de estar en tu perfil de Instagram.');
    }

    const { followers } = followersResponse;
    const { following } = followingResponse;

    console.log('[IG-EXT] Datos extraídos:', { followers: followers.length, following: following.length });

    // Función para crear una card de usuario
    const createUserCard = (user) => {
      const isObject = typeof user === 'object' && user !== null;
      const username = isObject ? user.username : user;
      const profilePicUrl = isObject ? user.profile_pic_url : null;
      const fullName = isObject ? user.full_name : username;
      const isPrivate = isObject ? user.is_private : false;
      const isVerified = isObject ? user.is_verified : false;
      
      return `
        <div class="user-card">
          <div class="user-avatar">
            <img src="${profilePicUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlMWU1ZWEiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjA2IDEwIDI0IDEyLjA0IDI0IDE0QzI0IDE2LjA2IDIyLjA2IDE4IDIwIDE4QzE3Ljk0IDE4IDE2IDE2LjA2IDE2IDE0QzE2IDEyLjA0IDE3Ljk0IDEwIDIwIDEwWiIgZmlsbD0iIzk5OWE5YiIvPgo8cGF0aCBkPSJNMjggMjhDMjggMjQuNjkgMjQuNDIgMjIgMjAgMjJDMTUuNTggMjIgMTIgMjQuNjkgMTIgMjhIMjhaIiBmaWxsPSIjOTk5YTliIi8+Cjwvc3ZnPgo='}" 
                 alt="${username}" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlMWU1ZWEiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjA2IDEwIDI0IDEyLjA0IDI0IDE0QzI0IDE2LjA2IDIyLjA2IDE4IDIwIDE4QzE3Ljk0IDE4IDE2IDE2LjA2IDE2IDE0QzE2IDEyLjA0IDE3Ljk0IDEwIDIwIDEwWiIgZmlsbD0iIzk5OWE5YiIvPgo8cGF0aCBkPSJNMjggMjhDMjggMjQuNjkgMjQuNDIgMjIgMjAgMjJDMTUuNTggMjIgMTIgMjQuNjkgMTIgMjhIMjhaIiBmaWxsPSIjOTk5YTliIi8+Cjwvc3ZnPgo='" />
            ${isVerified ? '<span class="verified-badge">✓</span>' : ''}
          </div>
          <div class="user-info">
            <div class="username">@${username}</div>
            <div class="full-name">${fullName}</div>
            ${isPrivate ? '<span class="private-badge">🔒 Privado</span>' : ''}
          </div>
          <div class="user-actions">
            <a href="https://www.instagram.com/${username}/" target="_blank" class="profile-link">
              Ver perfil
            </a>
          </div>
        </div>
      `;
    };

    // Función para crear una sección de usuarios
    const createUserSection = (title, users, emptyMessage) => {
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
    };

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

    // Mostrar resultados
    resultsDiv.innerHTML = `
      <div class="results-container">
        <div class="summary-section">
          <h2>📊 Resumen del perfil</h2>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-number">${followers.length}</span>
              <span class="stat-label">👥 Seguidores</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${following.length}</span>
              <span class="stat-label">👤 Siguiendo</span>
            </div>
          </div>
        </div>
        
        ${createUserSection(
          '❌ No te siguen de vuelta', 
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
      </div>
    `;

  } catch (error) {
    console.error('[IG-EXT] Error en el análisis completo:', error);
    resultsDiv.innerHTML = `<span style='color:red'>Error: ${error.message || 'No se pudieron cargar los datos.'}</span>`;
  } finally {
    checkButton.disabled = false;
    stopButton.style.display = 'none';
  }
});

document.getElementById("stopButton").addEventListener("click", async () => {
  const checkButton = document.getElementById("checkButton");
  const stopButton = document.getElementById("stopButton");
  const resultsDiv = document.getElementById("results");

  console.log('[IG-EXT] Botón stop presionado, deteniendo operación...');
  resultsDiv.innerHTML = '<span style="color: orange;">Deteniendo operación...</span>';
  stopButton.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(
    tab.id,
    { action: "detenerOperacion" },
    (response) => {
      checkButton.disabled = false;
      stopButton.disabled = false;
      stopButton.style.display = 'none';
      resultsDiv.innerHTML = '<span style="color: orange;">Operación detenida.</span>';
    }
  );
});
