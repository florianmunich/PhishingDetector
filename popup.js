var language = "english"; //Default, can be overwritten by chrome storage
var safeSiteURL = 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/knownSites.json';
var phishingSites;
var safeSites;
var siteStatus;
var siteReason;
var currentSiteShort;

function createElementWithClass(type, className) {
  const element = document.createElement(type);
  element.className = className;
  return element;
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
 }

//Sets the new Seeting option to the chrome storage and updates all other settings accordingly
async function handleSettingClick(event) {
  if(event.path[0].className == "switchInput"){
    return;
  }
  let activeSwitch = event.target.parentElement.querySelector(
    `.${"switchInput"}`
  );
  let setting = event.target.parentElement.parentElement.id;
  var currentSettingStatus;
  await chrome.storage.sync.get(setting, function(items){
    currentSettingStatus = !items[setting];
  });

  await sleep(100);

  //see what to save
  if(setting == "PDactivationStatus") {
    //the below buttons will be set to the general option also
    await chrome.storage.sync.set({"PDactivationStatus": currentSettingStatus}, function() {});
    await chrome.storage.sync.set({"PDsetBGColor": currentSettingStatus}, function() {});
    BGButton = document.getElementById('PDsetBGColor');
    BGButton.lastChild.firstChild.checked = currentSettingStatus;
    await chrome.storage.sync.set({"PDblockEntries": currentSettingStatus}, function() {});
    BEButton = document.getElementById('PDblockEntries');
    BEButton.lastChild.firstChild.checked = currentSettingStatus;
    //disable or enable buttons (If general functionality is disabled, the other functions will be not clickable)
    BGButton.lastChild.firstChild.disabled = !currentSettingStatus;
    BEButton.lastChild.firstChild.disabled = !currentSettingStatus;
    //Color the options in grey if they are disabled
    BGButton.firstChild.firstChild.classList.toggle('notApplicable');
    BEButton.firstChild.firstChild.classList.toggle('notApplicable');
  }
  else{
    let general_function;
    await chrome.storage.sync.get("PDactivationStatus", function(items){
      general_function = items["PDactivationStatus"];
    });
    if(general_function){
      if(setting == "PDsetBGColor") {
        await chrome.storage.sync.set({"PDsetBGColor": currentSettingStatus}, function() {});
      }
      else if(setting == "PDblockEntries") {
        await chrome.storage.sync.set({"PDblockEntries": currentSettingStatus}, function() {});
      }
    }
  }
  await sleep(10);
  chrome.storage.sync.get(setting, function(items){
    console.log("Option set to: " + items[setting]);
  });
}

async function init(){
  //await analyzePage();
  await chrome.storage.sync.get('PDlanguage', function(items){
    language = items['PDlanguage'];
  });

  await sleep(1);

  //General Container
  var container = createElementWithClass('div', 'popupContainer');

  //Upper Part with Logo, name etc
  var identifier = container.appendChild(createElementWithClass('div', 'identifier'));
  var logo = identifier.appendChild(createElementWithClass('div', 'logo'));
  var newItemIMG = logo.appendChild(createElementWithClass('img', 'logoSVG'));
  newItemIMG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon.svg');
  var nameExtension = identifier.appendChild(createElementWithClass('div', 'name'));
  nameExtension.innerHTML = 'Phishing Detector';
  iconsRight = identifier.appendChild(createElementWithClass('div', 'iconsRight'));
  var infoImg = iconsRight.appendChild(createElementWithClass('img', 'logoIMG'));
  infoImg.setAttribute('src', 'https://img.icons8.com/ios-glyphs/30/000000/info--v1.png');
  container.appendChild(createElementWithClass('div', 'separatorLine'));

  //Page Info Part
  pageInfos = container.appendChild(createElementWithClass('div', 'pageInfos'));
  var currentPageText = pageInfos.appendChild(createElementWithClass('div', 'currentPageText'));
  var currentPageColored = pageInfos.appendChild(createElementWithClass('div', 'currentPageColored'));
  var currentPageIMG = currentPageColored.appendChild(createElementWithClass('img', 'currentPageIMG'));
  currentPageIMG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon.svg');
  var currentPageShortIndication = currentPageColored.appendChild(createElementWithClass('div', 'currentPageShortIndication'));
  var currentPageJustification = pageInfos.appendChild(createElementWithClass('div', 'currentPageJustification'));
  currentPageText.innerHTML = texts.texts.currentPage.currentPageText[language];
  await chrome.runtime.sendMessage({VTTtoCheckURL: "getCurrentTabURL"}, function(response) {
    //console.log(response);
    currentSiteShort = response.currentURL;
    chrome.storage.sync.get('PDopenPageInfos', function(items){
      knownSites = items['PDopenPageInfos'];
      console.log(knownSites);
      for (site of knownSites){
        if(site[0] == currentSiteShort){
          console.log(pageInfos, currentSite = currentSiteShort, warningType = site[1], warningReason = site[2]);
          setIdentifierText(pageInfos, currentSite = currentSiteShort, warningType = site[1], warningReason = site[2]);
          //set globals
          //currentSiteShort = site[0];
          siteStatus = site[1];
          siteReason = site [2];
          break;
        }
      }
    });
  });
/*   chrome.storage.sync.get('PDcurrentSiteInfos', function(items){
    values = items['PDcurrentSiteInfos'];
    console.log(values);
    setIdentifierText(pageInfos, currentSite = values[0], warningType = values[1], warningReason = values[2]);

    //set globals
    currentSiteShort = values[0];
    siteStatus = values[1];
    siteReason = values [2];
  }); */

  container.appendChild(createElementWithClass('div', 'separatorLine'));

  //settings Switches
  async function addSetting(optionID, name, explanation){
    var container = createElementWithClass('div', "settingBox");
    container.setAttribute('id', optionID);
    var textsSetting = container.appendChild(createElementWithClass('span', 'settingInfos'));
    var title = textsSetting.appendChild(createElementWithClass('div', 'settingTitle'));
    title.innerHTML = name;
    var explanationHTML = textsSetting.appendChild(createElementWithClass('div', 'settingExplanation'));
    explanationHTML.innerHTML = explanation;
    var switchBox = container.appendChild(createElementWithClass('label', 'switch'));
    switchBoxInput = switchBox.appendChild(createElementWithClass('input', 'switchInput'));
    switchBoxInput.setAttribute('type', 'checkbox');
    switchBoxInput.checked = true;

    switchBox.appendChild(createElementWithClass('span', 'slider round'));

    switchBox.addEventListener("click", handleSettingClick);
    return container;
  }

  //Add options
  settingsBox = container.appendChild(createElementWithClass('div', 'settings'));

  settingA = settingsBox.appendChild(await addSetting('PDactivationStatus', texts.texts.settings.active.title[language], texts.texts.settings.active.explanation[language]));
  settingB = settingsBox.appendChild(await addSetting('PDsetBGColor', texts.texts.settings.backgroundIndication.title[language], texts.texts.settings.backgroundIndication.explanation[language]));
  settingC = settingsBox.appendChild(await addSetting('PDblockEntries', texts.texts.settings.blockInputs.title[language], texts.texts.settings.blockInputs.explanation[language]));
  
  async function setProperty(setting){
    var enabled;
    await chrome.storage.sync.get(setting.id, function(items){
      enabled = items[setting.id];
      if(!enabled){
        setting.lastChild.firstChild.checked = false;

        //if general functionality is disabled, block other inputs
        if(setting.id == "PDactivationStatus"){
          settingB.firstChild.firstChild.classList.toggle('notApplicable');
          settingB.lastChild.firstChild.disabled = true;
          settingC.firstChild.firstChild.classList.toggle('notApplicable');
          settingC.lastChild.firstChild.disabled = true;
        }
      }
    });
    
  }
  setProperty(settingA);
  setProperty(settingB);
  setProperty(settingC);
  
  //Language
  function addLanguageDropdown(){
    var container = createElementWithClass('div', "languageSelectionBox");
    container.setAttribute('id', 'languageSelection');
    var textsSetting = container.appendChild(createElementWithClass('span', 'settingInfos'));
    var title = textsSetting.appendChild(createElementWithClass('div', 'settingTitle'));
    title.innerHTML = texts.texts.settings.language[language];
    var switchBox = container.appendChild(createElementWithClass('select', 'languageSelection'));

    for (var i in texts.languages) {
        languageI = switchBox.appendChild(document.createElement('option'));
        languageI.setAttribute('value', i);
        languageI.innerHTML = texts.languages[i];
    }

    for (var i, j= 0; i = switchBox.options[j]; j++) {
      if(i.value == language){
        switchBox.selectedIndex = j;
        break;
      }
    }

    switchBox.addEventListener("change", function(event) {
      chrome.storage.sync.set({'PDlanguage': this.value}, function() {});
      document.location.reload();
    });

    return container;
  }
  settingsBox.appendChild(addLanguageDropdown());

  container.appendChild(createElementWithClass('div', 'separatorLine'));

  //Info Part
  var infoBox = container.appendChild(createElementWithClass('div', 'infos'));
  var infoHeadline = infoBox.appendChild(createElementWithClass('div', 'infoHeadline'));
  infoHeadline.innerHTML = texts.texts.infoBox.headline[language];
  var infoText = infoBox.appendChild(createElementWithClass('div', 'infoText'));
  infoText.innerHTML = texts.texts.infoBox.infoText[language];

  //Download Stats
  var downloadStatsButton = container.appendChild(createElementWithClass('button', 'downloadStatsButton'));
  downloadStatsButton.innerHTML = "Download Statistics";
  downloadStatsButton.addEventListener('click', downloadStats());

  //Add container to page
  document.body.appendChild(container);

  writeStats("popup");
}

function setIdentifierText(htmlObject, currentSite, warningType, warningReason){
  //console.log(htmlObject, currentSite, warningType, warningReason);
  htmlObject.classList.add(warningType);
  document.body.classList.add(warningType);
  //console.log(warningType, warningReason);
  htmlObject.childNodes[2].innerHTML = currentSite + texts.texts.currentPage.justification[warningType][warningReason][language];
  htmlObject.childNodes[1].childNodes[1].innerHTML = texts.texts.currentPage.shortIndication[warningType][language];
  var logoSVG = document.getElementsByClassName('currentPageIMG')[0];
  switch (warningType) {
    case 'warning': logoSVG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_red.svg'); break;
    case 'unknown': logoSVG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_yellow.svg'); break;
    case 'safe': logoSVG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_green.svg'); break;
  }

  //Not needed anymore, handled in the upper part
/*   if(warningReason == "warning") {
    document.body.classList.add('warning');//add "Warning" to the body element
    htmlObject.classList.add('warning');
    htmlObject.childNodes[2].innerHTML = currentSite + texts.texts.currentPage.justification.warning.blacklist[language];
    htmlObject.childNodes[1].childNodes[1].innerHTML = texts.texts.currentPage.shortIndication.warning[language];
    var logoSVG = document.getElementsByClassName('currentPageIMG')[0];
    logoSVG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_red.svg');
  }
  if(warningReason == "whitelist") {
    htmlObject.classList.add('safe');
    htmlObject.childNodes[2].innerHTML = currentSite + texts.texts.currentPage.justification.safe.whitelist[language];
    htmlObject.childNodes[1].childNodes[1].innerHTML = texts.texts.currentPage.shortIndication.safe[language];
    var logoSVG = document.getElementsByClassName('currentPageIMG')[0];
    logoSVG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_green.svg');
  }
  if(warningType == "unknown") {
    document.body.classList.add('unknown');//add "Warning" to the body element
    htmlObject.classList.add('unknown');
    htmlObject.childNodes[2].innerHTML = currentSite + texts.texts.currentPage.justification.unknown[language];
    htmlObject.childNodes[1].childNodes[1].innerHTML = texts.texts.currentPage.shortIndication.unknown[language];
    var logoSVG = document.getElementsByClassName('currentPageIMG')[0];
    logoSVG.setAttribute('src', 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_yellow.svg');
  } */
}

//Does not work, as current page is popup window
async function analyzePage() {
  var allKnownSites;

  //Lädt die Liste der bekannten Seiten herunter
  async function getknownSites() {
    await fetch(safeSiteURL)
    .then(res => res.json())
    .then((out) => {allKnownSites = out;
    });
  }

  //ruft Liste der bekannten Seiten ab und liest Phishing/Safe Seiten in Arrays aus
  async function declareSites(){
    await getknownSites();
    phishingSites = allKnownSites.phishingSites;
    safeSites = allKnownSites.safeSites;
  }

  //Checkt ob eine gegebene Seite in der Blacklist auftaucht
  async function siteInSuspected(site){
    for(let phishingSiteIndex in phishingSites){
        phishingSite = phishingSites[phishingSiteIndex].url;
        if (site.includes(phishingSite)){
            console.log("Site\n" + site + "\n was suspected.");
            return true;
        }
    }
    return false;
  }

  //Checkt ob eine gegebene Seite in der Whitelist auftaucht
  async function siteInSafe(site){
    for(let safeSiteIndex in safeSites){
        safeSite = "https://" + safeSites[safeSiteIndex].url;
        if(site.includes(safeSite)){
            console.log("Site\n" + site + "\n was considered safe.");
            return true;
        }
    }
    return false;
  }

  var currentSite = window.location.toString();
  var currentSiteShort = window.location.toString().split('/')[2];

  await declareSites();

  //check site and write current information in Chrome storage
  var phishingSite = await siteInSuspected(currentSite);
  var safeSite = await siteInSafe(currentSite);

  console.log("analyzze: " + currentSite + phishingSite + safeSite);

  if(safeSite){
    chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "safe", "whitelist"]}, function() {});
  }
  if(phishingSite){
      chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "warning", "blacklist"]}, function() {});

      //Set Background color to red if enabled
      chrome.storage.sync.get("PDsetBGColor", function(items){
          enabled = items['PDsetBGColor'];
          if(enabled)
              document.body.style.backgroundColor = 'red';
              //TODO: Wieder neutral setzen danach!!!
      });
  }
  if(!phishingSite && !safeSite){
      console.log("VTT Necessary!");
      //getVirusTotalInfo("https://sebhastian.com/javascript-create-button/");
      chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "unknown", "noScan"]}, function() {});
  }
}

async function downloadStats() {
  filename = "PDStats";
  statsArray = []
  await chrome.storage.sync.get('PDStats', function(items){
    statsArray = items['PDStats'];
  });
  await sleep(100);
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(statsArray));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  //element.click();

  document.body.removeChild(element);
}

async function writeStats(type) {
  var statsArray = [];
  await chrome.storage.sync.get('PDStats', function(items){
      statsArray = items['PDStats'];
  });
  //console.log(statsArray);
  await sleep(1);
  id = statsArray.length + 1;
  statsArray.push([Date.now(), id, type, siteStatus, siteReason, currentSiteShort]);
  await sleep(1);
  //console.log(statsArray);
  chrome.storage.sync.set({'PDStats': statsArray}, function() {});
}

//Beinhaltet alle Texte der Extension auf Englisch und Deutsch
texts = {
  "version": "1.0",
  "languages": {
      "english": "English",
      "german": "Deutsch"
  },
  "texts": {
    "currentPage": {
      "currentPageText": {
        "english": "CURRENT PAGE",
        "german": "AKTUELLE SEITE"
      },
      "shortIndication": {
        "warning": {
          "english": "Fradulent Site",
          "german": "Sch&auml;dliche Seite"
        },
        "safe": {
          "english": "Safe Site",
          "german": "Sichere Seite"
        },
        "unknown": {
          "english": "Unknown Site",
          "german": "Unbekannte Seite"
        }
      },
      "justification": {
        "warning": {
          "blacklist": {
            "english": " we found in our database of known fradulent sites. Do NOT enter any data here, the operator of the site is a fraudster.",
            "german": " haben wir in unserer Datenbank sch&auml;dlicher Webseiten gefunden. Geben Sie hier KEINE Daten ein, da der Betreiber der Seite ein Betr&uuml;ger ist."
          },
          "VTTScan": {
            "english": " was found unsafe by running a virus scan!",
            "german" : " wurde nach Durchf&uuml;hren von Virenscans als unsicher befunden!"
        }
        },
        "safe": {
          "whitelist": {
            "english": " we found in our database of safe sites. You can enter your data here without concerns.",
            "german": " haben wir in unserer Datenbank sicherer Webseiten gefunden. Sie k&ouml;nnen Ihre Daten hier ohne Bedenken eingeben."
          },
          "VTTScan": {
            "english": " was found safe by running a virus scan!",
            "german" : " wurde nach Durchf&uuml;hren von Virenscans als sicher befunden!"
          }
        },
        "unknown": {
          "noList": {
            "english": " we could not find in our databases. Be careful when entering data here.",
            "german": " haben wir nicht in unserer Datenbank gefunden. Seien Sie vorsichtig, wenn Sie hier Daten eingeben."
          },
          "noScan": {
            "english": " is neither in our database nor a virus scan was performed so far. Be careful when entering data here.",
            "german" : " haben wir nicht in unserer Datenbank gefunden, und bisher wurde auch kein Virenscan durchgef&uuml;hrt. Seien Sie vorsichtig, wenn Sie hier Daten eingeben."
          }
        }
      }
    },
    "settings": {
      "active": {
        "title": {
          "english": "Activate Phishing-Protection",
          "german": "Phishing-Schutz aktivieren"
        },
        "explanation": {
          "english": "Activate general functions of the plugin",
          "german": "Allgemeine Funktion des Plugins aktivieren"
        }
      },
      "backgroundIndication": {
        "title": {
          "english": "Color background",
          "german": "Hintergrund einf&auml;rben"
        },
        "explanation": {
          "english": "For detected malicious websites: color background red",
          "german": "Bei erkannten sch&auml;dlichen Webseiten: Hintergrund rot einf&auml;rben"
        }
      },
      "blockInputs": {
        "title": {
          "english": "Block inputs",
          "german": "Eingaben sperren"
        },
        "explanation": {
          "english": "For recognized malicious websites, allow input only after explicit confirmation",
          "german": "Bei erkannten sch&auml;dlichen Webseiten Eingaben nur nach expliziter Best&auml;tigung erlauben"
        }
      },
      "language":{
        "english": "Language",
        "german": "Sprache"
      }
    },
    "infoBox": {
      "headline": {
        "english": "How does it work?",
        "german": "Wie funktioniert es?"
      },
      "infoText": {
        "english": "English: Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.",
        "german": "Deutsch: Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua."
      }
    }
  }
};

init();