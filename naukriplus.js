// Listen for messages from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateApplyCount") {
    updateApplyCountInPage(message.value);
  }
});

// Function to update the apply count in the page
function updateApplyCountInPage(applyCount) {
  // Get all elements with the class styles_jhc__stat__PgY67
  const statElements = document.querySelectorAll('.styles_jhc__stat__PgY67');
  
  // Find the one that contains "100+" or similar text (the applications stat)
  statElements.forEach(element => {
    const spanChild = element.querySelector('span:last-child');
    if (spanChild && (spanChild.textContent.includes('+'))) {
      spanChild.textContent = applyCount;
      console.log("Updated apply count to:", applyCount);
    }
  });
}

// Extract job ID from URL
function getJobIdFromUrl() {
  const match = window.location.pathname.match(/(\d{12,})/);
  return match ? match[1] : null;
}

// Fetch apply count directly
function fetchApplyCount() {
  const jobId = getJobIdFromUrl();
  if (!jobId) {
    console.log("No job ID found in URL");
    return;
  }
  
  // Intercept fetch requests to capture headers
  const originalFetch = window.fetch;
  let capturedHeaders = null;
  
  // Wrap fetch to capture Naukri API headers
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('naukri.com/jobapi')) {
      const options = args[1] || {};
      if (options.headers) {
        capturedHeaders = options.headers;
        console.log("Captured headers from Naukri request:", capturedHeaders);
      }
    }
    return originalFetch.apply(this, args);
  };
  
  // Wait for the page to make its API call first
  setTimeout(() => {
    const apiUrl = `https://www.naukri.com/jobapi/v4/job/${jobId}?microsite=y&brandedConsultantJd=true`;
    
    console.log("Fetching apply count for job ID:", jobId);
    
    const headers = capturedHeaders || {
      'appid': '109',
      'systemid': 'Naukri'
    };
    
    fetch(apiUrl, { headers })
      .then(response => response.json())
      .then(data => {
        // console.log("Full API response:", data);
        
        // Try different possible paths to applyCount
        let applyCount;
        if (data.jobDetails && data.jobDetails.applyCount !== undefined) {
          applyCount = data.jobDetails.applyCount;
        } else if (data.applyCount !== undefined) {
          applyCount = data.applyCount;
        } else if (data.job && data.job.applyCount !== undefined) {
          applyCount = data.job.applyCount;
        } else {
          console.error("Could not find applyCount in response:", data);
          return;
        }
        
        // console.log("Apply count from API:", applyCount);
        updateApplyCountInPage(applyCount);
      })
      .catch(err => console.error("Error fetching apply count:", err));
  }, 2000); // Wait 2 seconds for page to load and make its own API call
}

// Run on page load
if (window.location.pathname.includes('job-listings')) {
  // Wait a bit for the page to fully load
const statElements = document.querySelectorAll('.styles_jhc__stat__PgY67');
  // Find the one that contains "100+" or similar text (the applications stat)
  setTimeout(fetchApplyCount, 1000);
}