let color = '#3aa757';

var currentWebsite = "";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  //console.log('Default background color set to %cgreen', `color: ${color}`);
  console.log("Plugin up and running");
});


//set default settings
chrome.storage.sync.set({'PDactivationStatus': true}, function() {});
chrome.storage.sync.set({'PDsetBGColor': true}, function() {});
chrome.storage.sync.set({'PDblockEntries': true}, function() {});
chrome.storage.sync.set({'PDlanguage': "german"}, function() {});
chrome.storage.sync.set({'PDcurrentSiteInfos': ["PD_Default", "safe", "whitelist"]}, function() {});
chrome.storage.sync.set({'PDStats': []}, function() {});
chrome.storage.sync.set({'PDopenPageInfos': []}, function() {});

//Listen for messages and run ap VTT Check if requested
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request.VTTtoCheckURL);
    if(request.VTTtoCheckURL === "safeSite"){
      chrome.action.setIcon({path: "/images/colors/logo_green_16.png", tabId: sender.tab.id});
    }
    else if(request.VTTtoCheckURL === "unknownSite"){
      chrome.action.setIcon({path: "/images/colors/logo_yellow_16.png", tabId: sender.tab.id});
    }
    else if(request.VTTtoCheckURL === "warningSite"){
      chrome.action.setIcon({path: "/images/colors/logo_red_16.png", tabId: sender.tab.id});
      chrome.action.setBadgeText({text: '!!', tabId: sender.tab.id});
      chrome.action.setBadgeBackgroundColor({color: [255,0,0,255], tabId: sender.tab.id});
    }
    else if (request.VTTtoCheckURL === "NOUSE VTTcheck"){
      console.log("VTT initiated: " + sender.tab.url);
      url = sender.tab.url.split('/')[0] + '/' + sender.tab.url.split('/')[1] + '/' + sender.tab.url.split('/')[2]
      //url = "https://google.com";
      console.log(url);
        fetchURL = 'https://www.virustotal.com/api/v3/urls/' + btoa(url);

        const options = {
            method: 'GET',
            headers: {
            Accept: 'application/json',
            'x-apikey': ''
            }
        };

        var result;
        fetch(fetchURL, options)
            .then(response => response.json())
            .then(response => sendResponse({VTTresult: response.data.attributes.last_analysis_stats}))
            .catch(err => console.log(err, 'VTT did not respond with valid data. Probably never scanned before or quota done!'));
    }
    else if(request.VTTtoCheckURL === "getCurrentTabURL"){
      //console.log("URL request bekommen");
      chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
        let url = tabs[0].url;
        urlShort = url.split('/')[2];
        sendResponse({currentURL: urlShort});
    });
      
    }
    //sendResponse({VTTresult: "some test return"})
    return true;
  }
);

//get Tab ID
/* chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log(activeInfo.tabId);
}); */

async function getCurrentPage(){
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        return tabs[0].url;
    });
}