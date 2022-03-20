let color = '#3aa757';

var currentWebsite = "";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  //console.log('Default background color set to %cgreen', `color: ${color}`);
  console.log("Plugin up and running");
});


//set default settings
chrome.storage.sync.set({'PDactivationStatus': true}, function() {});
chrome.storage.sync.set({'PDsetBGColor': false}, function() {});
chrome.storage.sync.set({'PDblockEntries': true}, function() {});
chrome.storage.sync.set({'PDlanguage': "german"}, function() {});
chrome.storage.sync.set({'PDcurrentSiteInfos': ["PD_Default", "safe", "whitelist"]}, function() {});

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