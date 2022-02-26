let color = '#3aa757';

var currentWebsite = "";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  //console.log('Default background color set to %cgreen', `color: ${color}`);
  console.log("Plugin up and running");
});

// opens a communication port
/* chrome.runtime.onConnect.addListener(function(port) {

    // listen for every message passing throw it
    port.onMessage.addListener(function(o) {

        // if the message comes from the popup
        if (o.from && o.from === 'popup') {
            if(o.message == "URLrequest"){
                url = getCurrentPage();
                sendResponse({urlpage: url});
            }

            console.log("Received message");
            console.log(o.message);
            
            // inserts a script into your tab content
            //chrome.tabs.executeScript(null, {

                // the script will click the button into the tab content
                //code: "document.getElementById('pageBtn').click();"
                
            //});
        }
    });
}); */

/* chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete') {
  
        currentWebsite = getCurrentPage();
  
    }
  }); */

var message = "testmessage";
chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      if (request.greeting === "hello"){
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            sendResponse({farewell: message});
        });
      }
    }
  );

async function getCurrentPage(){
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        currentWebsite = getCurrentPage();
        return tabs[0].url;
    });
}