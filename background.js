// Background script para manejar el clic en el icono de la extensión
chrome.action.onClicked.addListener(async (tab) => {
  // Buscar cualquier pestaña de Instagram, no solo la activa
  const tabs = await chrome.tabs.query({});
  const instagramTab = tabs.find(tab => 
    tab.url && tab.url.includes('instagram.com')
  );
  
  if (instagramTab) {
    // Forzar refresh de la pestaña de Instagram antes de abrir el análisis
    console.log('[IG-EXT] Refrescando pestaña de Instagram:', instagramTab.url);
    
    try {
      // Hacer refresh de la pestaña de Instagram
      await chrome.tabs.reload(instagramTab.id, { bypassCache: true });
      
      // Esperar un poco para que el refresh se complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('[IG-EXT] Refresh completado, abriendo página de análisis');
      
      // Abrir la página de análisis en una nueva pestaña
      chrome.tabs.create({
        url: chrome.runtime.getURL('analyzer.html')
      });
    } catch (error) {
      console.error('[IG-EXT] Error al refrescar pestaña de Instagram:', error);
      
      // Si falla el refresh, abrir el análisis de todas formas
      chrome.tabs.create({
        url: chrome.runtime.getURL('analyzer.html')
      });
    }
  } else {
    // Si no hay pestañas de Instagram, mostrar un mensaje
    chrome.tabs.create({
      url: chrome.runtime.getURL('not-instagram.html')
    });
  }
});
