// Background service worker for Transaction Guard

chrome.runtime.onInstalled.addListener(() => {
  console.log('Transaction Guard installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    chrome.storage.local.set({
      pagesScanned: request.pagesScanned,
      transactionsFound: request.transactionsFound
    });
  }
  
  if (request.action === 'transactionDetected') {
    // Could send notifications here in the future
    console.log('Transaction detected:', request.data);
  }
});

