var currentWebsite = '';
var VTTApiKey = '';//VirusTotal Apikey, will only be in the final Plugin
const installationTime = Date.now();
var PDID = Math.floor(Math.random() * Math.floor(Math.random() * Date.now()));//Generate unique IDs for each participant
var statsArray = [];

chrome.runtime.onInstalled.addListener(() => {
  var d = new Date(installationTime);
  d = d.toISOString();
  console.log(d, "Plugin up and running");
});

//set default settings
chrome.storage.local.get('PDProlificID', function(items){
  if(items['PDProlificID'] == undefined){
    chrome.storage.local.set({'PDProlificID': ""}, function() {});
  }
});
chrome.storage.local.get('PDIDNumberOfClient', function(items){
  if(items['PDIDNumberOfClient'] == undefined){
    chrome.storage.local.set({'PDIDNumberOfClient': PDID}, function() {});
  }
  else{PDID = items['PDIDNumberOfClient'];}
});
chrome.storage.local.set({'PDactivationStatus': true}, function() {});
chrome.storage.local.set({'PDsetBGColor': false}, function() {});
chrome.storage.local.set({'PDShareData': true}, function() {});
chrome.storage.local.set({'PDlanguage': "english"}, function() {});
chrome.storage.local.get('PDopenPageInfos', function(items){
  if(items['PDopenPageInfos'] == undefined){
    chrome.storage.local.set({'PDopenPageInfos': []}, function() {});
  }
});
//For debugging, set OpenPageInfos to []
//chrome.storage.local.set({'PDopenPageInfos': []}, function() {});
chrome.storage.local.get('PDStats', function(items){
  if(items['PDStats'] == undefined){
    chrome.storage.local.set({'PDStats': []}, function() {});
  }
  else{
    statsArray = items['PDStats'];
  }
});
//For debugging set PDStats to []
//chrome.storage.local.set({'PDStats': []}, function() {});
chrome.storage.local.get('PDLastInjections', function(items){
  if(items['PDLastInjections'] == undefined){
    //[Plugin initialized, lastSafe, lastUnknown, lastWarning, lastUpload]
    chrome.storage.local.set({'PDLastInjections': [installationTime, installationTime, installationTime, installationTime, installationTime]}, function() {});
  }
});

//Listen for messages and run requested commands
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    //a safe site was detected, the Plugin's Icon in the toolbar should be set to green
    if(request.VTTtoCheckURL === "safeSite"){
      //console.log("safe BG");
      chrome.action.setIcon({path: "/images/colors/logo_green_16.png", tabId: sender.tab.id});
      writeStats('Popup icon set to green (safeSite)', sender.tab.id, sender.tab.url);
    }

    //a unknown site was detected, the Plugin's Icon in the toolbar should be set to yellow
    else if(request.VTTtoCheckURL === "unknownSite"){
      //console.log("unknown BG");
      chrome.action.setIcon({path: "/images/colors/logo_yellow_16.png", tabId: sender.tab.id});
      writeStats('Popup icon set to yellow (unknownSite)', sender.tab.id, sender.tab.url);
    }

    //a warning site was detected, the Plugin's Icon in the toolbar should be set to red and the badge will be appended by exclamation marks
    else if(request.VTTtoCheckURL === "warningSite"){
      //console.log("warning BG");
      chrome.action.setIcon({path: "/images/colors/logo_red_16.png", tabId: sender.tab.id});
      chrome.action.setBadgeText({text: '!!', tabId: sender.tab.id});
      chrome.action.setBadgeBackgroundColor({color: [255,0,0,255], tabId: sender.tab.id});
      writeStats('Popup icon set to red (warningSite)', sender.tab.id), sender.tab.url;
    }

    //A Virustotal result should be grabbed
    else if (request.VTTtoCheckURL === "VTTcheck"){
      console.log("VTT grabbing report initiated: " + sender.tab.url);
      url = sender.tab.url.split('/')[0] + '/' + sender.tab.url.split('/')[1] + '/' + sender.tab.url.split('/')[2];
      fetchURL = 'https://www.virustotal.com/api/v3/urls/' + btoa(url).replaceAll('=','');

      const options = {
          method: 'GET',
          headers: {
          Accept: 'application/json',
          'x-apikey': VTTApiKey
          }
      };

      fetch(fetchURL, options)
          .then(response => response.json())
          .then(response => sendResponse({VTTresult: response}))
          .catch(err => {
            writeStats('VTTError', sender.tab.id, sender.tab.url);
            console.log(err, 'VTT did not respond with valid data. Probably never scanned before or quota done!');
      });
    }

    //A Virustotal scan should be performed
    else if(request.VTTtoCheckURL === "VTTrequestScan"){
      urlToCheck = sender.tab.url.split('/')[0] + '/' + sender.tab.url.split('/')[1] + '/' + sender.tab.url.split('/')[2];
      console.log("VTT scan requested: " + urlToCheck);
      fetchURL = 'https://www.virustotal.com/api/v3/urls';

      const options = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'x-apikey': VTTApiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({url: urlToCheck})
      };

      fetch(fetchURL, options)
          .then(response => response.json())
          .then(response => sendResponse({VTTresult: response}))
          .catch(err => {
            writeStats('VTTError', sender.tab.id, sender.tab.url);
            console.log(err, 'VTT did not respond with valid data. Probably never scanned before or quota done!');
      });
    }

    //A script who can't access the current tab's URL needs it
    else if(request.VTTtoCheckURL === "getCurrentTabURL"){
      //console.log("URL request bekommen");
      chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
        console.log(tabs);
        let url = tabs[0].url;
        urlShort = url.split('/')[2];
        sendResponse({currentURL: urlShort});
      });
    }

    //A script who can't access the current tab's ID needs it
    else if(request.VTTtoCheckURL === "getCurrentTabID"){
      sendResponse({currentID: sender.tab.id})
    }

    //write Stats
    else if(request.VTTtoCheckURL === "writeStats"){
      id=9999;
      try{
        id = sender.tab.id;
      }
      catch(err) {id = 9999;}
      statsArray.push([request.statsToWrite[0], statsArray.length, request.statsToWrite[1], request.statsToWrite[2], request.statsToWrite[3], id, request.statsToWrite[4]]);
      chrome.storage.local.set({'PDStats': statsArray}, function() {});
    }

    //Upload Stats
    else if(request.VTTtoCheckURL === "uploadStats"){
      filename = request.filename;
      fileToUpload = request.fileToUpload;
      
      fetch('https://study2.usec.code.unibw-muenchen.de/uploadFile', {
      //fetch('http://localhost:8000/uploadFile', {
        method: 'POST',
        headers: {filename: filename},
        body: fileToUpload
      })
      .then(response => console.log(response))
      .catch(err => console.log(err));
    }

    return true;
  }
);

//writes Study data into the log file if enabled
async function writeStats(type, tabID, tabURL) {
  chrome.storage.local.get('PDShareData', function(items) {
    if(items['PDShareData'] == false){return;}
    else{
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        statsArray.push([Date.now(), statsArray.length, type, 'none', 'none',tabID, tabURL.split('/')[2]]);
        chrome.storage.local.set({'PDStats': statsArray}, function() {});
      });
    }
  });
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
  writeStats("tabChange", activeInfo.tabId, "//notKnown");
});
