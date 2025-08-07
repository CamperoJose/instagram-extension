# Instagram Follower Checker

Una extensión de Chrome que analiza tu perfil de Instagram para mostrar información detallada sobre tus seguidores y seguidos.

## Funcionalidades

- **Análisis de cualquier perfil**: Analiza seguidores y seguidos de cualquier usuario de Instagram
- **Detección automática**: Obtiene automáticamente el ID del usuario de la pestaña activa
- **Dashboard completo**: Métricas principales y estratégicas con porcentajes
- **Análisis de engagement**: Tasa de seguimiento mutuo y ratio de seguimiento
- **Cards de usuario detalladas**: Muestra foto de perfil, nombre completo y estado de verificación
- **Botones de perfil**: Enlaces directos para ver el perfil de cada usuario
- **Identificación de relaciones**: Muestra quién no te sigue de vuelta y a quién no sigues de vuelta
- **Interfaz moderna**: Diseño tipo Instagram con cards y scroll suave
- **Página completa**: Se abre en una nueva pestaña, no se pierden los datos al navegar
- **Imágenes directas**: Usa las URLs originales de Instagram sin proxy
- **Control de operaciones**: Botón para detener el proceso en cualquier momento
- **Datos completos**: Utiliza la API de Instagram para obtener información detallada
- **Experiencia persistente**: Los datos permanecen cargados mientras navegas

## Cómo usar

1. **Instalar la extensión**:
   - Abre Chrome y ve a `chrome://extensions/`
   - Activa el "Modo desarrollador"
   - Haz clic en "Cargar descomprimida" y selecciona la carpeta de la extensión

2. **Usar la extensión**:
   - Ve a cualquier perfil de Instagram (`instagram.com/usuario`)
   - Haz clic en el icono de la extensión en la barra de herramientas
   - Se abrirá una nueva pestaña con la interfaz de análisis
   - Si no detecta Instagram, haz clic en "Refrescar conexión"
   - Presiona "Cargar datos de mi perfil"
   - Espera a que se complete el análisis
   - Explora los resultados sin perder los datos cargados

## Información mostrada

- **📊 Resumen del perfil**: Total de seguidores y seguidos
- **❌ No te siguen de vuelta**: Lista de usuarios que sigues pero no te siguen
- **🚫 No sigues de vuelta**: Lista de usuarios que te siguen pero no sigues
- **📋 Listas completas**: Listas completas de seguidores y seguidos

### Dashboard incluye:
- **Métricas principales**: Seguidores, siguiendo y mutuales
- **Métricas estratégicas**: Porcentajes de quién no te sigue de vuelta
- **Análisis de engagement**: Tasa de seguimiento mutuo y ratio de seguimiento
- **Cards de usuario**: Con fotos de perfil y estados de relación
- **Enlaces directos**: Botones para ver perfiles de Instagram

### Cards de usuario incluyen:
- **Foto de perfil**: Imagen de perfil del usuario (URL directa de Instagram)
- **Nombre de usuario**: @username
- **Nombre completo**: Nombre real del usuario
- **Estado de verificación**: Badge de verificación si está verificado
- **Estado privado**: Indicador si la cuenta es privada
- **Estado de relación**: Si lo sigues, si te sigue, si está solicitado
- **Botón "Ver perfil"**: Enlace directo al perfil de Instagram

## Notas técnicas

- La extensión utiliza la API GraphQL de Instagram cuando es posible
- Incluye fallback a scraping del DOM si la API no está disponible
- Respeta los límites de rate limiting de Instagram
- Funciona solo en perfiles públicos o en tu propio perfil

## Versión

1.5 - Análisis de cualquier perfil de Instagram (no solo el usuario logueado)

## Archivos principales

- `analyzer.html` - Página principal de análisis
- `analyzer.js` - Lógica de la página de análisis
- `analyzer-styles.css` - Estilos de la página de análisis
- `content.js` - Script que se ejecuta en Instagram
- `manifest.json` - Configuración de la extensión
- `background.js` - Script de fondo para manejar el icono
- `not-instagram.html` - Página de error cuando no estás en Instagram 