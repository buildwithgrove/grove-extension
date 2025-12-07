// Listen for messages from external web pages (e.g., localhost:3000)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('Received external message from:', sender.origin);

  if (message.type === 'SET_JWT') {
    // Store JWT and optionally environment/chain if provided by webapp
    const dataToStore = { GROVE_API_JWT: message.jwt };

    // If webapp provides environment info, use it to auto-switch
    if (message.environment === 'production' || message.environment === 'testnet') {
      dataToStore.groveEndpoint = message.environment;
      dataToStore.groveChain = message.environment === 'production' ? 'base' : 'base-sepolia';
      console.log(`JWT stored with environment: ${message.environment}`);
    }

    chrome.storage.local.set(dataToStore, () => {
      console.log('JWT stored successfully');
      sendResponse({ success: true, environment: message.environment || null });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_JWT') {
    chrome.storage.local.get(['GROVE_API_JWT'], (result) => {
      sendResponse({ jwt: result.GROVE_API_JWT || null });
    });
    return true;
  }

  if (message.type === 'PING') {
    chrome.storage.local.get(['GROVE_API_JWT'], (result) => {
      const hasKey = !!(result.GROVE_API_JWT && result.GROVE_API_JWT.length > 0);
      sendResponse({ hasKey });
    });
    return true;
  }

  if (message.type === 'OPEN_POPUP') {
    const chromeVersion = parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');

    if (chromeVersion >= 127 && chrome.action.openPopup) {
      chrome.action.openPopup()
        .then(() => sendResponse({ success: true, opened: true }))
        .catch(() => sendResponse({ success: true, opened: false, reason: 'popup_blocked' }));
    } else {
      sendResponse({ success: true, opened: false, reason: 'unsupported_version', chromeVersion });
    }
    return true;
  }

  sendResponse({ error: 'Unknown message type' });
});
