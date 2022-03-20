let url = 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/safeSites.json';
var allKnownSites;
var phishingSites;
var safeSites;
var currentSite = window.location.toString();
var currentSiteShort = window.location.toString().split('/')[2];

//check site and write current information in Chrome storage
var phishingSite;
var safeSite;

var language = "english"; //Default, can be overwritten by chrome storage


async function main(){
    await chrome.storage.sync.get('PDlanguage', function(items){
        language = items['PDlanguage'];
    });
    await sleep(1);

    await declareSites();

    //check site and write current information in Chrome storage
    phishingSite = await siteInSuspected(currentSite);
    safeSite = await siteInSafe(currentSite);

    console.log("MainSafeSite: " + safeSite);
    if(safeSite){
        chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "safe", "whitelist"]}, function() {});
    }
    if(phishingSite){
        chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "severe", "blacklist"]}, function() {});
    }
    if(!phishingSite && !safeSite){
        chrome.storage.sync.set({'PDcurrentSiteInfos': [currentSiteShort, "unknown", "notFound"]}, function() {});
    }

    var pwElems = document.querySelectorAll('input[type=password]');
    if(!pwElems.length == 0){
        await inputPDIcon(pwElems);
    }
}

//Start routine if plugin is enabled
chrome.storage.sync.get("PDactivationStatus", function(items){
    enabled = items['PDactivationStatus'];
    if(enabled)
        main()
});

//Wartet eine gegebene Zeit in Millisekunden
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

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
    phishingSites = allKnownSites.phishingSites;
    safeSites = allKnownSites.safeSites;
    console.log(safeSites);
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
        newItemSVG.setAttribute('viewBox', '0 0 172 172');
        newItemSVG.setAttribute('class', 'appendedSecurityLogo');
        newItemPath.setAttribute(
            'd',
            "M86,17.2c-26.3848,0 -53.82839,5.94609 -53.82839,5.94609l-0.0224,0.0224c-5.35441,1.07186 -9.21013,5.77087 -9.21589,11.23151v45.86667c0,13.18667 3.17824,24.19646 8.0401,33.36979l118.09323,-69.97578v-9.26068c0.00279,-5.47597 -3.86671,-10.18973 -9.23828,-11.25391c0,0 -27.44359,-5.94609 -53.82839,-5.94609zM57.33333,40.13333l8.6,11.46667l-8.6,11.46667l-8.6,-11.46667zM149.06667,56.9862l-111.91198,66.32526c16.78668,22.03354 42.02384,29.91384 44.81406,30.73829c0.27976,0.10814 0.56366,0.20526 0.85104,0.29114c0.0045,0.00126 0.16797,0.05599 0.16797,0.05599h0.04479c0.96727,0.26352 1.96493,0.39905 2.96745,0.40312c1.01752,-0.00013 2.03049,-0.13569 3.01224,-0.40312c0.18813,-0.05493 0.37482,-0.11467 0.55989,-0.17917c3.08872,-0.90331 59.49453,-18.17289 59.49453,-73.95104zM114.66667,97.46667l8.6,11.46667l-8.6,11.46667l-8.6,-11.46667z"
        );
        newIcon.appendChild(newItemSVG);
        newItemSVG.appendChild(newItemPath);
        
        console.log("safeSite: " + safeSite);

        //set safe status
        if(phishingSite){newItemSVG.classList.add('warningSecurityLogo');}
        else if(safeSite){newItemSVG.classList.add('safeSecurityLogo');}
        else {newItemSVG.classList.add('unknownSecurityLogo');}


/*         var position = item.getBoundingClientRect();
        newIcon.style.left = position.left + position.width + 'px';
        newIcon.style.top = position.top + 10 + 'px'; */

        item.parentNode.appendChild(newIcon);
        iconAppended = newItemSVG;//document.getElementsByClassName('appendedSecurityLogo')[0];

        var container;
        
        iconAppended.addEventListener("mouseenter", async function(event) {
            if(!(container == undefined)){return;}
            container = buildInfoContainer(iconAppended);
            console.log("hover");
            iconAppended.classList.add('iconHovered');
            container.classList.add('hoverContainerOnHover');
            if(phishingSite){
                warning("blacklist");
            }
            var safeSite = await siteInSafe(currentSite);
            if(safeSite){
                safe();
            }
            if(!safeSite && !phishingSite){
                unknown();
            }

            document.body.addEventListener("click", function(event) {
                if(container == undefined) {return;}
                iconAppended.classList.remove('iconHovered');
                container.remove();
                container = undefined;
                //container.classList.remove('hoverContainerOnHover');
            });
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

//Erstellt alle Infos für den Fall einer Warnung
function warning(reason){
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextWarning');
    appendTexts("severe", reason);

    //Set Background color to red if enabled
    chrome.storage.sync.get("PDsetBGColor", function(items){
        enabled = items['PDsetBGColor'];
        if(enabled)
            document.body.style.backgroundColor = 'red';
            //TODO: Wieder neutral setzen danach!!!
    });

/*     var values = [currentSiteShort, "warning", reason];
    chrome.storage.sync.set({'PDcurrentSiteInfos': values}, function() {}); */
}

//Erstellt alle Infos für den Fall einer sicheren Seite
function safe(){
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextSafe');
    appendTexts("safe", "database");

/*     reason = "whitelist";
    var values = [currentSiteShort, "safe", reason];
    chrome.storage.sync.set({key: values}, function() {
        console.log('Data for popup is set to ' + values);
    }); */
}

//Erstellt alle Infos für den Fall einer unbekannten Seite
function unknown(){
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextUnknown');
    appendTexts("unknown", "noData");
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
                "severe": {
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
                "severe": {
                        "english": " is probably  NOT safe!",
                        "german" : " ist wahrscheinlich  NICHT sicher!"
                },
                "safe": {
                    "english": " is probably safe!",
                    "german" : " ist wahrscheinlich sicher!"
                },
                "unknown": {
                    "english": " is not known!",
                    "german" : " kennen wir nicht!"
                }
            },
            "warningReason": {
                "severe": {
                    "blacklist": {
                        "english": "Reason: We found the web page in a blacklist of phishing sites!",
                        "german" : "Grund: Wir haben die Seite in einer schwarzen Liste für Phishing Seiten gefunden!"
                    }
                },
                "safe": {
                    "database": {
                        "english": "Reason: We found the site our database.",
                        "german" : "Grund: Wir haben die Seite in unserer Datenbank gefunden."
                    }
                },
                "unknown": {
                    "noData": {
                        "english": "Reason: We could not find the site in our databases.",
                        "german" : "Grund: Wir konnten die Seite nicht in unseren Datenbanken finden."
                    }
                }
            },
            "actionProposed": {
                "severe": {
                    "english": "Recommendation: Leave this page! Do not enter any personal data!",
                    "german" : "Empfehlung: Verlassen Sie diese Seite! Geben Sie keine persönlichen Daten ein!"
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