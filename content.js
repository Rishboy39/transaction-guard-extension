// Content script for Transaction Guard

// Comprehensive list of known scam sites (from scamwave.com and other sources)
const KNOWN_SCAM_SITES = [
  'likedefi.com',
  'www.likedefi.com',
  // Add more known scam domains here - this list should be regularly updated
  // Common patterns: crypto scams, fake exchanges, phishing sites
];

// Whitelist of legitimate major financial sites
const LEGITIMATE_FINANCIAL_SITES = [
  // Major Banks
  'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com', 'usbank.com',
  'capitalone.com', 'tdbank.com', 'pnc.com', 'truist.com', 'regions.com',
  'hsbc.com', 'barclays.com', 'lloydsbank.com', 'natwest.com', 'santander.com',
  
  // Investment & Trading Platforms
  'fidelity.com', 'schwab.com', 'vanguard.com', 'etrade.com', 'tdameritrade.com',
  'robinhood.com', 'interactivebrokers.com', 'merrilledge.com', 'morganstanley.com',
  'goldmansachs.com', 'jpmorgan.com', 'blackrock.com', 'statestreet.com',
  
  // Payment Processors
  'paypal.com', 'stripe.com', 'square.com', 'venmo.com', 'zelle.com',
  'apple.com', // Apple Pay
  'google.com', // Google Pay
  'amazon.com', // Amazon Pay
  
  // Credit Cards
  'americanexpress.com', 'discover.com', 'mastercard.com', 'visa.com',
  
  // Cryptocurrency Exchanges (Legitimate)
  'coinbase.com', 'binance.com', 'kraken.com', 'gemini.com', 'bitstamp.net',
  
  // E-commerce & Marketplaces
  'amazon.com', 'ebay.com', 'etsy.com', 'shopify.com', 'walmart.com',
  'target.com', 'bestbuy.com', 'costco.com', 'homedepot.com',
  
  // Financial Services
  'intuit.com', // QuickBooks, TurboTax
  'mint.com', 'creditkarma.com', 'experian.com', 'transunion.com', 'equifax.com',
  'zillow.com', 'realtor.com', 'redfin.com',
  
  // Insurance
  'geico.com', 'progressive.com', 'statefarm.com', 'allstate.com', 'usaa.com',
  
  // Government Financial Sites
  'irs.gov', 'ssa.gov', 'treasury.gov', 'fdic.gov',
  
  // International Banks (Major)
  'deutsche-bank.com', 'bnpparibas.com', 'credit-suisse.com', 'ubs.com',
  'societegenerale.com', 'ing.com', 'rabobank.com', 'commerzbank.com'
];

let isActive = false;
let overlay = null;
let scanInterval = null;

// Initialize
chrome.storage.local.get(['isActive', 'manuallyActivated'], (result) => {
  isActive = result.isActive || false;
  const manual = result.manuallyActivated || false;
  
  if (isActive) {
    // If manually activated, show overlay
    if (manual) {
      startMonitoring();
    } else {
      // Otherwise, just do background scanning
      const currentDomain = window.location.hostname.toLowerCase();
      const isKnownScam = KNOWN_SCAM_SITES.some(site => {
        const siteLower = site.toLowerCase();
        return currentDomain === siteLower || currentDomain.includes(siteLower);
      });
      
      if (isKnownScam) {
        startMonitoring();
      } else {
        scanForTransactionsBackground();
        scanInterval = setInterval(() => {
          scanForTransactionsBackground();
        }, 2000);
      }
    }
  }
});

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isActive = request.active;
    if (isActive) {
      // Mark as manually activated
      chrome.storage.local.set({ manuallyActivated: true });
      startMonitoring();
    } else {
      chrome.storage.local.set({ manuallyActivated: false });
      stopMonitoring();
    }
    sendResponse({ success: true });
  }
});

function startMonitoring() {
  // Check if site is illegitimate first
  const currentDomain = window.location.hostname.toLowerCase();
  const isKnownScam = KNOWN_SCAM_SITES.some(site => {
    const siteLower = site.toLowerCase();
    return currentDomain === siteLower || currentDomain.includes(siteLower);
  });
  
  // Check if manually activated
  chrome.storage.local.get(['manuallyActivated'], (result) => {
    const manual = result.manuallyActivated || false;
    
    // Show overlay if scam site OR manually activated
    if (isKnownScam || manual) {
      createOverlay();
      scanForTransactions();
      
      // Scan periodically
      scanInterval = setInterval(() => {
        scanForTransactions();
      }, 2000);
    } else {
      // Background scanning - check for scams and show overlay if found
      scanForTransactionsBackground();
      scanInterval = setInterval(() => {
        scanForTransactionsBackground();
      }, 2000);
    }
  });
  
  // Update stats
  updateStats();
}

function scanForTransactionsBackground() {
  // Background scanning without showing overlay initially
  const currentDomain = window.location.hostname.toLowerCase();
  const isKnownScam = KNOWN_SCAM_SITES.some(site => {
    const siteLower = site.toLowerCase();
    return currentDomain === siteLower || currentDomain.includes(siteLower);
  });
  
  // If scam detected, show overlay
  if (isKnownScam && !overlay) {
    createOverlay();
    scanForTransactions();
  }
}

function stopMonitoring() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  
  // Update status indicator in overlay if it exists
  if (overlay) {
    const statusEl = overlay.querySelector('#tg-status');
    const resultEl = overlay.querySelector('#tg-result');
    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.querySelector('.tg-status-indicator').className = 'tg-status-indicator';
      statusEl.querySelector('span').textContent = 'Monitoring paused';
    }
    if (resultEl) {
      resultEl.style.display = 'none';
    }
  }
}

function createOverlay() {
  if (overlay) return;
  
  overlay = document.createElement('div');
  overlay.id = 'transaction-guard-overlay';
  overlay.innerHTML = `
    <div class="tg-status-card">
      <div class="tg-header">
        <span class="tg-title">Transaction Guard</span>
        <div class="tg-toggle-container">
          <label class="tg-toggle-label">
            <input type="checkbox" id="tg-monitoring-toggle" checked>
            <span class="tg-toggle-slider"></span>
          </label>
          <span class="tg-toggle-text" id="tg-toggle-text">On</span>
        </div>
        <button class="tg-close" id="tg-close-btn">×</button>
      </div>
      <div class="tg-content">
        <div class="tg-status" id="tg-status">
          <div class="tg-status-indicator scanning"></div>
          <span>Scanning page...</span>
        </div>
        <div class="tg-result" id="tg-result" style="display: none;">
          <div class="tg-result-icon" id="tg-result-icon"></div>
          <div class="tg-result-text" id="tg-result-text"></div>
          <div class="tg-result-details" id="tg-result-details"></div>
        </div>
        <div class="tg-action-buttons">
          <button class="tg-action-btn tg-amazon-btn" id="tg-amazon-btn">
            <span class="tg-btn-text">Amazon</span>
          </button>
          <div class="tg-help-container">
            <button class="tg-action-btn tg-help-btn" id="tg-help-btn">
              <span class="tg-btn-text">Call Help</span>
              <span class="tg-dropdown-arrow">▼</span>
            </button>
            <div class="tg-help-dropdown" id="tg-help-dropdown" style="display: none;">
              <button class="tg-contact-btn" data-contact="Sarah Johnson">
                <span class="tg-contact-name">Sarah Johnson</span>
              </button>
              <button class="tg-contact-btn" data-contact="Michael Chen">
                <span class="tg-contact-name">Michael Chen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <button class="tg-settings-btn" id="tg-settings-btn">⚙</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Monitoring toggle handler
  const monitoringToggle = overlay.querySelector('#tg-monitoring-toggle');
  const toggleText = overlay.querySelector('#tg-toggle-text');
  
  // Set initial state
  chrome.storage.local.get(['isActive'], (result) => {
    const currentActive = result.isActive !== false; // Default to true
    monitoringToggle.checked = currentActive;
    toggleText.textContent = currentActive ? 'On' : 'Off';
  });
  
  monitoringToggle.addEventListener('change', (e) => {
    const isActive = e.target.checked;
    toggleText.textContent = isActive ? 'On' : 'Off';
    chrome.storage.local.set({ isActive });
    
    if (isActive) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  });
  
  // Close button handler
  overlay.querySelector('#tg-close-btn').addEventListener('click', () => {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    stopMonitoring();
    chrome.storage.local.set({ isActive: false });
    const toggleSwitch = document.querySelector('#toggleSwitch');
    if (toggleSwitch) toggleSwitch.checked = false;
  });
  
  // Amazon button handler
  overlay.querySelector('#tg-amazon-btn').addEventListener('click', () => {
    window.open('https://www.amazon.com', '_blank');
  });
  
  // Help button handler with dropdown
  const helpBtn = overlay.querySelector('#tg-help-btn');
  const helpDropdown = overlay.querySelector('#tg-help-dropdown');
  
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = helpDropdown.style.display === 'block';
    helpDropdown.style.display = isVisible ? 'none' : 'block';
  });
  
  // Contact button handlers
  const contactButtons = overlay.querySelectorAll('.tg-contact-btn');
  contactButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const contactName = btn.getAttribute('data-contact');
      alert(`Calling ${contactName}...\n\n(Feature coming soon - this will dial your emergency contact)`);
      helpDropdown.style.display = 'none';
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!overlay.contains(e.target) || (!helpBtn.contains(e.target) && !helpDropdown.contains(e.target))) {
      helpDropdown.style.display = 'none';
    }
  });
  
  // Settings button handler
  overlay.querySelector('#tg-settings-btn').addEventListener('click', () => {
    alert('Settings panel coming soon!\n\nHere you can configure:\n- Emergency contacts\n- Amazon preferences\n- Send money settings');
  });
  
  // Make overlay draggable
  makeDraggable(overlay);
}

function makeDraggable(element) {
  // Disable dragging for full-height overlay - it's fixed to the right side
  // The header can still be used for visual purposes but won't drag
  const header = element.querySelector('.tg-header');
  header.style.cursor = 'default';
}

function scanForTransactions() {
  if (!overlay) return;
  
  const statusEl = overlay.querySelector('#tg-status');
  const resultEl = overlay.querySelector('#tg-result');
  const resultIcon = overlay.querySelector('#tg-result-icon');
  const resultText = overlay.querySelector('#tg-result-text');
  const resultDetails = overlay.querySelector('#tg-result-details');
  
  const currentDomain = window.location.hostname.toLowerCase();
  
  // Check whitelist first (legitimate sites get fast-track approval)
  const isLegitimate = LEGITIMATE_FINANCIAL_SITES.some(site => {
    const siteLower = site.toLowerCase();
    return currentDomain === siteLower || currentDomain.endsWith('.' + siteLower);
  });
  
  if (isLegitimate) {
    statusEl.style.display = 'none';
    resultEl.style.display = 'block';
    resultIcon.innerHTML = '✓';
    resultIcon.className = 'tg-result-icon legit';
    resultText.textContent = 'Verified Legitimate Site';
    resultText.className = 'tg-result-text legit';
    resultDetails.innerHTML = `
      <div class="tg-info">
        <strong>Verified Safe:</strong>
        <ul>
          <li>This is a verified legitimate financial website</li>
          <li>Safe to proceed with transactions</li>
          <li>Site is on our trusted whitelist</li>
        </ul>
      </div>
    `;
    
    chrome.runtime.sendMessage({
      action: 'transactionDetected',
      data: { isScam: false, isLegitimate: true, domain: currentDomain }
    });
    return;
  }
  
  // Check blacklist (known scam sites)
  const isKnownScam = KNOWN_SCAM_SITES.some(site => {
    const siteLower = site.toLowerCase();
    return currentDomain === siteLower || currentDomain.includes(siteLower);
  });
  
  if (isKnownScam) {
    statusEl.style.display = 'none';
    resultEl.style.display = 'block';
    resultIcon.innerHTML = '✕';
    resultIcon.className = 'tg-result-icon scam big-x';
    resultText.textContent = 'SCAM SITE DETECTED';
    resultText.className = 'tg-result-text scam';
    resultDetails.innerHTML = `
      <div class="tg-warning">
        <strong>WARNING: This is a known scam website!</strong>
        <p style="margin-top: 12px; font-size: 16px; font-weight: 600;">
          Do not enter any personal information or make any transactions on this site.
        </p>
        <ul style="margin-top: 12px;">
          <li>This domain has been flagged as fraudulent</li>
          <li>Your financial information may be at risk</li>
          <li>Close this page immediately</li>
          <li>Reported on scamwave.com and other security databases</li>
        </ul>
      </div>
    `;
    
    // Notify background
    chrome.runtime.sendMessage({
      action: 'transactionDetected',
      data: { isScam: true, isKnownScam: true, domain: currentDomain }
    });
    return;
  }
  
  // Detect transaction-related elements
  const transactionIndicators = detectTransactionElements();
  
  if (transactionIndicators.found) {
    statusEl.style.display = 'none';
    resultEl.style.display = 'block';
    
    // Analyze transaction (prototype - basic heuristics)
    const analysis = analyzeTransaction(transactionIndicators);
    
    if (analysis.isScam) {
      resultIcon.innerHTML = '✕';
      resultIcon.className = 'tg-result-icon scam';
      resultText.textContent = 'Potential Scam Detected';
      resultText.className = 'tg-result-text scam';
      resultDetails.innerHTML = `
        <div class="tg-warning">
          <strong>Warning Signs:</strong>
          <ul>
            ${analysis.warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      resultIcon.innerHTML = '✓';
      resultIcon.className = 'tg-result-icon legit';
      resultText.textContent = 'Transaction Looks Legitimate';
      resultText.className = 'tg-result-text legit';
      resultDetails.innerHTML = `
        <div class="tg-info">
          <strong>Analysis:</strong>
          <ul>
            ${analysis.checks.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    // Notify background
    chrome.runtime.sendMessage({
      action: 'transactionDetected',
      data: analysis
    });
  } else {
    statusEl.style.display = 'flex';
    resultEl.style.display = 'none';
    statusEl.querySelector('.tg-status-indicator').className = 'tg-status-indicator scanning';
  }
}

function detectTransactionElements() {
  const indicators = {
    found: false,
    paymentForms: [],
    priceElements: [],
    submitButtons: [],
    suspiciousKeywords: []
  };
  
  // Look for payment forms
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const formText = form.textContent.toLowerCase();
    if (formText.includes('payment') || formText.includes('checkout') || 
        formText.includes('buy') || formText.includes('purchase') ||
        form.querySelector('input[type="email"]') || 
        form.querySelector('input[type="tel"]') ||
        form.querySelector('input[name*="card"]') ||
        form.querySelector('input[name*="cvv"]')) {
      indicators.found = true;
      indicators.paymentForms.push(form);
    }
  });
  
  // Look for price elements
  const priceSelectors = [
    '[class*="price"]',
    '[class*="cost"]',
    '[class*="amount"]',
    '[id*="price"]',
    '[id*="cost"]',
    '[id*="amount"]'
  ];
  
  priceSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent;
      if (/\$[\d,]+\.?\d*/.test(text) || /€[\d,]+\.?\d*/.test(text) || 
          /£[\d,]+\.?\d*/.test(text) || /\d+\.?\d*\s*(USD|EUR|GBP)/i.test(text)) {
        indicators.found = true;
        indicators.priceElements.push(el);
      }
    });
  });
  
  // Look for submit/pay buttons
  const buttons = document.querySelectorAll('button, input[type="submit"], a[class*="button"]');
  buttons.forEach(btn => {
    const text = btn.textContent.toLowerCase();
    if (text.includes('pay') || text.includes('buy') || text.includes('purchase') ||
        text.includes('checkout') || text.includes('submit payment')) {
      indicators.found = true;
      indicators.submitButtons.push(btn);
    }
  });
  
  // Check for suspicious keywords
  const pageText = document.body.textContent.toLowerCase();
  const suspiciousTerms = [
    'urgent payment required',
    'verify your account',
    'limited time offer',
    'act now',
    'your account will be closed',
    'click here immediately'
  ];
  
  suspiciousTerms.forEach(term => {
    if (pageText.includes(term)) {
      indicators.found = true;
      indicators.suspiciousKeywords.push(term);
    }
  });
  
  return indicators;
}

function analyzeTransaction(indicators) {
  const analysis = {
    isScam: false,
    warnings: [],
    checks: []
  };
  
  let scamScore = 0;
  
  // Check for HTTPS
  const isSecure = window.location.protocol === 'https:';
  if (isSecure) {
    analysis.checks.push('Secure connection (HTTPS)');
  } else {
    scamScore += 3;
    analysis.warnings.push('Not using HTTPS (insecure connection)');
  }
  
  // Check domain age/trust (prototype - basic check)
  const domain = window.location.hostname;
  const suspiciousDomains = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl'];
  if (suspiciousDomains.some(sd => domain.includes(sd))) {
    scamScore += 2;
    analysis.warnings.push('Suspicious URL shortener detected');
  }
  
  // Check for suspicious keywords
  if (indicators.suspiciousKeywords.length > 0) {
    scamScore += indicators.suspiciousKeywords.length;
    analysis.warnings.push(`Found ${indicators.suspiciousKeywords.length} suspicious phrases`);
  }
  
  // Check for multiple payment forms (could indicate phishing)
  if (indicators.paymentForms.length > 2) {
    scamScore += 1;
    analysis.warnings.push('Multiple payment forms detected');
  }
  
  // Check for legitimate indicators
  if (indicators.paymentForms.length > 0) {
    analysis.checks.push('Payment form detected');
  }
  
  if (indicators.priceElements.length > 0) {
    analysis.checks.push('Price information found');
  }
  
  // Check if domain is on legitimate whitelist (even if subdomain)
  const currentDomain = window.location.hostname.toLowerCase();
  const isOnWhitelist = LEGITIMATE_FINANCIAL_SITES.some(site => {
    const siteLower = site.toLowerCase();
    return currentDomain === siteLower || currentDomain.endsWith('.' + siteLower);
  });
  
  if (isOnWhitelist) {
    analysis.checks.push('Domain verified on legitimate financial sites list');
    scamScore = Math.max(0, scamScore - 3); // Strong positive signal
  }
  
  // Check for common legitimate payment processors
  const pageText = document.body.textContent.toLowerCase();
  const legitimateProcessors = ['stripe', 'paypal', 'square', 'shopify'];
  const hasLegitimateProcessor = legitimateProcessors.some(proc => pageText.includes(proc));
  
  if (hasLegitimateProcessor) {
    analysis.checks.push('Recognized payment processor');
    scamScore = Math.max(0, scamScore - 1);
  }
  
  // Determine if scam (threshold: 3 or more)
  analysis.isScam = scamScore >= 3;
  
  if (!analysis.isScam && analysis.checks.length > 0) {
    analysis.checks.push('No major red flags detected');
  }
  
  return analysis;
}

function updateStats() {
  chrome.storage.local.get(['pagesScanned', 'transactionsFound'], (result) => {
    const pagesScanned = (result.pagesScanned || 0) + 1;
    const transactionsFound = result.transactionsFound || 0;
    
    chrome.storage.local.set({ pagesScanned });
    
    chrome.runtime.sendMessage({
      action: 'updateStats',
      pagesScanned,
      transactionsFound
    });
  });
}

// Update stats when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateStats);
} else {
  updateStats();
}

