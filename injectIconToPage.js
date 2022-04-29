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
var warningSite = false;
var safeSite = false;
var VTTattempts = 0;
var siteFromKnown = false;

var language = "english"; //Default, can be overwritten by chrome storage

//Waits a given time in milliseconds
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

//creates an HTML object and adds a class
function createElementWithClass(type, className) {
    const element = document.createElement(type);
    element.className = className;
    return element;
}

//removes all occurences of "currentSiteShort" from an array, where the name is stored in first positions of arrays
function deleteCurrentSiteFromArray(infoArray) {
    var index = 0;
    for (site of infoArray){
        if(site[0] == currentSiteShort){
            infoArray.splice(index, 1);
            //break;
        }
        index += 1;
    }
    return infoArray;
}

async function main(){
    console.log("PD: Site Scan initiated!");
    await chrome.storage.local.get('PDlanguage', function(items){
        language = items['PDlanguage'];
    });
    await sleep(1);

    //check if site is in recently opened sites
    await chrome.storage.local.get("PDopenPageInfos", function(items){
        var infoArray = items['PDopenPageInfos'];
        for (site of infoArray){
            if(site[0] == currentSiteShort){
                console.log("Page found in recently visited pages!");
                var VTTinfos = null;
                siteStatus = site[1];
                siteReason = site[2];
                if(siteStatus == "safe"){safeSite = true;}
                if(siteStatus == "warning"){warningSite = true;}
                if(site[2] == 'VTTScan'){
                    VTTinfos = site[3];
                }
                processStatus(false,[]);
                break;
            }
        }
    });

    await sleep(5);
    //console.log(safeSite,warningSite);
    //check if site is in blacklist/whitelist
    if(!warningSite & !safeSite){
        await declareSites();
        warningSite = await siteInSuspected(currentSite);
        safeSite = await siteInSafe(currentSite);
        processStatus(true,[]);
    }

    await sleep(5);
    //check site with virustotal
    if(!warningSite && !safeSite){
        console.log("Neither safe nor unsafe so far");
        chrome.storage.local.get("PDopenPageInfos", function(items){
            var infoArray = items['PDopenPageInfos'];
            infoArray = deleteCurrentSiteFromArray(infoArray);
            if(infoArray.length>100){infoArray.pop()}
            infoArray = [[currentSiteShort, "unknown", "noScan"]].concat(infoArray);
            chrome.storage.local.set({'PDopenPageInfos': infoArray}, function() {});
        });
        //chrome.storage.local.set({'PDcurrentSiteInfos': [currentSiteShort, "unknown", "noScan"]}, function() {});
        siteStatus = "unknown";
        siteReason = "noScan";
        //TODO: Await wartet nicht, da kein Promise da ist
        await getVirusTotalInfo(0);
        await sleep(1000);

        //macht er selber
        //processStatus(false,[]);
    }


    var pwElems = document.querySelectorAll('input[type=password]');
    if(!pwElems.length == 0){
        await inputPDIcon(pwElems);
        writeStats("icon");
    }
}

function processStatus(writeStatus, VTTarray){
    if(safeSite){
        chrome.storage.local.get("PDopenPageInfos", function(items){
            var infoArray = items['PDopenPageInfos'];
            if(infoArray.length>100){infoArray.pop()}
            if(writeStatus){
                infoArray = deleteCurrentSiteFromArray(infoArray);
                infoArray = [[currentSiteShort, "safe", siteReason, VTTarray]].concat(infoArray);
                console.log(infoArray);
                chrome.storage.local.set({'PDopenPageInfos': infoArray}, function() {});
            }
        });
        siteStatus = "safe";
        chrome.runtime.sendMessage({VTTtoCheckURL: "safeSite"}, function(response) {});
    }
    if(warningSite){
        console.log("warning site!");
        chrome.storage.local.get("PDopenPageInfos", function(items){
            var infoArray = items['PDopenPageInfos'];
            if(infoArray.length>100){infoArray.pop()}
            if(writeStatus){
                infoArray = deleteCurrentSiteFromArray(infoArray);
                infoArray = [[currentSiteShort, "warning", siteReason, VTTarray]].concat(infoArray);
                console.log(infoArray);
                chrome.storage.local.set({'PDopenPageInfos': infoArray}, function() {});
            }
        });

        //Set Background color to red if enabled
        chrome.storage.local.get("PDsetBGColor", function(items){
            enabled = items['PDsetBGColor'];
            console.log("color enabled: ", enabled);
            if(enabled){
                console.log("BG set red");
                document.body.style.backgroundColor = 'red';
                //TODO: Wieder neutral setzen danach!!!
            }
        });
        siteStatus = "warning";
        chrome.runtime.sendMessage({VTTtoCheckURL: "warningSite"}, function(response) {});
    }
    if(!warningSite && !safeSite){
        chrome.runtime.sendMessage({VTTtoCheckURL: "unknownSite"}, function(response) {});
    }
}

//Start routine if plugin is enabled
chrome.storage.local.get("PDactivationStatus", function(items){
    enabled = items['PDactivationStatus'];
    if(enabled)
        main()
});

//Redo analysis if security information changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
    for(key in changes) {
      if(key === 'PDopenPageInfos') {
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

async function getVirusTotalInfo(backoff) {
    if(VTTattempts > 3){console.log('I gave up requesting the scan!'); return;}
    VTTattempts += 1;
    console.log("VTT initiated!");
    writeStats('VTTinitiated');
    await sleep(backoff * VTTattempts * VTTattempts);
    
    await chrome.runtime.sendMessage({VTTtoCheckURL: "VTTcheck"}, function(response) {
        console.log(response.VTTresult);
        var resp = response;

        //if site was never scanned before, request a scan
        if( VTTattempts == 1 && 'error' in resp.VTTresult){
            console.log("Not scanned before!");
            var i = 0;
            chrome.runtime.sendMessage({VTTtoCheckURL: "VTTrequestScan"}, function(response) {
                chrome.runtime.sendMessage({VTTtoCheckURL: "VTTcheck"}, function(response) {
                    resp = response;
                    writeStats('VTTScan requested');
                    //load virus scan new, then return and not use old data
                    getVirusTotalInfo(1000);
                    return;
                });
            });
            i += 1;
            
        }
        if('error' in resp.VTTresult){getVirusTotalInfo(1000); return;}
        virusScan = resp.VTTresult.data.attributes.last_analysis_stats;
        totalVotes = virusScan.harmless + virusScan.malicious + virusScan.suspicious;
        positiveVotes = virusScan.harmless;
        negativeVotes = virusScan.malicious + virusScan.suspicious;
/*      totalVotes = 100;
        negativeVotes = 20;
        positiveVotes = 10; */
        if(totalVotes > 10) {
            if(negativeVotes > 0){ //As on the blacklist some sites only have 1 vendor who flags it as malicoius
                console.log("virus scan: warning");
                warningSite = true;
                safeSite = false;
            }
            else {
                warningSite = false;
                safeSite = true;
                
            }
            siteReason = 'VTTScan';
            processStatus(true, [totalVotes, positiveVotes, negativeVotes]);
        }
        else{getVirusTotalInfo(1000);}
      });
    //return;
}

//Platziert das PD Icon neben allen übergebenen Feldern
async function inputPDIcon(pwElems) {
    for(let item of pwElems){
        //change text of password field
        //item.placeholder = texts.texts.placeholderPassword[language];
        //create item svg
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
        
        iconAppended.addEventListener("mouseenter", async function(event) {
            if(!(container == undefined)){return;}
            container = buildInfoContainer(iconAppended);
            //console.log("hover");
            iconAppended.classList.add('iconHovered');
            container.classList.add('hoverContainerOnHover');
            if(warningSite){
                warning();
            }
            else if(safeSite){
                safe();
            }
            if(!safeSite && !warningSite){
                unknown();
            }

            document.body.addEventListener("click", function(event) {
                if(container == undefined) {return;}
                iconAppended.classList.remove('iconHovered');
                container.remove();
                container = undefined;
                writeStats("unhover");
            });
            writeStats("hover");
        });
        //update last injection
        chrome.storage.local.get('PDLastInjections', function(items){
            var injectionArray = items['PDLastInjections'];
            if(safeSite){injectionArray[1] = Date.now();}
            else if(safeSite){injectionArray[2] = Date.now();}
            else{injectionArray[3] = Date.now();}
            chrome.storage.local.set({'PDLastInjections': injectionArray}, function() {});
        });
    }
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
    chrome.storage.local.set({'PDcurrentSiteInfos': values}, function() {}); */
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
            siteStatus = 'warning';
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
        safeSite = safeSites[safeSiteIndex].url;
        if(site.includes(safeSite)){
            siteStatus = 'safe';
            siteReason = "whitelist";
            console.log("Site\n" + site + "\n was considered safe.");
            
            return true;
        }
    }
    return false;
}

function writeStats(type) {
    //var statsArray = [];
    chrome.storage.local.get('PDStats', function(items){
        var statsArray = items['PDStats'];
        id = statsArray.length + 1;
        statsArray.push([Date.now(), id, type, siteStatus, siteReason, currentSiteShort]);
        chrome.storage.local.set({'PDStats': statsArray}, function() {});
    });
    
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