// Sempre abre a URL no topo, fora de iframes; com fallback popup.
export function launchTop(authUrl: string) {
  // Log para debug da URL de redirect
  const origin = window.location.origin;
  const redirectUri = `${origin}/tiny-v3-callback`;
  console.log('TINY_REDIRECT_URI:', redirectUri);
  
  try {
    const inIframe = window.self !== window.top;
    if (inIframe && window.top) {
      (window.top as Window).location.href = authUrl; // sai do iframe
      return;
    }
    window.location.href = authUrl; // navegação normal
  } catch {
    // fallback: popup
    window.open(authUrl, '_blank', 'noopener,noreferrer');
  }
}