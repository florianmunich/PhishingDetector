let color = '#3aa757';

var currentWebsite = "";
var VTTApiKey = '';

chrome.runtime.onInstalled.addListener(() => {
  //chrome.storage.local.set({ color });
  //console.log('Default background color set to %cgreen', `color: ${color}`);
  var d = Date.now();
  d = new Date(d);
  d = (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear()+' '+(d.getHours() > 12 ? d.getHours() - 12 : d.getHours())+':'+d.getMinutes()+' '+(d.getHours() >= 12 ? "PM" : "AM");

  console.log(d, "Plugin up and running");
});


//set default settings
chrome.storage.local.set({'PDactivationStatus': true}, function() {});
chrome.storage.local.set({'PDsetBGColor': false}, function() {});
chrome.storage.local.set({'PDShareData': true}, function() {});
chrome.storage.local.set({'PDlanguage': "german"}, function() {});
chrome.storage.local.set({'PDcurrentSiteInfos': ["PD_Default", "safe", "whitelist"]}, function() {});
chrome.storage.local.get('PDStats', function(items){
  if(items['PDStats'] == undefined){
    var d = Date.now();
    d = new Date(d);
    d = (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear()+' '+(d.getHours() > 12 ? d.getHours() - 12 : d.getHours())+':'+d.getMinutes()+' '+(d.getHours() >= 12 ? "PM" : "AM");
    chrome.storage.local.set({'PDStats': [d, 'Plugin up and running']}, function() {});
  }
});
//For testing StatsArray immer nullen
/* var d = Date.now();
d = new Date(d);
d = (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear()+' '+(d.getHours() > 12 ? d.getHours() - 12 : d.getHours())+':'+d.getMinutes()+' '+(d.getHours() >= 12 ? "PM" : "AM");
chrome.storage.local.set({'PDStats': [d, 'Plugin up and running']}, function() {}); */

chrome.storage.local.get('PDopenPageInfos', function(items){
  if(items['PDopenPageInfos'] == undefined){
    chrome.storage.local.set({'PDopenPageInfos': []}, function() {});
  }
});
//Für testing known sites immer nullen
chrome.storage.local.set({'PDopenPageInfos': []}, function() {});

chrome.storage.local.get('PDLastInjections', function(items){
  if(items['PDLastInjections'] == undefined){
    chrome.storage.local.set({'PDLastInjections': [Date.now(), Date.now(), Date.now(), Date.now()]}, function() {});
  }
});

//Listen for messages and run ap VTT Check if requested
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    //console.log(request.VTTtoCheckURL);
    if(request.VTTtoCheckURL === "safeSite"){
      //console.log("safe BG");
      chrome.action.setIcon({path: "/images/colors/logo_green_16.png", tabId: sender.tab.id});
      writeStats('Popup icon set to green (safeSite)');
    }
    else if(request.VTTtoCheckURL === "unknownSite"){
      //console.log("unknown BG");
      chrome.action.setIcon({path: "/images/colors/logo_yellow_16.png", tabId: sender.tab.id});
      writeStats('Popup icon set to yellow (unknownSite)');
    }
    else if(request.VTTtoCheckURL === "warningSite"){
      //console.log("warning BG");
      chrome.action.setIcon({path: "/images/colors/logo_red_16.png", tabId: sender.tab.id});
      chrome.action.setBadgeText({text: '!!', tabId: sender.tab.id});
      chrome.action.setBadgeBackgroundColor({color: [255,0,0,255], tabId: sender.tab.id});
      writeStats('Popup icon set to red (warningSite)');
    }
    else if (request.VTTtoCheckURL === "VTTcheck"){
      console.log("VTT grabbing report initiated: " + sender.tab.url);
      url = sender.tab.url.split('/')[0] + '/' + sender.tab.url.split('/')[1] + '/' + sender.tab.url.split('/')[2];
      console.log(sender.tab.url);
      //url = "https://google.com";
      //console.log("VTT Scan started for: " + url + ";Base 64: " +btoa(url).replaceAll('=',''));
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
              writeStats('VTTError');
              console.log(err, 'VTT did not respond with valid data. Probably never scanned before or quota done!');
            });
    }
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
            writeStats('VTTError');
            console.log(err, 'VTT did not respond with valid data. Probably never scanned before or quota done!');
          });
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

function getCurrentPage(){
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        return tabs[0].url;
    });
}

async function writeStats(type) {
  //var statsArray = [];
  chrome.storage.local.get('PDStats', function(items){
    var statsArray = items['PDStats'];
    //console.log(statsArray);
    //await sleep(1);
    id = statsArray.length + 1;
    currentPage = getCurrentPage();
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      statsArray.push([Date.now(), id, type, 'none', 'none', tabs[0].url.toString().split('/')[2]]);
      if(statsArray.length < 2){
        console.log("Error writing stats!!!!!!!"); 
        console.log(id, type, tabs[0].url);
        return;
      }
      chrome.storage.local.set({'PDStats': statsArray}, function() {});
    });
    
    //await sleep(1);
    //console.log(statsArray);
    
  });

}