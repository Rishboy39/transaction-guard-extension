// Content script for Transaction Guard

let isActive = false;
let overlay = null;
let scanInterval = null;

// Initialize
chrome.storage.local.get(['isActive'], (result) => {
  isActive = result.isActive || false;
  if (isActive) {
    startMonitoring();
  }
});

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isActive = request.active;
    if (isActive) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    sendResponse({ success: true });
  }
});

function startMonitoring() {
  createOverlay();
  scanForTransactions();
  
  // Scan periodically
  scanInterval = setInterval(() => {
    scanForTransactions();
  }, 2000);
  
  // Update stats
  updateStats();
}

function stopMonitoring() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
}

function createOverlay() {
  if (overlay) return;
  
  overlay = document.createElement('div');
  overlay.id = 'transaction-guard-overlay';
  overlay.innerHTML = `
    <div class="tg-status-card">
      <div class="tg-header">
        <span class="tg-icon">🛡️</span>
        <span class="tg-title">Transaction Guard</span>
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
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Close button handler
  overlay.querySelector('#tg-close-btn').addEventListener('click', () => {
    stopMonitoring();
    chrome.storage.local.set({ isActive: false });
    const toggleSwitch = document.querySelector('#toggleSwitch');
    if (toggleSwitch) toggleSwitch.checked = false;
  });
  
  // Make overlay draggable
  makeDraggable(overlay);
}

function makeDraggable(element) {
  const header = element.querySelector('.tg-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  function dragStart(e) {
    if (e.target.id === 'tg-close-btn') return;
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
    }
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      xOffset = currentX;
      yOffset = currentY;
      
      setTranslate(currentX, currentY, element);
    }
  }
  
  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }
  
  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }
}

function scanForTransactions() {
  if (!overlay) return;
  
  const statusEl = overlay.querySelector('#tg-status');
  const resultEl = overlay.querySelector('#tg-result');
  const resultIcon = overlay.querySelector('#tg-result-icon');
  const resultText = overlay.querySelector('#tg-result-text');
  const resultDetails = overlay.querySelector('#tg-result-details');
  
  // Detect transaction-related elements
  const transactionIndicators = detectTransactionElements();
  
  if (transactionIndicators.found) {
    statusEl.style.display = 'none';
    resultEl.style.display = 'block';
    
    // Analyze transaction (prototype - basic heuristics)
    const analysis = analyzeTransaction(transactionIndicators);
    
    if (analysis.isScam) {
      resultIcon.innerHTML = '🚨';
      resultIcon.className = 'tg-result-icon scam';
      resultText.textContent = '⚠️ Potential Scam Detected';
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
      resultIcon.innerHTML = '✅';
      resultIcon.className = 'tg-result-icon legit';
      resultText.textContent = '✓ Transaction Looks Legitimate';
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
    analysis.checks.push('✓ Secure connection (HTTPS)');
  } else {
    scamScore += 3;
    analysis.warnings.push('⚠️ Not using HTTPS (insecure connection)');
  }
  
  // Check domain age/trust (prototype - basic check)
  const domain = window.location.hostname;
  const suspiciousDomains = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl'];
  if (suspiciousDomains.some(sd => domain.includes(sd))) {
    scamScore += 2;
    analysis.warnings.push('⚠️ Suspicious URL shortener detected');
  }
  
  // Check for suspicious keywords
  if (indicators.suspiciousKeywords.length > 0) {
    scamScore += indicators.suspiciousKeywords.length;
    analysis.warnings.push(`⚠️ Found ${indicators.suspiciousKeywords.length} suspicious phrases`);
  }
  
  // Check for multiple payment forms (could indicate phishing)
  if (indicators.paymentForms.length > 2) {
    scamScore += 1;
    analysis.warnings.push('⚠️ Multiple payment forms detected');
  }
  
  // Check for legitimate indicators
  if (indicators.paymentForms.length > 0) {
    analysis.checks.push('✓ Payment form detected');
  }
  
  if (indicators.priceElements.length > 0) {
    analysis.checks.push('✓ Price information found');
  }
  
  // Check for common legitimate payment processors
  const pageText = document.body.textContent.toLowerCase();
  const legitimateProcessors = ['stripe', 'paypal', 'square', 'shopify'];
  const hasLegitimateProcessor = legitimateProcessors.some(proc => pageText.includes(proc));
  
  if (hasLegitimateProcessor) {
    analysis.checks.push('✓ Recognized payment processor');
    scamScore = Math.max(0, scamScore - 1);
  }
  
  // Determine if scam (threshold: 3 or more)
  analysis.isScam = scamScore >= 3;
  
  if (!analysis.isScam && analysis.checks.length > 0) {
    analysis.checks.push('✓ No major red flags detected');
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

