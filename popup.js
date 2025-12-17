document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const toggleLabel = document.getElementById('toggleLabel');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const statusDot = statusIndicator.querySelector('.status-dot');
  const statsSection = document.getElementById('statsSection');
  const pagesScanned = document.getElementById('pagesScanned');
  const transactionsFound = document.getElementById('transactionsFound');

  // Load current state
  const result = await chrome.storage.local.get(['isActive', 'pagesScanned', 'transactionsFound']);
  const isActive = result.isActive || false;
  
  toggleSwitch.checked = isActive;
  updateUI(isActive);
  
  if (result.pagesScanned) {
    pagesScanned.textContent = result.pagesScanned;
    transactionsFound.textContent = result.transactionsFound || 0;
    statsSection.style.display = 'block';
  }

  // Toggle switch handler
  toggleSwitch.addEventListener('change', async (e) => {
    const active = e.target.checked;
    await chrome.storage.local.set({ isActive: active });
    
    // Send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'toggle', active });
    
    updateUI(active);
  });

  function updateUI(active) {
    if (active) {
      toggleLabel.textContent = 'On';
      statusText.textContent = 'Active';
      statusDot.classList.remove('inactive');
      statusDot.classList.add('active');
    } else {
      toggleLabel.textContent = 'Off';
      statusText.textContent = 'Inactive';
      statusDot.classList.remove('active');
      statusDot.classList.add('inactive');
    }
  }
});

