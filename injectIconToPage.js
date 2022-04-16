let url = 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/knownSites.json';
var allKnownSites;
var warningSites;
var safeSites;
var currentSite = window.location.toString();
var currentSiteShort = window.location.toString().split('/')[2];
var id;
var siteStatus;
var siteReason = "noData";
//check site and write current information in Chrome storage
var warningSite;
var safeSite;

var language = "english"; //Default, can be overwritten by chrome storage

//Wartet eine gegebene Zeit in Millisekunden
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function createElementWithClass(type, className) {
    const element = document.createElement(type);
    element.className = className;
    return element;
  }

async function main(){
    console.log("PD: Site Scan initiated!");
    await chrome.storage.sync.get('PDlanguage', function(items){
        language = items['PDlanguage'];
    });
    await sleep(1);

    await declareSites();

    //check site and write current information in Chrome storage
/*     dbCheckNeeded = true;
    await chrome.storage.sync.get("PDopenPageInfos", function(items){
        infoArray = items['PDopenPageInfos'];
        for (site of infoArray){
            if(site[0] == currentSiteShort){
                console.log(site);
                if(site[1] == 'safe'){
                    warningSite = false;
                    safeSite = true;
                    console.log(warningSite, safeSite);
                }
                if(site[1] == 'warning'){
                    warningSite = true;
                    safeSite = false;
                }
                break;
            }
        }
    }); */
    warningSite = await siteInSuspected(currentSite);
    safeSite = await siteInSafe(currentSite);
/*     console.log(warningSite, safeSite); */

    function checkSafe(){
        if(safeSite){
            chrome.storage.sync.get("PDopenPageInfos", function(items){
                infoArray = items['PDopenPageInfos'];
                if(infoArray.length>100){infoArray.pop()}
                infoArray = [[currentSiteShort, "safe", siteReason]].concat(infoArray);
                chrome.storage.sync.set({'PDopenPageInfos': infoArray}, function() {});
            });
            //chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "safe", "whitelist"]}, function() {});
            siteStatus = "safe";
        }
    }
    function checkWarning() {
        if(warningSite){
            console.log("warning site!");
            chrome.storage.sync.get("PDopenPageInfos", function(items){
                infoArray = items['PDopenPageInfos'];
                if(infoArray.length>100){infoArray.pop()}
                infoArray = [[currentSiteShort, "warning", siteReason]].concat(infoArray);
                chrome.storage.sync.set({'PDopenPageInfos': infoArray}, function() {});
            });
            //chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "warning", "blacklist"]}, function() {});
    
            //Set Background color to red if enabled
            chrome.storage.sync.get("PDsetBGColor", function(items){
                enabled = items['PDsetBGColor'];
                console.log("color enabled: ", enabled);
                if(enabled){
                    console.log("BG set red");
                    document.body.style.backgroundColor = 'red';
                    //TODO: Wieder neutral setzen danach!!!
                }
            });
            siteStatus = "warning";
        }
    }
    checkSafe();
    checkWarning();

    //Schauen ob schon was erkannt wurde, und wenn nein: erst VTT ausfuehren
    if(!warningSite && !safeSite){
        chrome.storage.sync.get("PDopenPageInfos", function(items){
            infoArray = items['PDopenPageInfos'];
            if(infoArray.length>100){infoArray.pop()}
            infoArray = [[currentSiteShort, "unknown", "noScan"]].concat(infoArray);
            chrome.storage.sync.set({'PDopenPageInfos': infoArray}, function() {});
        });
        //chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "unknown", "noScan"]}, function() {});
        siteStatus = "unknown";
        siteReason = "noScan";
        //TODO: Await wartet nicht, da kein Promise da ist
        await getVirusTotalInfo("current page");
        await sleep(1000);
        checkSafe();
        checkWarning();
    }



    var pwElems = document.querySelectorAll('input[type=password]');
    if(!pwElems.length == 0){
        await inputPDIcon(pwElems);
        writeStats("icon");
    }
}

//Start routine if plugin is enabled
chrome.storage.sync.get("PDactivationStatus", function(items){
    enabled = items['PDactivationStatus'];
    if(enabled)
        main()
});

//Redo analysis if security information changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
    for(key in changes) {
      if(key === 'PDopenPageInfos') {
        //console.log("change in PD status detected!");
        PDIcons = document.getElementsByClassName('PDIcon');
        if(warningSite){
            chrome.runtime.sendMessage({VTTtoCheckURL: "warningSite"}, function(response) {});
            for (let PDIcon of PDIcons) {
                PDIcon.firstChild.classList.add('warningSecurityLogo');
                PDIcon.firstChild.classList.remove('safeSecurityLogo');
                PDIcon.firstChild.classList.remove('unknownSecurityLogo');
            }
        }
        else if(safeSite){
            chrome.runtime.sendMessage({VTTtoCheckURL: "safeSite"}, function(response) {});
            for (let PDIcon of PDIcons) {
                PDIcon.firstChild.classList.remove('warningSecurityLogo');
                PDIcon.firstChild.classList.add('safeSecurityLogo');
                PDIcon.firstChild.classList.remove('unknownSecurityLogo');
            }
        }
        else {
            chrome.runtime.sendMessage({VTTtoCheckURL: "unknownSite"}, function(response) {});
            for (let PDIcon of PDIcons) {
                PDIcon.firstChild.classList.remove('warningSecurityLogo');
                PDIcon.firstChild.classList.remove('safeSecurityLogo');
                PDIcon.firstChild.classList.add('unknownSecurityLogo');
            }
        }
      }
    }
  });

//Lädt die Liste der bekannten Seiten herunter
async function getknownSites() {
    await fetch(url)
    .then(res => res.json())
    .then((out) => {allKnownSites = out;
    });
}

//ruft Liste der bekannten Seiten ab und liest Phishing/Safe Seiten in Arrays aus
async function declareSites(){
    await getknownSites();
    warningSites = allKnownSites.warningSites;
    safeSites = allKnownSites.safeSites;
}

async function getVirusTotalInfo(url) {
    await chrome.runtime.sendMessage({VTTtoCheckURL: "VTTcheck"}, function(response) {
        console.log(response.VTTresult);
        virusScan = response.VTTresult;
        totalVotes = virusScan.harmless + virusScan.malicious + virusScan.suspicious;
        positiveVotes = virusScan.harmless;
        negativeVotes = virusScan.malicious + virusScan.suspicious;
/*          totalVotes = 100;
        negativeVotes = 20;
        positiveVotes = 10; */
        if(totalVotes > 50) {
            if(negativeVotes > 10){ //TODO: Sinnvollen Wert finden!
                console.log("virus scan: warning");
                chrome.storage.sync.get("PDopenPageInfos", function(items){
                    infoArray = items['PDopenPageInfos'];
                    if(infoArray.length>100){infoArray.pop()}
                    infoArray = [[currentSiteShort, "warning", "VTTScan"]].concat(infoArray);
                    chrome.storage.sync.set({'PDopenPageInfos': infoArray}, function() {});
                });
                warningSite = true;
                safeSite = false;
            }
            else {
                console.log("virus scan: safe");
                chrome.storage.sync.get("PDopenPageInfos", function(items){
                    infoArray = items['PDopenPageInfos'];
                    if(infoArray.length>100){infoArray.pop()}
                    infoArray = [[currentSiteShort, "safe", "VTTScan"]].concat(infoArray);
                    chrome.storage.sync.set({'PDopenPageInfos': infoArray}, function() {});
                });
                warningSite = false;
                safeSite = true;
            }
            siteReason = 'VTTScan';
        }
      });
    //return;
}

//Platziert das PD Icon neben allen übergebenen Feldern
async function inputPDIcon(pwElems) {
    for(let item of pwElems){
        item.placeholder = texts.texts.placeholderPassword[language];
        //create item svg
        //TODO: Altes Logo von Icons8 --> Erneuern
        var newIcon = document.createElement('span');
        newIcon.className = "PDIcon";
        var newItemSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var newItemPath = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
        );
        newItemSVG.setAttribute('fill', '#000000');
        newItemSVG.setAttribute('viewBox', '0 0 250 250');
        newItemSVG.setAttribute('class', 'appendedSecurityLogo');
        newItemPath.setAttribute(
            'd',
            'M213.97,25.79c-2.34-6.54-9.42-13.88-14.58-15.09C169.27,3.6,138.25,0,107.19,0S46.15,3.38,15.17,10.03C4.45,12.33,.13,17.79,.25,28.89c.11,10.45,0,21.06-.1,31.32-.19,18.62-.39,37.88,.74,56.65,.63,10.64,3.52,21.37,6.58,32.72,.93,3.46,1.88,6.99,2.79,10.59,.47-.22,.93-.45,1.37-.66,3.37-1.63,5.81-2.8,8.03-4.11,17.44-10.32,35.15-20.86,52.28-31.05,43.48-25.88,88.45-52.63,133.08-78.28,9.05-5.2,11.98-11.84,8.95-20.28ZM56.88,83.82l-21.31-27.13,20.84-28.48,20.84,28.16-20.37,27.45Z M213.41,74.99L28.54,184.48c17.62,22.36,49.66,44.33,72.64,49.29,1.51,.33,3.19,.5,4.99,.5,3.39,0,7.12-.61,10.5-1.7,35.73-11.57,63.57-33.07,80.5-62.17,15.92-27.36,21.49-60.22,16.24-95.41Zm-54.65,110.84l-21.27-27.26,20.55-28.09,21.09,27.43-20.37,27.92Z'
        );
        newIcon.appendChild(newItemSVG);
        newItemSVG.appendChild(newItemPath);

        //set safe status
        if(warningSite){newItemSVG.classList.add('warningSecurityLogo');}
        else if(safeSite){newItemSVG.classList.add('safeSecurityLogo');}
        else {newItemSVG.classList.add('unknownSecurityLogo');}

        item.parentNode.appendChild(newIcon);
        iconAppended = newItemSVG;

        var container;
        //var belonging;
        
        iconAppended.addEventListener("mouseenter", async function(event) {
            if(!(container == undefined)){return;}
            container = buildInfoContainer(iconAppended);
            console.log("hover");
            iconAppended.classList.add('iconHovered');
            container.classList.add('hoverContainerOnHover');
            if(warningSite){
                warning();
                //belonging = showBelonging(container, 'warning', '#FF6347');
            }
            else if(safeSite){
                safe();
                //belonging = showBelonging(container, 'safe', '#3cb371');
            }
            if(!safeSite && !warningSite){
                unknown();
                //belonging = showBelonging(container, 'unknown', '#fbba2e');
            }

            document.body.addEventListener("click", function(event) {
                if(container == undefined) {return;}
                iconAppended.classList.remove('iconHovered');
                container.remove();
                //belonging.remove();
                container = undefined;
            });
            writeStats("hover");
        });
    }
}

function showBelonging(container, warningType, color) {
    var belongingObject = createElementWithClass('canvas', 'belongingObject ' + warningType);
    belongingObject.width = document.body.clientWidth -1;
    belongingObject.height = window.innerHeight;
    //document.body.appendChild(belongingObject);

    var ctx = belongingObject.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(parseInt(container.style.left) + 300, parseInt(container.style.top) + 10);
    ctx.lineTo(window.innerWidth - 250, 0);
    ctx.lineTo(window.innerWidth - 250, 300);
    ctx.lineTo(parseInt(container.style.left) + 300, parseInt(container.style.top) + 50);
    ctx.fill();
    
    return belongingObject;
}

function buildInfoContainer(iconAppended){
    var container = document.createElement('div');
    container.setAttribute('class', 'hoverContainer');
    var hoverContainerBackground = document.createElement('div');
    hoverContainerBackground.setAttribute('class', 'hoverContainerBackground');
    container.appendChild(hoverContainerBackground);
    var siteInfoText = document.createElement('div');
    siteInfoText.setAttribute('class', 'siteInfoText');
    siteInfoText.innerHTML = texts.texts.hoverBox.pageUnknown[language];
    var boxLowerPart = document.createElement('div');
    boxLowerPart.setAttribute('class', 'boxLowerPart');
    var separatorLine = document.createElement('div');
    separatorLine.setAttribute('class', 'separatorLine');
    var justifyPhish = document.createElement('div');
    justifyPhish.setAttribute('class', 'justifyPhish');
    justifyPhish.innerHTML = '';
    var recommendation = document.createElement('div');
    recommendation.setAttribute('class', 'recommendation');
    recommendation.innerHTML = '';
    var readMore = document.createElement('div');
    readMore.setAttribute('class', 'readMore');
    var readMorePage = document.createElement('a');
    readMorePage.setAttribute('href', texts.texts.hoverBox.detectInfo.url[language]);
    readMorePage.innerHTML = texts.texts.hoverBox.detectInfo.text[language];
    readMore.appendChild(readMorePage);
    hoverContainerBackground.appendChild(siteInfoText);
    boxLowerPart.appendChild(justifyPhish);
    boxLowerPart.appendChild(recommendation);
    boxLowerPart.appendChild(separatorLine);
    boxLowerPart.appendChild(readMore);
    hoverContainerBackground.appendChild(boxLowerPart);

    var position = iconAppended.getBoundingClientRect();
    container.style.left = position.left + position.width + 'px';
    container.style.top = position.top + 10 + 'px';

    document.body.insertBefore(container, document.body.firstChild);
    return container;
}

//Schreibt die Texte je nach Fall aus der json in die HoverBox
function appendTexts(rating, reason){
    console.log(rating, reason);
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    var justifyPhish = document.getElementsByClassName('justifyPhish')[0];
    var recommendation = document.getElementsByClassName('recommendation')[0];
    siteInfoText.innerHTML = texts.texts.hoverBox.warningType[rating][language] + ": "
     + currentSiteShort + texts.texts.hoverBox.warningText[rating][language];
    justifyPhish.innerHTML = texts.texts.hoverBox.warningReason[rating][reason][language];
    recommendation.innerHTML = texts.texts.hoverBox.actionProposed[rating][language];
}

function appendLeaveButton(){
    container = document.getElementsByClassName('boxLowerPart')[0];
    container.removeChild(container.lastChild);
    leaveButton = createElementWithClass('button', 'leaveButton');
    leaveButton.setAttribute('onclick', 'window.location = "https://google.com"');
    leaveButton.setAttribute('onclick', 'writeStats("leavecklick")');
    leaveButton.innerHTML = texts.texts.hoverBox.leaveButton[language];
    container.appendChild(leaveButton);
}

//Erstellt alle Infos für den Fall einer Warnung
function warning(){
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextWarning');
    appendTexts("warning", siteReason);
    appendLeaveButton();


/*     var values = [currentSiteShort, "warning", reason];
    chrome.storage.sync.set({'PDcurrentSiteInfos': values}, function() {}); */
}

//Erstellt alle Infos für den Fall einer sicheren Seite
function safe(){
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextSafe');
    appendTexts("safe", siteReason);
}

//Erstellt alle Infos für den Fall einer unbekannten Seite
function unknown(){
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextUnknown');
    appendTexts("unknown", siteReason);
}

//Checkt ob eine gegebene Seite in der Blacklist auftaucht
async function siteInSuspected(site){
    for(let warningSiteIndex in warningSites){
        warningSite = warningSites[warningSiteIndex].url;
        if (site.includes(warningSite)){
            siteReason = "blacklist";
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
            siteReason = "whitelist";
            console.log("Site\n" + site + "\n was considered safe.");
            return true;
        }
    }
    return false;
}

async function writeStats(type) {
    var statsArray = [];
    await chrome.storage.sync.get('PDStats', function(items){
        statsArray = items['PDStats'];
    });
    await sleep(1);
    id = statsArray.length + 1;
    statsArray.push([Date.now(), id, type, siteStatus, siteReason, currentSiteShort]);
    await sleep(1);
    chrome.storage.sync.set({'PDStats': statsArray}, function() {});
}

//Beinhaltet alle Texte der Extension auf Englisch und Deutsch
var texts = {
    "version": "1.0",
    "languages": {
        "english": "English",
        "german": "Deutsch"
    },
    "texts": {
        "hoverBox": {
            "warningType": {
                "warning": {
                    "english": "Warning",
                    "german" : "Warnung"
                },
                "moderate": {
                    "english": "Caution",
                    "german" : "Vorsicht"
                },
                "safe": {
                    "english": "Safe site",
                    "german" : "Sicher"
                },
                "unknown": {
                    "english": "Caution",
                    "german" : "Vorsicht"
                }
            },
            "warningText": {
                "warning": {
                        "english": " is probably  NOT safe!",
                        "german" : " ist wahrscheinlich  NICHT sicher!"
                },
                "safe": {
                    "english": " is probably safe!",
                    "german" : " ist wahrscheinlich sicher!"
                },
                "unknown": {
                    "english": " is not known to us!",
                    "german" : " kennen wir nicht!"
                }
            },
            "warningReason": {
                "warning": {
                    "blacklist": {
                        "english": "Reason: We found the web page in a blacklist of phishing sites!",
                        "german" : "Grund: Wir haben die Seite in einer schwarzen Liste für Phishing Seiten gefunden!"
                    },
                    "VTTScan": {
                        "english": "Reason: We ran a virus scan of this page!",
                        "german" : "Grund: Wir haben einen Virenscan dieser Webseite gemacht!"
                    }
                },
                "safe": {
                    "database": {
                        "english": "Reason: We found the site our database.",
                        "german" : "Grund: Wir haben die Seite in unserer Datenbank gefunden."
                    },
                    "VTTScan": {
                        "english": "Reason: We ran a virus scan of this page!",
                        "german" : "Grund: Wir haben einen Virenscan dieser Webseite gemacht!"
                    }
                },
                "unknown": {
                    "noData": {
                        "english": "Reason: We could not find the site in our databases.",
                        "german" : "Grund: Wir konnten die Seite nicht in unseren Datenbanken finden."
                    },
                    "noScan": {
                        "english": "Reason: The site is not in our databases and no virus scan was performed so far.",
                        "german" : "Grund: Die Seite ist nicht in unseren Datenbanken und es sie wurde bisher nicht gescannt."
                    }
                }
            },
            "actionProposed": {
                "warning": {
                    "english": "Recommendation: Leave this page! Do not enter any personal data!",
                    "german" : "Empfehlung: Geben Sie keine persönlichen Daten ein!"
                },
                "safe": {
                    "english": "You can enter your data here with no concerns.",
                    "german" : "Sie können Ihre Daten ohne Bedenken eingeben."
                },
                "unknown": {
                    "english": "Make sure you are on a valid page!",
                    "german" : "Stellen Sie sicher auf der richtigen Seite zu sein!"
                }
            },
            "detectInfo": {
                "text": {
                    "english": "How to detect a Phishing Page",
                    "german": "Wie man Phishing Seiten erkennt"
                },
                "url": {
                    "english": "https://www.wildfirecu.org/education-and-resources/blog/blog-post/wildfire-blog/how-to-spot-a-phishing-website",
                    "german": "https://www.bsi.bund.de/DE/Themen/Verbraucherinnen-und-Verbraucher/Cyber-Sicherheitslage/Methoden-der-Cyber-Kriminalitaet/Spam-Phishing-Co/Passwortdiebstahl-durch-Phishing/Wie-erkenne-ich-Phishing-in-E-Mails-und-auf-Webseiten/wie-erkenne-ich-phishing-in-e-mails-und-auf-webseiten_node.html"
                }
            },
            "pageUnknown": {
                "english": "We currently do not have information about this page.",
                "german": "Wir haben derzeit keine Informationen über diese Seite."
            },
            "leaveButton": {
                "english": "Leave page",
                "german": "Seite verlassen"
            }
        },
        "settings": {
            "textA": {
                "english": "bla",
                "german" : "blaDeutsch"
            },
            "textB": {
                "english": "bla",
                "german" : "blaDeutsch"
            }
        },
        "popup": {
            "textA": {
                "english": "bla",
                "german" : "blaDeutsch"
            },
            "textB": {
                "english": "bla",
                "german" : "blaDeutsch"
            }
        },
        "placeholderPassword": {
            "english": "Think twice before entering data!",
            "german": "Denken Sie zweimal nach, bevor Sie Daten eingeben!"
        }
    }
};