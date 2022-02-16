let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  //console.log('Default background color set to %cgreen', `color: ${color}`);
  console.log("Plugin up and running");
});

// opens a communication port
chrome.runtime.onConnect.addListener(function(port) {

    // listen for every message passing throw it
    port.onMessage.addListener(function(o) {

        // if the message comes from the popup
        if (o.from && o.from === 'popup') {

            console.log("Received message");
            // inserts a script into your tab content
            //chrome.tabs.executeScript(null, {

                // the script will click the button into the tab content
                //code: "document.getElementById('pageBtn').click();"
                
            //});
        }
    });
});