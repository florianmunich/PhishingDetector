let url =
    "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/knownSites.json";
//Initialize variables
var allKnownSites;
var warningSites;
var safeSites;
var currentSite = window.location.toString();
var currentSiteShort = window.location.toString().split("/")[2];
var id;
var siteStatus;
var siteReason = "noData";
var warningSite = false;
var safeSite = false;
var VTTinfos = null;
var VTTattempts = 0;
var siteFromKnown = false;
const maxKnownPages = 1000;
var language = "english"; //Default, can be overwritten by chrome storage
var lastWarning;
const uploadInterval = 3600000; //For the study the statistics will be uploaded every hour, therefore every 3600.000 ms
const maxTimeWithoutWarning = 518400000; //For the study a warning will be inserted every 6 days, therefore every 518400.000 ms
var realCase = true; //For testing the user's attention this will be set to false once a while
var currentlyWritingInjections = false;
var recentlyKnownPagesChecking = true;
var listsChecking = true;

//Start routine if plugin is enabled
chrome.storage.local.get("PDactivationStatus", function (items) {
    enabled = items["PDactivationStatus"];
    if (enabled) main();
});

//Helper Function
//Waits a given time in milliseconds
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

//Helper Function
//Creates an HTML object and adds a class
function createElementWithClass(type, className) {
    const element = document.createElement(type);
    element.className = className;
    return element;
}

//Removes all occurences of "currentSiteShort" from an array, where the name is stored in first positions of arrays
function deleteCurrentSiteFromArray(infoArray) {
    var index = 0;
    for (site of infoArray) {
        if (site[0] == currentSiteShort) {
            infoArray.splice(index, 1);
            //break;
        }
        index += 1;
    }
    return infoArray;
}

//Handles all functionalities of the plugin on the site
//Only is called if the general functionality is enabled in the settings
async function main() {
    console.log("PD: Site Scan initiated!");
    chrome.storage.local.get("PDLastInjections", function (items) {
        lastWarning = items["PDLastInjections"][3];
    });
    writeStats("PDSiteFunctionalityInitiated");
    await chrome.storage.local.get("PDlanguage", function (items) {
        language = items["PDlanguage"];
    });
    await sleep(1);

    //Check if site is in recently opened sites
    await chrome.storage.local.get("PDopenPageInfos", function (items) {
        var infoArray = items["PDopenPageInfos"];
        var foundInRecents = false;
        for (site of infoArray) {
            if (site[0] == currentSiteShort) {
                //console.log("PD: Page found in recently visited pages.", site);
                foundInRecents = true;
                siteStatus = site[1];
                siteReason = site[2];
                if (siteStatus == "safe") {
                    safeSite = true;
                    recentlyKnownPagesChecking = false;
                }
                if (siteStatus == "warning") {
                    warningSite = true;
                    recentlyKnownPagesChecking = false;
                }
                if (site[2] == "VTTScan") {
                    VTTinfos = site[3];
                }
                processStatus(false, []);
                break;
            }
        }
        recentlyKnownPagesChecking = false;
        if (foundInRecents) {
            listsChecking = false;
        } else {
            checkListsForSite();
        }
    });

    //Check if site is in blacklist/whitelist
    async function checkListsForSite() {
        if (!warningSite & !safeSite) {
            await declareSites();
            warningSite = await siteInSuspected(currentSite);
            safeSite = await siteInSafe(currentSite);
            listsChecking = false;
            processStatus(true, []);
        } else {
            listsChecking = false;
        }
    }

    //Check site with virustotal
    var toCheck = true; //While the checking from the other scripts is not done yet, looping until VTT can be checked
    while (toCheck) {
        if (recentlyKnownPagesChecking || listsChecking) {
            await sleep(500);
        } else {
            if (!warningSite && !safeSite) {
                chrome.storage.local.get("PDopenPageInfos", function (items) {
                    var infoArray = items["PDopenPageInfos"];
                    infoArray = deleteCurrentSiteFromArray(infoArray);
                    if (infoArray.length > maxKnownPages) {
                        infoArray.pop();
                    }
                    infoArray = [
                        [currentSiteShort, "unknown", "noScan"],
                    ].concat(infoArray);
                    chrome.storage.local.set(
                        { PDopenPageInfos: infoArray },
                        function () {redoAnalysis();}
                    );
                });
                siteStatus = "unknown";
                siteReason = "noScan";

                await getVirusTotalInfo(0);
                //await sleep(1000);
            }
            toCheck = false;
        }
    }

    //For every password field: insert the icon
    var pwElems = document.querySelectorAll("input[type=password]");
    if (!pwElems.length == 0) {
        inputPDIcon(pwElems);
    }

    //Check if the stats schould be uploaded
    checkUpload();
}

//Processes the status of a page and sets the known page array
//Also, arranges the background of the page to be set to red if enabled
function processStatus(writeStatus, VTTarray) {
    if (safeSite) {
        chrome.storage.local.get("PDopenPageInfos", function (items) {
            var infoArray = items["PDopenPageInfos"];
            if (infoArray.length > maxKnownPages) {
                infoArray.pop();
            }
            if (writeStatus) {
                infoArray = deleteCurrentSiteFromArray(infoArray);
                infoArray = [
                    [currentSiteShort, "safe", siteReason, VTTarray],
                ].concat(infoArray);
                chrome.storage.local.set(
                    { PDopenPageInfos: infoArray },
                    function () {redoAnalysis();}
                );
            }
        });
        siteStatus = "safe";
        chrome.runtime.sendMessage(
            { RequestReason: "safeSite" },
            function (response) {}
        );
    }
    if (warningSite) {
        chrome.storage.local.get("PDopenPageInfos", function (items) {
            var infoArray = items["PDopenPageInfos"];
            if (infoArray.length > maxKnownPages) {
                infoArray.pop();
            }
            if (writeStatus) {
                infoArray = deleteCurrentSiteFromArray(infoArray);
                infoArray = [
                    [currentSiteShort, "warning", siteReason, VTTarray],
                ].concat(infoArray);
                chrome.storage.local.set(
                    { PDopenPageInfos: infoArray },
                    function () {redoAnalysis();}
                );
            }
        });

        //Set Background color to red if enabled
        chrome.storage.local.get("PDsetBGColor", function (items) {
            enabled = items["PDsetBGColor"];
            if (enabled) {
                console.log("PD: Background set red");
                document.body.style.backgroundColor = "red";
                writeStats("BGColor set red");
            }
        });
        siteStatus = "warning";
        chrome.runtime.sendMessage(
            { RequestReason: "warningSite" },
            function (response) {}
        );
    }
    if (!warningSite && !safeSite) {
        chrome.runtime.sendMessage(
            { RequestReason: "unknownSite" },
            function (response) {}
        );
    }
}

//Redo analysis if security information changes
function redoAnalysis(){
    PDIcons = document.getElementsByClassName("PDIcon");
    if (warningSite) {
        chrome.runtime.sendMessage(
            { RequestReason: "warningSite" },
            function (response) {}
        );
        for (let PDIcon of PDIcons) {
            PDIcon.firstChild.classList.add("warningSecurityLogo");
            PDIcon.firstChild.classList.remove("safeSecurityLogo");
            PDIcon.firstChild.classList.remove("unknownSecurityLogo");
        }
        writeStats("Change: Set to Warning");
    } else if (safeSite) {
        chrome.runtime.sendMessage(
            { RequestReason: "safeSite" },
            function (response) {}
        );
        for (let PDIcon of PDIcons) {
            PDIcon.firstChild.classList.remove("warningSecurityLogo");
            PDIcon.firstChild.classList.add("safeSecurityLogo");
            PDIcon.firstChild.classList.remove("unknownSecurityLogo");
        }
        writeStats("Change: Set to Safe");
    }
}//);

//DOwnloads the list of known sites
async function getknownSites() {
    await fetch(url)
        .then((res) => res.json())
        .then((out) => {
            allKnownSites = out;
        });
}

//Initializes the downloading of known sites and lists Phishing / Safe sites into arrays
async function declareSites() {
    await getknownSites();
    warningSites = allKnownSites.phishingSites;
    safeSites = allKnownSites.safeSites;
}

//Attempts to get the virus information from Virustotal.com
//Receives a backoff, to wait some time if e.g. a rescan was requested
async function getVirusTotalInfo(backoff) {
    if (VTTattempts > 3) {
        console.log("PD: I gave up requesting the VTT scan!");
        return;
    }
    VTTattempts += 1;
    console.log("PD: VTT initiated!");
    writeStats("VTTinitiated");
    await sleep(backoff * VTTattempts * VTTattempts);

    await chrome.runtime.sendMessage(
        { RequestReason: "VTTcheck" },
        function (response) {
            //console.log(response.VTTresult);
            var resp = response;

            //If site was never scanned before, request a scan
            if (VTTattempts == 1 && "error" in resp.VTTresult) {
                console.log("PD:Page not scanned by VTT before!");
                var i = 0;
                chrome.runtime.sendMessage(
                    { RequestReason: "VTTrequestScan" },
                    function (response) {
                        chrome.runtime.sendMessage(
                            { RequestReason: "VTTcheck" },
                            function (response) {
                                resp = response;
                                writeStats("VTTScan requested");
                                //Load virus scan new, then return and not use old data
                                getVirusTotalInfo(1000);
                                return;
                            }
                        );
                    }
                );
                i += 1;
            } else if ("error" in resp.VTTresult) {
                getVirusTotalInfo(1000);
                return;
            }
            virusScan = resp.VTTresult.data.attributes.last_analysis_stats;
            totalVotes =
                virusScan.harmless + virusScan.malicious + virusScan.suspicious;
            positiveVotes = virusScan.harmless;
            negativeVotes = virusScan.malicious + virusScan.suspicious;
            if (totalVotes > 10) {
                if (negativeVotes > 1) {
                    //As on the blacklist some sites only have very few vendors who flag it as malicoius, but also safe sites have sometimes 1 detection
                    console.log("PD: virus scan: warning");
                    warningSite = true;
                    safeSite = false;
                } else {
                    warningSite = false;
                    safeSite = true;
                }
                siteReason = "VTTScan";
                processStatus(true, [totalVotes, positiveVotes, negativeVotes]);
                writeStats(
                    "VTTResult:" +
                        totalVotes +
                        "." +
                        positiveVotes +
                        "." +
                        negativeVotes
                );
            } else {
                getVirusTotalInfo(1000);
            }
        }
    );
}

//Places the PDIcon next to all submitted HTML fields
async function inputPDIcon(pwElems) {
    //console.log("current time - last injection: ", (Date.now() - lastWarning)/1000, "s");
    if (safeSite && Date.now() > lastWarning + maxTimeWithoutWarning) {
        //If last warning was shown too long ago, the user shoud be tested again. Only on safe sites!!
        warningSite = true;
        safeSite = false;
        realCase = false;
        siteReason = "attentionTest";
        chrome.runtime.sendMessage(
            { RequestReason: "warningSite" },
            function (response) {}
        );
    }
    for (let item of pwElems) {
        //Create item svg
        var newIcon = document.createElement("span");
        newIcon.className = "PDIcon";
        var newItemSVG = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        var newItemPath = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );
        newItemSVG.setAttribute("fill", "#000000");
        newItemSVG.setAttribute("viewBox", "0 0 250 250");
        newItemSVG.setAttribute("class", "appendedSecurityLogo");
        newItemPath.setAttribute(
            "d",
            "M213.97,25.79c-2.34-6.54-9.42-13.88-14.58-15.09C169.27,3.6,138.25,0,107.19,0S46.15,3.38,15.17,10.03C4.45,12.33,.13,17.79,.25,28.89c.11,10.45,0,21.06-.1,31.32-.19,18.62-.39,37.88,.74,56.65,.63,10.64,3.52,21.37,6.58,32.72,.93,3.46,1.88,6.99,2.79,10.59,.47-.22,.93-.45,1.37-.66,3.37-1.63,5.81-2.8,8.03-4.11,17.44-10.32,35.15-20.86,52.28-31.05,43.48-25.88,88.45-52.63,133.08-78.28,9.05-5.2,11.98-11.84,8.95-20.28ZM56.88,83.82l-21.31-27.13,20.84-28.48,20.84,28.16-20.37,27.45Z M213.41,74.99L28.54,184.48c17.62,22.36,49.66,44.33,72.64,49.29,1.51,.33,3.19,.5,4.99,.5,3.39,0,7.12-.61,10.5-1.7,35.73-11.57,63.57-33.07,80.5-62.17,15.92-27.36,21.49-60.22,16.24-95.41Zm-54.65,110.84l-21.27-27.26,20.55-28.09,21.09,27.43-20.37,27.92Z"
        );
        newIcon.appendChild(newItemSVG);
        newItemSVG.appendChild(newItemPath);

        //Set safety status
        if (warningSite) {
            newItemSVG.classList.add("warningSecurityLogo");
        } else if (safeSite) {
            newItemSVG.classList.add("safeSecurityLogo");
        } else {
            newItemSVG.classList.add("unknownSecurityLogo");
        }

        item.parentNode.appendChild(newIcon);
        iconAppended = newItemSVG;

        var container;

        //Include the hover container
        iconAppended.addEventListener("mouseenter", async function (event) {
            if (!(container == undefined)) {
                return;
            }
            container = buildInfoContainer(iconAppended);
            iconAppended.classList.add("iconHovered");
            container.classList.add("hoverContainerOnHover");
            if (warningSite) {
                warning();
            } else if (safeSite) {
                safe();
            }
            if (!safeSite && !warningSite) {
                unknown();
            }

            document.body.addEventListener("click", function (event) {
                if (container == undefined) {
                    return;
                }
                iconAppended.classList.remove("iconHovered");
                container.remove();
                container = undefined;
                writeStats("unhover");
            });
            writeStats("hover");
        });
        //Update last injection
        chrome.storage.local.get("PDLastInjections", function (items) {
            var injectionArray = items["PDLastInjections"];
            if (safeSite) {
                injectionArray[1] = Date.now();
            } else if (warningSite) {
                injectionArray[3] = Date.now();
            } else {
                injectionArray[2] = Date.now();
            }
            async function writeInjectionArray(injectionArray) {
                await sleep(1); //Needed as otherwise an old instance is used :(
                chrome.storage.local.set(
                    { PDLastInjections: injectionArray },
                    function (items) {
                        chrome.storage.local.get(
                            { PDLastInjections: injectionArray },
                            function (items) {}
                        );
                    }
                );
            }
            writeInjectionArray(injectionArray);
        });
    }
    writeStats("icon");
}

//Builds the hover container for a given PDIcon
function buildInfoContainer(iconAppended) {
    var container = document.createElement("div");
    container.setAttribute("class", "hoverContainer");
    var hoverContainerBackground = document.createElement("div");
    hoverContainerBackground.setAttribute("class", "hoverContainerBackground");
    container.appendChild(hoverContainerBackground);
    var siteInfoText = document.createElement("div");
    siteInfoText.setAttribute("class", "siteInfoText");
    siteInfoText.innerHTML = texts.texts.hoverBox.pageUnknown[language];
    var boxLowerPart = document.createElement("div");
    boxLowerPart.setAttribute("class", "boxLowerPart");
    var separatorLine = document.createElement("div");
    separatorLine.setAttribute("class", "separatorLine");
    var justifyPhish = document.createElement("div");
    justifyPhish.setAttribute("class", "justifyPhish");
    justifyPhish.innerHTML = "";
    var recommendation = document.createElement("div");
    recommendation.setAttribute("class", "recommendation");
    recommendation.innerHTML = "";
    var readMore = document.createElement("div");
    readMore.setAttribute("class", "readMore");
    var readMorePage = document.createElement("a");
    readMorePage.setAttribute(
        "href",
        texts.texts.hoverBox.detectInfo.url[language]
    );
    readMorePage.setAttribute("target", "_blank");
    readMorePage.innerHTML = texts.texts.hoverBox.detectInfo.text[language];
    readMore.appendChild(readMorePage);
    hoverContainerBackground.appendChild(siteInfoText);
    boxLowerPart.appendChild(justifyPhish);
    boxLowerPart.appendChild(recommendation);
    boxLowerPart.appendChild(separatorLine);
    boxLowerPart.appendChild(readMore);
    hoverContainerBackground.appendChild(boxLowerPart);

    var position = iconAppended.getBoundingClientRect();
    container.style.left = position.left + position.width + "px";
    container.style.top = position.top + 10 + "px";

    document.body.insertBefore(container, document.body.firstChild);
    return container;
}

//Writes the texts into the hoverbox
function appendTexts(rating, reason) {
    var siteInfoText = document.getElementsByClassName("siteInfoText")[0];
    var justifyPhish = document.getElementsByClassName("justifyPhish")[0];
    var recommendation = document.getElementsByClassName("recommendation")[0];
    siteInfoText.innerHTML =
        texts.texts.hoverBox.warningType[rating][language] +
        ": " +
        currentSiteShort +
        texts.texts.hoverBox.warningText[rating][language];
    justifyPhish.innerHTML =
        texts.texts.hoverBox.warningReason[rating][reason][language];
    recommendation.innerHTML =
        texts.texts.hoverBox.actionProposed[rating][language];
    resultText = "";
    if (VTTinfos != null) {
        //Display results of VTT
        resultText =
            texts.texts.hoverBox.VTTText.result[language];
        resultText += " " + VTTinfos[1];
        resultText +=
            " " + texts.texts.hoverBox.VTTText.pos[language];
        resultText += ", " + VTTinfos[2];
        resultText +=
            " " +
            texts.texts.hoverBox.VTTText.neg[language] +
            ".";
        recommendation.innerHTML = resultText;

        //Link VTT results
        var VTTResultsLink = createElementWithClass("a", "VTTResultsLink");
        //var currentSiteB64 = btoa(currentSiteShort).replaceAll("=", ""); //Somehow, VTT can't handle '='
        VTTResultsLink.setAttribute(
            "href",
            "https://www.virustotal.com/gui/domain/" + currentSiteShort
        );
        VTTResultsLink.setAttribute("target", "_blank");
        VTTResultsLink.innerHTML =
            texts.texts.hoverBox.VTTText.retrieve[language];
        recommendation.appendChild(document.createElement("br"));
        recommendation.appendChild(VTTResultsLink);
    }

    //manual ovverrides for attention Test
    if (siteReason == "attentionTest") {
        siteInfoText.innerHTML =
            texts.texts.hoverBox.warningType.safe[language] +
            ": " +
            currentSiteShort +
            texts.texts.hoverBox.warningText.safe[language];
        recommendation.innerHTML =
            texts.texts.hoverBox.actionProposed.safe[language];
    }
}

//Appends a leave button, if the site was suspected to be insecure
function appendLeaveButton() {
    container = document.getElementsByClassName("boxLowerPart")[0];
    container.removeChild(container.lastChild);
    leaveButton = createElementWithClass("button", "leaveButton");
    leaveButton.setAttribute(
        "onclick",
        'window.location = "https://google.com"'
    );
    leaveButton.setAttribute("onclick", 'writeStats("leaveClick")');
    leaveButton.innerHTML = texts.texts.hoverBox.leaveButton[language];
    container.appendChild(leaveButton);
}

//Creates all infos in case of a warning site
function warning() {
    var siteInfoText = document.getElementsByClassName("siteInfoText")[0];
    if (realCase) {
        siteInfoText.classList.add("siteInfotextWarning");
    } else {
        siteInfoText.classList.add("siteInfotextSafe");
    }
    appendTexts("warning", siteReason);
    appendLeaveButton();
}

//Creates all infos in case of a safe site
function safe() {
    var siteInfoText = document.getElementsByClassName("siteInfoText")[0];
    siteInfoText.classList.add("siteInfotextSafe");
    appendTexts("safe", siteReason);
}

//Creates all infos in case of a unknown site
function unknown() {
    var siteInfoText = document.getElementsByClassName("siteInfoText")[0];
    siteInfoText.classList.add("siteInfotextUnknown");
    appendTexts("unknown", siteReason);
}

//Checks if a given site is in the blacklist
async function siteInSuspected(site) {
    for (let warningSiteIndex in warningSites) {
        var currWarningSite = warningSites[warningSiteIndex].url;
        if (site.includes(currWarningSite)) {
            siteStatus = "warning";
            siteReason = "blacklist";
            console.log("PD: Site\n" + site + "\n was suspected (blacklist)");
            return true;
        }
    }
    return false;
}

//Checks if a given site is in the whitelist
async function siteInSafe(site) {
    for (let safeSiteIndex in safeSites) {
        var currSafeSite = safeSites[safeSiteIndex].url;
        if (site.includes(currSafeSite)) {
            siteStatus = "safe";
            siteReason = "whitelist";
            console.log(
                "PD: Site\n" + site + "\n was considered safe (whitelist)"
            );
            return true;
        }
    }
    return false;
}

//Catch the closing of a page for the stats
window.addEventListener("beforeunload", function () {
    writeStats("windowUnload");
});

//Send a request to the background script with a stats entry
function writeStats(type) {
    chrome.storage.local.get("PDShareData", function (items) {
        if (items["PDShareData"] == false) return;
        else {
            chrome.runtime.sendMessage(
                {
                    RequestReason: "writeStats",
                    statsToWrite: [
                        Date.now(),
                        type,
                        siteStatus,
                        siteReason,
                        currentSiteShort,
                    ],
                },
                function (response) {}
            );
        }
    });
}

//Checks when the last stats upload was performed and uploads the stats
function checkUpload() {
    chrome.storage.local.get("PDShareData", function (items) {
        if (items["PDShareData"] == false) {
            //Show warning after 10 hours to remind users that sharing is necessary for Prolific
            chrome.storage.local.get("PDLastInjections", function (items) {
                var lastUploadTime = items["PDLastInjections"][4];
                //more than 10 hours turned off -> Warning to enable it again
                if (Date.now() - lastUploadTime > 36000000) {
                    chrome.storage.local.get("PDActivationWarningToBeShown", function (items) {
                        if ((items["PDActivationWarningToBeShown"] == undefined) || (items["PDActivationWarningToBeShown"] == true)){
                            window.alert(texts.texts.prolific.warningOffline[language]);
                            chrome.storage.local.set({ PDActivationWarningToBeShown: false }, function () {});
                        }
                    });
                }
            });
            return;
        } else {
            chrome.storage.local.get("PDLastInjections", function (items) {
                function uploadStats() {
                    statsArray = [];
                    statsArrayString = "";

                    var injectionArray = items["PDLastInjections"];
                    statsArrayString +=
                        "[Plugin initialized, lastSafe, lastUnknown, lastWarning, lastUpload]\n";
                    for (entry of injectionArray) {
                        d = new Date(entry);
                        d = d.toISOString();
                        statsArrayString += entry + ": " + d + "\n";
                    }

                    chrome.storage.local.get("PDStats", function (items) {
                        statsArray = items["PDStats"];
                        statsArrayString += "\n\n---Begin list of injections ";
                        statsArrayString +=
                            "[timestamp, id, action performed, siteStatus, reason, pageURL]---\n";
                        for (entry of statsArray) {
                            statsArrayString += entry + "\n";
                        }
                        statsArrayString += "---End of injections---\n";

                        //aditionally get currently known sites
                        chrome.storage.local.get(
                            "PDopenPageInfos",
                            function (items) {
                                openPages = statsArray =
                                    items["PDopenPageInfos"];
                                statsArrayString +=
                                    "\n\nCurrently known pages:\n" +
                                    openPages.length +
                                    "\n";
                                statsArrayString +=
                                    "---Begin list of known pages ";
                                statsArrayString +=
                                    "[site, status, reason, (if applicable VTT results)]---\n";

                                for (entry of openPages) {
                                    statsArrayString += entry + "\n";
                                }

                                chrome.storage.local.get(
                                    "PDIDNumberOfClient",
                                    function (items) {
                                        var filename =
                                            "PDStats_" +
                                            items["PDIDNumberOfClient"] +
                                            "_" +
                                            String(Date.now());
                                        chrome.runtime.sendMessage(
                                            {
                                                RequestReason: "uploadStats",
                                                filename: filename,
                                                fileToUpload: statsArrayString,
                                            },
                                            function () {}
                                        );
                                        console.log("PD: Stats upload started");
                                    }
                                );
                            }
                        );
                    });
                }
                var lastUpload = items["PDLastInjections"][4];
                console.log(
                    "PD: Time since last Stats Upload: ",
                    (Date.now() - lastUpload) / 1000,
                    "s"
                );
                if (Date.now() > lastUpload + uploadInterval) {
                    uploadStats();
                    waitAndUpdateUploadTime();
                }
            });
        }
    });
}

//Sets the Upload Time into the chrome storage
async function waitAndUpdateUploadTime() {
    await sleep(1000);
    chrome.storage.local.get("PDLastInjections", function (items) {
        var pdLastInjectionsUpdate = items["PDLastInjections"];
        pdLastInjectionsUpdate[4] = Date.now();
        chrome.storage.local.set(
            { PDLastInjections: pdLastInjectionsUpdate },
            function () {}
        );
    });
}

//Contains all texts the user can see in English and German
var texts = {
    version: "1.0",
    languages: {
        english: "English",
        german: "Deutsch",
    },
    texts: {
        hoverBox: {
            warningType: {
                warning: {
                    english: "Warning",
                    german: "Warnung",
                },
                moderate: {
                    english: "Caution",
                    german: "Vorsicht",
                },
                safe: {
                    english: "Safe site",
                    german: "Sicher",
                },
                unknown: {
                    english: "Caution",
                    german: "Vorsicht",
                },
            },
            warningText: {
                warning: {
                    english: " is probably  NOT safe!",
                    german: " ist wahrscheinlich  NICHT sicher!",
                },
                safe: {
                    english: " is probably safe!",
                    german: " ist wahrscheinlich sicher!",
                },
                unknown: {
                    english: " is not known to us!",
                    german: " kennen wir nicht!",
                },
            },
            warningReason: {
                warning: {
                    blacklist: {
                        english:
                            "Reason: PhishingDetector found the web page in a blacklist of phishing sites!",
                        german: "Grund: PhishingDetector hat die Seite in einer schwarzen Liste für Phishing Seiten gefunden!",
                    },
                    VTTScan: {
                        english:
                            "Reason: PhishingDetector retrieved a virus scan of this page! You can access the result in the popup.",
                        german: "Grund: PhishingDetector hat einen Virenscan dieser Webseite abgerufen! Sie können das Ergebnis im Popup einsehen.",
                    },
                    attentionTest: {
                        english:
                            "PhishingDetector only tested your attention (1 time per 6 days). Good job!",
                        german: "PhishingDetector hat nur Ihre Aufmerksamkeit getestet (1 mal pro 6 Tage). Gute Arbeit!",
                    },
                },
                safe: {
                    whitelist: {
                        english:
                            "Reason: PhishingDetector found the site the database.",
                        german: "Grund: PhishingDetector die Seite in der Datenbank gefunden.",
                    },
                    VTTScan: {
                        english:
                            "Reason: PhishingDetector retrieved a virus scan of this page!",
                        german: "Grund: PhishingDetector hat einen Virenscan dieser Webseite abgerufen!",
                    },
                    userOverwrite: {
                        english:
                            " was detected as fraudulent by PhishingDetector, but you marked it as safe.",
                        german: "wurde von PhishingDetector als sch&auml;dlich erkannt, aber Sie haben es als sicher markiert.",
                    },
                },
                unknown: {
                    noData: {
                        english:
                            "Reason: PhishingDetector could not find the site in the databases.",
                        german: "Grund: PhishingDetector konnten die Seite nicht in den Datenbanken finden.",
                    },
                    noScan: {
                        english:
                            "Reason: The site is not in PhishingDetector's databases and no virus scan was performed so far.",
                        german: "Grund: Die Seite ist nicht in den Datenbanken von PhishingDetector und es sie wurde bisher nicht gescannt.",
                    },
                },
            },
            actionProposed: {
                warning: {
                    english:
                        "Recommendation: Leave this page! Do not enter any personal data!",
                    german: "Empfehlung: Geben Sie keine persönlichen Daten ein!",
                },
                safe: {
                    english: "You can enter your data here with no concerns.",
                    german: "Sie können Ihre Daten ohne Bedenken eingeben.",
                },
                unknown: {
                    english: "Make sure you are on a valid page!",
                    german: "Stellen Sie sicher auf der richtigen Seite zu sein!",
                },
            },
            VTTText: {
                result: {
                    english: "Result: ",
                    german: "Ergebnis: ",
                },
                pos: {
                    english: "positive",
                    german: "positiv",
                },
                neg: {
                    english: "negative",
                    german: "negativ",
                },
                neutral: {
                    english: "unrated",
                    german: "unbewertet",
                },
                retrieve: {
                    english: "View results",
                    german: "Ergebnis ansehen",
                },
            },
            detectInfo: {
                text: {
                    english: "How to detect a Phishing Page",
                    german: "Wie man Phishing Seiten erkennt",
                },
                url: {
                    english:
                        "https://www.wildfirecu.org/education-and-resources/blog/blog-post/wildfire-blog/how-to-spot-a-phishing-website",
                    german: "https://www.bsi.bund.de/DE/Themen/Verbraucherinnen-und-Verbraucher/Cyber-Sicherheitslage/Methoden-der-Cyber-Kriminalitaet/Spam-Phishing-Co/Passwortdiebstahl-durch-Phishing/Wie-erkenne-ich-Phishing-in-E-Mails-und-auf-Webseiten/wie-erkenne-ich-phishing-in-e-mails-und-auf-webseiten_node.html",
                },
            },
            pageUnknown: {
                english:
                    "We currently do not have information about this page.",
                german: "Wir haben derzeit keine Informationen über diese Seite.",
            },
            leaveButton: {
                english: "Leave page",
                german: "Seite verlassen",
            },
        },
        prolific: {
            warningOffline: {
                english:
                    "Message from PhishingDetector: Your last data upload was over 10 hours ago (or never). Remember to turn it back on if you want to participate in the Prolific study and not lose the bonus.",
                german: "Nachricht von PhishingDetector: Ihr letzter Datenupload war vor über 10 Stunden (oder nie). Denken Sie daran, es wieder einzuschalten, wenn Sie an der Prolific Studie teilnehmen, und nicht den Bonus verlieren wollen.",
            },
        },
    },
};
