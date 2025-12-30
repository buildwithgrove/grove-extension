/**
 * Browser detection helpers for feature gating
 * Uses userAgentData when available and falls back to userAgent string
 */

(function () {
  function hasArcBrand(brands) {
    return brands.some(brand => {
      const name = brand?.brand || brand?.name;
      return typeof name === 'string' && name.toLowerCase().includes('arc');
    });
  }

  function isArcBrowser() {
    if (typeof navigator === 'undefined') {
      return false;
    }

    if (navigator.userAgentData?.brands) {
      if (hasArcBrand(navigator.userAgentData.brands)) {
        return true;
      }
    }

    const ua = navigator.userAgent || '';
    return /\barc\//i.test(ua) || /\barc browser\b/i.test(ua);
  }

  function supportsSidePanel() {
    if (typeof chrome === 'undefined' || !chrome.sidePanel?.open) {
      return false;
    }

    return !isArcBrowser();
  }

  const BrowserDetection = {
    isArcBrowser,
    supportsSidePanel,
  };

  if (typeof self !== 'undefined') {
    self.BrowserDetection = BrowserDetection;
  }
})();
