// Variable global para controlar la detención de operaciones
let stopOperation = false;

// Función para resetear el flag de stop
function resetStopFlag() {
  stopOperation = false;
}

// Función para verificar si se debe detener la operación
function shouldStop() {
  return stopOperation;
}

// Eliminar IIFE y alert inicial

  // Espera hasta que los popups estén cargados completamente
  function waitForSelector(selector, timeout = 10000) {
  console.log('[IG-EXT] Esperando selector:', selector);
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        // Verificar si se debe detener
        if (shouldStop()) {
          clearInterval(interval);
          reject('Operación detenida por el usuario');
          return;
        }
        
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
        console.log('[IG-EXT] Selector encontrado:', selector);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
        console.error('[IG-EXT] Timeout esperando selector:', selector);
          reject(`Timeout esperando selector: ${selector}`);
        }
      }, 500);
    });
  }

// Función para obtener el ID del usuario via API GraphQL
async function getUserIdByUsername(username) {
  try {
    console.log('[IG-EXT] Intentando obtener ID de usuario via API para:', username);
    
    // Query GraphQL para obtener información del usuario
    const variables = {
      username: username
    };
    
    const queryHash = "c9100bf9110dd6361671f113dd02e7d6"; // Hash para obtener info de usuario
    
    const response = await fetch(
      `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(
        JSON.stringify(variables)
      )}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-IG-App-ID': '936619743392459',
          'X-IG-WWW-Claim': '0'
        },
        credentials: 'include'
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('[IG-EXT] Respuesta de API para obtener ID:', data);
      
      if (data.data && data.data.user && data.data.user.id) {
        console.log('[IG-EXT] ID de usuario obtenido via API:', data.data.user.id);
        return data.data.user.id;
      }
    } else {
      console.log('[IG-EXT] Error en API para obtener ID:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('[IG-EXT] Error al obtener ID via API:', error.message);
  }
  
  return null;
}

// Función para obtener el ID del usuario de la pestaña activa
async function getCurrentUserId() {
  console.log('[IG-EXT] ===== OBTENIENDO ID DE USUARIO DE LA PESTAÑA =====');
  
  // Obtener la URL actual
  const currentUrl = window.location.href;
  console.log('[IG-EXT] URL actual:', currentUrl);
  
  // Extraer el username de la URL
  const urlMatch = currentUrl.match(/instagram\.com\/([^\/\?]+)/);
  if (urlMatch) {
    const username = urlMatch[1];
    console.log('[IG-EXT] Username extraído de URL:', username);
    
    // Buscar el ID del usuario en los scripts de la página
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.textContent && script.textContent.includes('profile_id')) {
      const match = script.textContent.match(/"profile_id":"(\d+)"/);
      if (match) {
          console.log('[IG-EXT] ID de usuario encontrado en scripts:', match[1]);
        return match[1];
      }
      }
      
      // Buscar también en otros formatos de datos
      if (script.textContent && script.textContent.includes('user_id')) {
        const match = script.textContent.match(/"user_id":"(\d+)"/);
        if (match) {
          console.log('[IG-EXT] ID de usuario encontrado (user_id):', match[1]);
          return match[1];
        }
      }
      
      // Buscar en datos de GraphQL
      if (script.textContent && script.textContent.includes('"id":"') && script.textContent.includes(username)) {
        const match = script.textContent.match(/"id":"(\d+)"/);
        if (match) {
          console.log('[IG-EXT] ID de usuario encontrado en GraphQL:', match[1]);
          return match[1];
        }
      }
    }
    
    // Si no encontramos el ID en scripts, intentar obtenerlo via API
    console.log('[IG-EXT] ID no encontrado en scripts, intentando obtener via API...');
    const userId = await getUserIdByUsername(username);
    if (userId) {
      return userId;
    }
    
    // Fallback: usar el username
    console.log('[IG-EXT] Usando username como fallback:', username);
    return username;
  }
  
  console.log('[IG-EXT] No se pudo extraer username de la URL');
  return null;
}

// Función para obtener seguidores usando la API GraphQL de Instagram con paginación
async function fetchFollowersFromAPI(userIdOrUsername) {
  try {
    console.log('[IG-EXT] Intentando obtener seguidores via GraphQL API para usuario:', userIdOrUsername);
    
    // Si es un username, convertirlo a ID primero
    let userId = userIdOrUsername;
    if (isNaN(userIdOrUsername)) {
      console.log('[IG-EXT] Convertiendo username a ID:', userIdOrUsername);
      userId = await getUserIdByUsername(userIdOrUsername);
      if (!userId) {
        console.log('[IG-EXT] No se pudo convertir username a ID');
        return null;
      }
      console.log('[IG-EXT] ID obtenido:', userId);
    }
    
    const allFollowers = [];
    let hasNextPage = true;
    let endCursor = "";
    
    while (hasNextPage) {
      // Verificar si se debe detener
      if (shouldStop()) {
        console.log('[IG-EXT] Operación detenida por el usuario durante fetchFollowersFromAPI');
        return allFollowers;
      }
      
      // Usar la API GraphQL de Instagram con paginación
      const variables = {
        id: userId,
        include_reel: false,
        fetch_mutual: false,
        first: 50,
        after: endCursor
      };
      
      const queryHash = "c76146de99bb02f6415203be841dd25a"; // Hash conocido para followers
      
      const response = await fetch(
        `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(
          JSON.stringify(variables)
        )}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-IG-App-ID': '936619743392459',
            'X-IG-WWW-Claim': '0'
          },
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[IG-EXT] Respuesta de GraphQL API (página ${allFollowers.length / 50 + 1}):`, data);
        
        if (data.data && data.data.user && data.data.user.edge_followed_by && data.data.user.edge_followed_by.edges) {
          const pageFollowers = data.data.user.edge_followed_by.edges.map(edge => edge.node);
          console.log('[IG-EXT] ===== DATOS DE SEGUIDORES DE LA API =====');
          console.log('[IG-EXT] Estructura completa de la respuesta:', data);
          console.log('[IG-EXT] Edges de seguidores:', data.data.user.edge_followed_by.edges);
          console.log('[IG-EXT] Primer seguidor completo:', pageFollowers[0]);
          if (pageFollowers[0]) {
            console.log('[IG-EXT] Propiedades del primer seguidor:', Object.keys(pageFollowers[0]));
            console.log('[IG-EXT] profile_pic_url del primer seguidor:', pageFollowers[0].profile_pic_url);
          }
          console.log('[IG-EXT] ===== FIN DATOS DE SEGUIDORES =====');
          allFollowers.push(...pageFollowers);
          
          console.log(`[IG-EXT] Seguidores obtenidos en esta página: ${pageFollowers.length}`);
          console.log(`[IG-EXT] Total acumulado: ${allFollowers.length}`);
          
          // Verificar si hay más páginas
          const pageInfo = data.data.user.edge_followed_by.page_info;
          hasNextPage = pageInfo && pageInfo.has_next_page;
          endCursor = pageInfo && pageInfo.end_cursor ? pageInfo.end_cursor : "";
          
          console.log(`[IG-EXT] ¿Hay más páginas? ${hasNextPage}, end_cursor: ${endCursor}`);
          
          // Esperar un poco entre requests para evitar rate limiting
          if (hasNextPage) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          console.log('[IG-EXT] Estructura de respuesta inesperada');
          break;
        }
      } else {
        console.log('[IG-EXT] Error en GraphQL API:', response.status, response.statusText);
        break;
      }
    }
    
    console.log(`[IG-EXT] Total de seguidores obtenidos via GraphQL API: ${allFollowers.length}`);
    return allFollowers;
    
  } catch (error) {
    console.log('[IG-EXT] Error al usar GraphQL API:', error.message);
  }
  return null;
}

// Función para obtener seguidos usando la API GraphQL de Instagram con paginación
async function fetchFollowingFromAPI(userIdOrUsername) {
  try {
    console.log('[IG-EXT] Intentando obtener seguidos via GraphQL API para usuario:', userIdOrUsername);
    
    // Si es un username, convertirlo a ID primero
    let userId = userIdOrUsername;
    if (isNaN(userIdOrUsername)) {
      console.log('[IG-EXT] Convertiendo username a ID:', userIdOrUsername);
      userId = await getUserIdByUsername(userIdOrUsername);
      if (!userId) {
        console.log('[IG-EXT] No se pudo convertir username a ID');
        return null;
      }
      console.log('[IG-EXT] ID obtenido:', userId);
    }
    
    const allFollowing = [];
    let hasNextPage = true;
    let endCursor = "";
    
    while (hasNextPage) {
      // Verificar si se debe detener
      if (shouldStop()) {
        console.log('[IG-EXT] Operación detenida por el usuario durante fetchFollowingFromAPI');
        return allFollowing;
      }
      
      // Usar la API GraphQL de Instagram con paginación para following
      const variables = {
        id: userId,
        include_reel: false,
        fetch_mutual: false,
        first: 50,
        after: endCursor
      };
      
      const queryHash = "d04b0a864b4b54837c0d870b0e77e076"; // Hash conocido para following
      
      const response = await fetch(
        `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(
          JSON.stringify(variables)
        )}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-IG-App-ID': '936619743392459',
            'X-IG-WWW-Claim': '0'
          },
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[IG-EXT] Respuesta de GraphQL API following (página ${allFollowing.length / 50 + 1}):`, data);
        
        if (data.data && data.data.user && data.data.user.edge_follow && data.data.user.edge_follow.edges) {
          const pageFollowing = data.data.user.edge_follow.edges.map(edge => edge.node);
          console.log('[IG-EXT] ===== DATOS DE FOLLOWING DE LA API =====');
          console.log('[IG-EXT] Estructura completa de la respuesta following:', data);
          console.log('[IG-EXT] Edges de following:', data.data.user.edge_follow.edges);
          console.log('[IG-EXT] Primer following completo:', pageFollowing[0]);
          if (pageFollowing[0]) {
            console.log('[IG-EXT] Propiedades del primer following:', Object.keys(pageFollowing[0]));
            console.log('[IG-EXT] profile_pic_url del primer following:', pageFollowing[0].profile_pic_url);
          }
          console.log('[IG-EXT] ===== FIN DATOS DE FOLLOWING =====');
          allFollowing.push(...pageFollowing);
          
          console.log(`[IG-EXT] Seguidos obtenidos en esta página: ${pageFollowing.length}`);
          console.log(`[IG-EXT] Total acumulado: ${allFollowing.length}`);
          
          // Verificar si hay más páginas
          const pageInfo = data.data.user.edge_follow.page_info;
          hasNextPage = pageInfo && pageInfo.has_next_page;
          endCursor = pageInfo && pageInfo.end_cursor ? pageInfo.end_cursor : "";
          
          console.log(`[IG-EXT] ¿Hay más páginas? ${hasNextPage}, end_cursor: ${endCursor}`);
          
          // Esperar un poco entre requests para evitar rate limiting
          if (hasNextPage) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          console.log('[IG-EXT] Estructura de respuesta inesperada para following');
          break;
        }
      } else {
        console.log('[IG-EXT] Error en GraphQL API following:', response.status, response.statusText);
        break;
      }
    }
    
    console.log(`[IG-EXT] Total de seguidos obtenidos via GraphQL API: ${allFollowing.length}`);
    return allFollowing;
    
  } catch (error) {
    console.log('[IG-EXT] Error al usar GraphQL API para following:', error.message);
  }
  return null;
}

// Función para simular scroll real del mouse con más precisión
function simulateRealScroll(element) {
  // Obtener las dimensiones del elemento
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  console.log(`[IG-EXT] Simulando scroll en elemento:`, element);
  console.log(`[IG-EXT] Posición: x=${centerX}, y=${centerY}, width=${rect.width}, height=${rect.height}`);
  
  // Simular eventos de mouse más realistas
  const events = [
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      button: 0
    }),
    new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY + 50
    }),
    new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY + 100
    }),
    new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY + 100,
      button: 0
    })
  ];
  
  // Disparar eventos de mouse
  events.forEach(event => {
    element.dispatchEvent(event);
  });
  
  // Simular wheel event con diferentes valores
  const wheelEvents = [
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
      deltaMode: 0
    }),
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 200,
      deltaMode: 0
    }),
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 300,
      deltaMode: 0
    })
  ];
  
  // Disparar eventos de wheel
  wheelEvents.forEach(event => {
    element.dispatchEvent(event);
  });
  
  // También disparar eventos de scroll
  const scrollEvent = new Event('scroll', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(scrollEvent);
}

async function scrapeFollowersFromPopup() {
  console.log('[IG-EXT] Iniciando extracción de seguidores del popup...');
  
  // Primero intentar obtener el ID del usuario actual
  const userId = await getCurrentUserId();
  console.log('[IG-EXT] ID de usuario obtenido:', userId);
  
  if (userId) {
    // Intentar usar la API primero (funciona para cualquier perfil)
    const apiFollowers = await fetchFollowersFromAPI(userId);
    if (apiFollowers && apiFollowers.length > 0) {
      console.log(`[IG-EXT] Usando datos de API: ${apiFollowers.length} seguidores`);
      return apiFollowers;
    }
  }
  
  // Si no es perfil propio, no podemos usar DOM scrolling
  if (!isOwnProfile()) {
    console.log('[IG-EXT] No es perfil propio y la API falló, intentando obtener username de la URL...');
    
    // Intentar obtener el username de la URL y usar la API
    const username = getCurrentUsername();
    if (username) {
      console.log('[IG-EXT] Intentando obtener seguidores via API usando username:', username);
      const apiFollowers = await fetchFollowersFromAPI(username);
      if (apiFollowers && apiFollowers.length > 0) {
        console.log(`[IG-EXT] Usando datos de API con username: ${apiFollowers.length} seguidores`);
        return apiFollowers;
      }
    }
    
    console.log('[IG-EXT] No se pudieron obtener seguidores para perfil ajeno');
    return [];
  }
  
  // Fallback: usar el método de DOM scrolling (solo para perfil propio)
  console.log('[IG-EXT] Usando método de DOM scrolling como fallback...');
  const dialog = await waitForSelector('div[role="dialog"]');
  
  // Buscar el contenedor que realmente contiene los usuarios
  let userContainer = null;
  const allDivs = Array.from(dialog.querySelectorAll('div'));
  
  // Buscar el contenedor que tiene enlaces de usuario
  for (const div of allDivs) {
    const userLinks = div.querySelectorAll('a[role="link"][href^="/"]');
    if (userLinks.length > 0) {
      userContainer = div;
      console.log('[IG-EXT] Contenedor de usuarios encontrado:', userContainer);
      break;
    }
  }
  
  if (!userContainer) {
    console.error('[IG-EXT] No se encontró el contenedor de usuarios');
    return [];
  }
  
  // Buscar el contenedor scrollable padre de manera más específica
  let scrollableContainer = null;
  
  // Primero buscar contenedores con overflow específico
  for (const div of allDivs) {
    const style = window.getComputedStyle(div);
    if ((style.overflowY === 'auto' || style.overflow === 'auto' || 
         style.overflow === 'hidden auto' || div.style.overflow === 'hidden auto') &&
        div.scrollHeight > div.clientHeight) {
      scrollableContainer = div;
      console.log('[IG-EXT] Contenedor scrollable encontrado por overflow:', scrollableContainer);
      break;
    }
  }
  
  // Si no encontramos uno específico, buscar el padre del contenedor de usuarios
  if (!scrollableContainer) {
    let parent = userContainer.parentElement;
    while (parent && parent !== dialog) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflow === 'auto' || 
          style.overflow === 'hidden auto') {
        scrollableContainer = parent;
        console.log('[IG-EXT] Contenedor scrollable encontrado en padre:', scrollableContainer);
        break;
      }
      parent = parent.parentElement;
    }
  }
  
  // Si aún no encontramos uno, usar el dialog
  if (!scrollableContainer) {
    scrollableContainer = dialog;
    console.log('[IG-EXT] Usando dialog como contenedor scrollable');
  }
  
  console.log('[IG-EXT] Contenedor scrollable FINAL:', scrollableContainer);
  console.log('[IG-EXT] Dimensiones del contenedor:', {
    scrollTop: scrollableContainer.scrollTop,
    scrollHeight: scrollableContainer.scrollHeight,
    clientHeight: scrollableContainer.clientHeight,
    canScroll: scrollableContainer.scrollHeight > scrollableContainer.clientHeight
  });
  
  // Función para extraer usuarios del contenedor
  const extractUsers = () => {
    const userLinks = userContainer.querySelectorAll('a[role="link"][href^="/"]');
    const users = [];
    console.log('[IG-EXT] ===== EXTRACCIÓN DEL DOM =====');
    console.log('[IG-EXT] Enlaces de usuario encontrados:', userLinks.length);
    
    userLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && /^\/[\w\.\-_]+\/$/.test(href)) {
        const username = href.replaceAll('/', '');
        // Buscar imagen de perfil
        const img = link.querySelector('img');
        const profilePicUrl = img ? img.src : null;
        
        console.log(`[IG-EXT] Usuario ${index + 1}:`);
        console.log(`[IG-EXT] - username: ${username}`);
        console.log(`[IG-EXT] - href: ${href}`);
        console.log(`[IG-EXT] - img encontrada: ${img ? 'SÍ' : 'NO'}`);
        console.log(`[IG-EXT] - profilePicUrl: ${profilePicUrl}`);
        
        users.push({
          username: username,
          profile_pic_url: profilePicUrl,
          full_name: username, // Fallback al username si no hay nombre completo
          is_private: false, // No podemos determinar esto del DOM
          is_verified: false, // No podemos determinar esto del DOM
          followed_by_viewer: false, // No podemos determinar esto del DOM
          requested_by_viewer: false // No podemos determinar esto del DOM
        });
      }
    });
    
    console.log('[IG-EXT] Usuarios extraídos del DOM:', users);
    console.log('[IG-EXT] ===== FIN EXTRACCIÓN DEL DOM =====');
    
    return [...new Set(users.map(u => u.username))].map(username => 
      users.find(u => u.username === username)
    );
  };
  
  // Iniciar el proceso de scroll
  let prevUserCount = 0;
  let sameCountCycles = 0;
  let totalScrolls = 0;
  const maxScrolls = 30;
  const maxSameCountCycles = 8;
  
  return new Promise((resolve) => {
    const performScroll = async () => {
      // Verificar si se debe detener
      if (shouldStop()) {
        console.log('[IG-EXT] Operación detenida por el usuario durante scroll');
        const finalUsers = extractUsers();
        console.log(`[IG-EXT] Total de seguidores extraídos (detenido): ${finalUsers.length}`);
        resolve(finalUsers);
        return;
      }
      
      if (totalScrolls >= maxScrolls) {
        console.log('[IG-EXT] Límite de scrolls alcanzado, finalizando...');
        const finalUsers = extractUsers();
        console.log(`[IG-EXT] Total de seguidores extraídos: ${finalUsers.length}`);
        resolve(finalUsers);
        return;
      }
      
      totalScrolls++;
      console.log(`[IG-EXT] Realizando scroll #${totalScrolls}`);
      
      // Simular scroll real en el contenedor específico
      simulateRealScroll(scrollableContainer);
      
      // También intentar scroll programático directo
      if (scrollableContainer.scrollHeight > scrollableContainer.clientHeight) {
        const currentScrollTop = scrollableContainer.scrollTop;
        const maxScrollTop = scrollableContainer.scrollHeight - scrollableContainer.clientHeight;
        
        console.log(`[IG-EXT] Estado del scroll: current=${currentScrollTop}, max=${maxScrollTop}, canScroll=${maxScrollTop > 0}`);
        
        if (maxScrollTop > 0) {
          // Scroll incremental
          scrollableContainer.scrollTop = Math.min(currentScrollTop + 200, maxScrollTop);
        }
      }
      
      // Esperar a que se carguen nuevos usuarios
      await new Promise(res => setTimeout(res, 1500));
      
      const currentUsers = extractUsers();
      console.log(`[IG-EXT] Usuarios visibles tras scroll #${totalScrolls}: ${currentUsers.length}`);
      
      if (currentUsers.length > prevUserCount) {
        console.log(`[IG-EXT] ¡Nuevos usuarios cargados! Total: ${currentUsers.length}`);
        prevUserCount = currentUsers.length;
        sameCountCycles = 0;
      } else {
        sameCountCycles++;
        console.log(`[IG-EXT] No aumentó la cantidad de usuarios por ${sameCountCycles} ciclos`);
      }
      
      if (sameCountCycles >= maxSameCountCycles) {
        console.log('[IG-EXT] No se detectaron más usuarios nuevos, finalizando...');
        console.log(`[IG-EXT] Total de seguidores extraídos: ${currentUsers.length}`);
        resolve(currentUsers);
        return;
      }
      
      // Continuar con el siguiente scroll
      performScroll();
    };
    
    performScroll();
  });
}

// Función para verificar si estamos en el perfil del usuario logueado
function isOwnProfile() {
  // Buscar enlaces de "Editar perfil" o "Configuración" que solo aparecen en el perfil propio
  const editProfileLink = document.querySelector('a[href="/accounts/edit/"]');
  const settingsLink = document.querySelector('a[href="/accounts/activity/"]');
  const followButton = document.querySelector('button[data-testid="follow-button"]');
  
  // Si encontramos enlaces de edición o no hay botón de seguir, es nuestro perfil
  const isOwn = editProfileLink || settingsLink || !followButton;
  
  console.log('[IG-EXT] Verificando si es perfil propio:');
  console.log('[IG-EXT] - editProfileLink:', !!editProfileLink);
  console.log('[IG-EXT] - settingsLink:', !!settingsLink);
  console.log('[IG-EXT] - followButton:', !!followButton);
  console.log('[IG-EXT] - Es perfil propio:', isOwn);
  
  return isOwn;
}

async function openFollowersModal() {
  console.log('[IG-EXT] Verificando si es perfil propio...');
  
  if (!isOwnProfile()) {
    console.log('[IG-EXT] No es perfil propio, usando API directamente');
    // No abrir modal, la API se usará directamente
    return;
  }
  
  console.log('[IG-EXT] Es perfil propio, abriendo modal de seguidores...');
  await new Promise(res => setTimeout(res, 3000));
  
  const followersLink = document.querySelector('a[href$="/followers/"]');
  if (!followersLink) {
    // Intentar con el selector exacto proporcionado
    const altSelector = document.querySelector('a[href$="/followers/"][role="link"]');
    if (!altSelector) {
      console.error('[IG-EXT] No se encontró el enlace de seguidores. ¿Estás en tu perfil?');
      throw new Error('No se encontró el enlace de seguidores. ¿Estás en tu perfil?');
    }
    console.log('[IG-EXT] Enlace de seguidores encontrado con selector alternativo.');
    altSelector.click();
  } else {
    console.log('[IG-EXT] Enlace de seguidores encontrado. Abriendo modal...');
    followersLink.click();
  }
  
  // Esperar a que el modal esté completamente abierto
  await new Promise(res => setTimeout(res, 3000));
  console.log('[IG-EXT] Modal de seguidores debería estar abierto.');
}

async function openFollowingModal() {
  console.log('[IG-EXT] Verificando si es perfil propio...');
  
  if (!isOwnProfile()) {
    console.log('[IG-EXT] No es perfil propio, usando API directamente');
    // No abrir modal, la API se usará directamente
    return;
  }
  
  console.log('[IG-EXT] Es perfil propio, abriendo modal de seguidos...');
  await new Promise(res => setTimeout(res, 3000));
  
  const followingLink = document.querySelector('a[href$="/following/"]');
  if (!followingLink) {
    // Intentar con el selector exacto proporcionado
    const altSelector = document.querySelector('a[href$="/following/"][role="link"]');
    if (!altSelector) {
      console.error('[IG-EXT] No se encontró el enlace de seguidos. ¿Estás en tu perfil?');
      throw new Error('No se encontró el enlace de seguidos. ¿Estás en tu perfil?');
    }
    console.log('[IG-EXT] Enlace de seguidos encontrado con selector alternativo.');
    altSelector.click();
  } else {
    console.log('[IG-EXT] Enlace de seguidos encontrado. Abriendo modal...');
    followingLink.click();
  }
  
  // Esperar a que el modal esté completamente abierto
  await new Promise(res => setTimeout(res, 3000));
  console.log('[IG-EXT] Modal de seguidos debería estar abierto.');
}

// Función para obtener seguidos usando el método de DOM scrolling como fallback
async function scrapeFollowingFromPopup() {
  console.log('[IG-EXT] Iniciando extracción de seguidos del popup...');
  
  // Primero intentar obtener el ID del usuario actual
  const userId = await getCurrentUserId();
  console.log('[IG-EXT] ID de usuario obtenido:', userId);
  
  if (userId) {
    // Intentar usar la API primero (funciona para cualquier perfil)
    const apiFollowing = await fetchFollowingFromAPI(userId);
    if (apiFollowing && apiFollowing.length > 0) {
      console.log(`[IG-EXT] Usando datos de API: ${apiFollowing.length} seguidos`);
      return apiFollowing;
    }
  }
  
  // Si no es perfil propio, no podemos usar DOM scrolling
  if (!isOwnProfile()) {
    console.log('[IG-EXT] No es perfil propio y la API falló, intentando obtener username de la URL...');
    
    // Intentar obtener el username de la URL y usar la API
    const username = getCurrentUsername();
    if (username) {
      console.log('[IG-EXT] Intentando obtener seguidos via API usando username:', username);
      const apiFollowing = await fetchFollowingFromAPI(username);
      if (apiFollowing && apiFollowing.length > 0) {
        console.log(`[IG-EXT] Usando datos de API con username: ${apiFollowing.length} seguidos`);
        return apiFollowing;
      }
    }
    
    console.log('[IG-EXT] No se pudieron obtener seguidos para perfil ajeno');
    return [];
  }
  
  // Fallback: usar el método de DOM scrolling (solo para perfil propio)
  console.log('[IG-EXT] Usando método de DOM scrolling como fallback...');
  const dialog = await waitForSelector('div[role="dialog"]');
  
  // Buscar el contenedor que realmente contiene los usuarios
  let userContainer = null;
  const allDivs = Array.from(dialog.querySelectorAll('div'));
  
  // Buscar el contenedor que tiene enlaces de usuario
  for (const div of allDivs) {
    const userLinks = div.querySelectorAll('a[role="link"][href^="/"]');
    if (userLinks.length > 0) {
      userContainer = div;
      console.log('[IG-EXT] Contenedor de usuarios encontrado:', userContainer);
      break;
    }
  }
  
  if (!userContainer) {
    console.error('[IG-EXT] No se encontró el contenedor de usuarios');
    return [];
  }
  
  // Buscar el contenedor scrollable padre de manera más específica
  let scrollableContainer = null;
  
  // Primero buscar contenedores con overflow específico
  for (const div of allDivs) {
    const style = window.getComputedStyle(div);
    if ((style.overflowY === 'auto' || style.overflow === 'auto' || 
         style.overflow === 'hidden auto' || div.style.overflow === 'hidden auto') &&
        div.scrollHeight > div.clientHeight) {
      scrollableContainer = div;
      console.log('[IG-EXT] Contenedor scrollable encontrado por overflow:', scrollableContainer);
      break;
    }
  }
  
  // Si no encontramos uno específico, buscar el padre del contenedor de usuarios
  if (!scrollableContainer) {
    let parent = userContainer.parentElement;
    while (parent && parent !== dialog) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflow === 'auto' || 
          style.overflow === 'hidden auto') {
        scrollableContainer = parent;
        console.log('[IG-EXT] Contenedor scrollable encontrado en padre:', scrollableContainer);
        break;
      }
      parent = parent.parentElement;
    }
  }
  
  // Si aún no encontramos uno, usar el dialog
  if (!scrollableContainer) {
    scrollableContainer = dialog;
    console.log('[IG-EXT] Usando dialog como contenedor scrollable');
  }
  
  console.log('[IG-EXT] Contenedor scrollable FINAL:', scrollableContainer);
  console.log('[IG-EXT] Dimensiones del contenedor:', {
    scrollTop: scrollableContainer.scrollTop,
    scrollHeight: scrollableContainer.scrollHeight,
    clientHeight: scrollableContainer.clientHeight,
    canScroll: scrollableContainer.scrollHeight > scrollableContainer.clientHeight
  });
  
  // Función para extraer usuarios del contenedor
  const extractUsers = () => {
    const userLinks = userContainer.querySelectorAll('a[role="link"][href^="/"]');
    const users = [];
    userLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && /^\/[\w\.\-_]+\/$/.test(href)) {
        const username = href.replaceAll('/', '');
        // Buscar imagen de perfil
        const img = link.querySelector('img');
        const profilePicUrl = img ? img.src : null;
        
        users.push({
          username: username,
          profile_pic_url: profilePicUrl,
          full_name: username, // Fallback al username si no hay nombre completo
          is_private: false, // No podemos determinar esto del DOM
          is_verified: false, // No podemos determinar esto del DOM
          followed_by_viewer: false, // No podemos determinar esto del DOM
          requested_by_viewer: false // No podemos determinar esto del DOM
        });
      }
    });
    
    return [...new Set(users.map(u => u.username))].map(username => 
      users.find(u => u.username === username)
    );
  };
  
  // Iniciar el proceso de scroll
  let prevUserCount = 0;
  let sameCountCycles = 0;
  let totalScrolls = 0;
  const maxScrolls = 30;
  const maxSameCountCycles = 8;
  
  return new Promise((resolve) => {
    const performScroll = async () => {
      // Verificar si se debe detener
      if (shouldStop()) {
        console.log('[IG-EXT] Operación detenida por el usuario durante scroll');
        const finalUsers = extractUsers();
        console.log(`[IG-EXT] Total de seguidos extraídos (detenido): ${finalUsers.length}`);
        resolve(finalUsers);
        return;
      }
      
      if (totalScrolls >= maxScrolls) {
        console.log('[IG-EXT] Límite de scrolls alcanzado, finalizando...');
        const finalUsers = extractUsers();
        console.log(`[IG-EXT] Total de seguidos extraídos: ${finalUsers.length}`);
        resolve(finalUsers);
        return;
      }
      
      totalScrolls++;
      console.log(`[IG-EXT] Realizando scroll #${totalScrolls}`);
      
      // Simular scroll real en el contenedor específico
      simulateRealScroll(scrollableContainer);
      
      // También intentar scroll programático directo
      if (scrollableContainer.scrollHeight > scrollableContainer.clientHeight) {
        const currentScrollTop = scrollableContainer.scrollTop;
        const maxScrollTop = scrollableContainer.scrollHeight - scrollableContainer.clientHeight;
        
        console.log(`[IG-EXT] Estado del scroll: current=${currentScrollTop}, max=${maxScrollTop}, canScroll=${maxScrollTop > 0}`);
        
        if (maxScrollTop > 0) {
          // Scroll incremental
          scrollableContainer.scrollTop = Math.min(currentScrollTop + 200, maxScrollTop);
        }
      }
      
      // Esperar a que se carguen nuevos usuarios
      await new Promise(res => setTimeout(res, 1500));
      
      const currentUsers = extractUsers();
      console.log(`[IG-EXT] Usuarios visibles tras scroll #${totalScrolls}: ${currentUsers.length}`);
      
      if (currentUsers.length > prevUserCount) {
        console.log(`[IG-EXT] ¡Nuevos usuarios cargados! Total: ${currentUsers.length}`);
        prevUserCount = currentUsers.length;
        sameCountCycles = 0;
      } else {
        sameCountCycles++;
        console.log(`[IG-EXT] No aumentó la cantidad de usuarios por ${sameCountCycles} ciclos`);
      }
      
      if (sameCountCycles >= maxSameCountCycles) {
        console.log('[IG-EXT] No se detectaron más usuarios nuevos, finalizando...');
        console.log(`[IG-EXT] Total de seguidos extraídos: ${currentUsers.length}`);
        resolve(currentUsers);
        return;
      }
      
      // Continuar con el siguiente scroll
      performScroll();
    };
    
    performScroll();
  });
}

// Función para obtener el username de la URL actual
function getCurrentUsername() {
  const currentUrl = window.location.href;
  const urlMatch = currentUrl.match(/instagram\.com\/([^\/\?]+)/);
  return urlMatch ? urlMatch[1] : null;
}

// Función para obtener información del perfil actual
async function getCurrentProfileInfo() {
  try {
    console.log('[IG-EXT] Obteniendo información del perfil actual...');
    
    // Buscar imagen de perfil
    const profilePicElement = document.querySelector('img[alt*="profile picture"], img[alt*="foto de perfil"]');
    const profilePicUrl = profilePicElement ? profilePicElement.src : null;
    
    // Buscar username del perfil actual
    const username = getCurrentUsername();
    
    console.log('[IG-EXT] Información del perfil obtenida:', {
      username: username,
      profilePicUrl: profilePicUrl
    });
    
    return {
      username: username,
      profilePicUrl: profilePicUrl
    };
  } catch (error) {
    console.error('[IG-EXT] Error al obtener información del perfil:', error);
    return null;
  }
}

// Listener para mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analizarSeguidores') {
    (async () => {
      try {
        console.log('[IG-EXT] Acción recibida: analizarSeguidores');
        resetStopFlag(); // Resetear el flag de stop
        await openFollowersModal();
        const followers = await scrapeFollowersFromPopup();
        console.log('[IG-EXT] ===== ENVIANDO DATOS DE SEGUIDORES AL POPUP =====');
        console.log('[IG-EXT] Datos completos de followers a enviar:', followers);
        console.log('[IG-EXT] Cantidad de followers:', followers.length);
        if (followers.length > 0) {
          console.log('[IG-EXT] Primer follower a enviar:', followers[0]);
          console.log('[IG-EXT] Tipo del primer follower:', typeof followers[0]);
        }
        console.log('[IG-EXT] ===== FIN ENVÍO DATOS SEGUIDORES =====');
        sendResponse({
          success: true,
          followers
        });
      } catch (e) {
        console.error('[IG-EXT] Error en el análisis de seguidores:', e);
        sendResponse({ success: false, error: e.message || e.toString() });
      }
    })();
    return true;
  }
  
  if (request.action === 'analizarSeguidos') {
    (async () => {
      try {
        console.log('[IG-EXT] Acción recibida: analizarSeguidos');
        resetStopFlag(); // Resetear el flag de stop
        await openFollowingModal();
        const following = await scrapeFollowingFromPopup();
        console.log('[IG-EXT] ===== ENVIANDO DATOS DE FOLLOWING AL POPUP =====');
        console.log('[IG-EXT] Datos completos de following a enviar:', following);
        console.log('[IG-EXT] Cantidad de following:', following.length);
        if (following.length > 0) {
          console.log('[IG-EXT] Primer following a enviar:', following[0]);
          console.log('[IG-EXT] Tipo del primer following:', typeof following[0]);
        }
        console.log('[IG-EXT] ===== FIN ENVÍO DATOS FOLLOWING =====');
        sendResponse({
          success: true,
          following
        });
      } catch (e) {
        console.error('[IG-EXT] Error en el análisis de seguidos:', e);
        sendResponse({ success: false, error: e.message || e.toString() });
      }
    })();
    return true;
  }
  
  if (request.action === 'getProfileInfo') {
    (async () => {
      try {
        console.log('[IG-EXT] Acción recibida: getProfileInfo');
        const profileInfo = await getCurrentProfileInfo();
        sendResponse({
          success: true,
          profileInfo
        });
      } catch (e) {
        console.error('[IG-EXT] Error al obtener información del perfil:', e);
        sendResponse({ success: false, error: e.message || e.toString() });
      }
    })();
    return true;
  }
  
  if (request.action === 'detenerOperacion') {
    console.log('[IG-EXT] Acción recibida: detenerOperacion');
    stopOperation = true;
    sendResponse({ success: true, message: 'Operación detenida' });
    return true;
  }
});
