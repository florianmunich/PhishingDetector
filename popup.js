var safeSiteURL =
    "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/knownSites.json";
//Initialize variables
var language = "english"; //Default, can be overwritten by chrome storage
var phishingSites;
var safeSites;
var siteStatus;
var siteReason;
var VTTStats = null;
var currentSiteShort;

//When the popup is opened, start the routine to display everything
init();

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

//Sets the new Setting option to the chrome storage and updates all other settings accordingly
async function handleSettingClick(event) {
    if (event.path[0].className == "switchInput") {
        return;
    }
    /*     let activeSwitch = event.target.parentElement.querySelector(
        `.${"switchInput"}`
    ); */
    let setting = event.target.parentElement.parentElement.id;
    var currentSettingStatus;
    await chrome.storage.local.get(setting, function (items) {
        currentSettingStatus = !items[setting];
    });

    await sleep(100);

    //See what to save
    if (setting == "PDactivationStatus") {
        //The below buttons will be set to the general option also
        await chrome.storage.local.set(
            { PDactivationStatus: currentSettingStatus },
            function () {}
        );
        await chrome.storage.local.set(
            { PDsetBGColor: currentSettingStatus },
            function () {}
        );
        BGButton = document.getElementById("PDsetBGColor");
        BGButton.lastChild.firstChild.checked = currentSettingStatus;
        await chrome.storage.local.set(
            { PDShareData: currentSettingStatus },
            function () {}
        );
        BEButton = document.getElementById("PDShareData");
        BEButton.lastChild.firstChild.checked = currentSettingStatus;
        //Disable or enable buttons (If general functionality is disabled, the other functions will be not clickable)
        BGButton.lastChild.firstChild.disabled = !currentSettingStatus;
        BEButton.lastChild.firstChild.disabled = !currentSettingStatus;
        //Color the options in grey if they are disabled
        BGButton.firstChild.firstChild.classList.toggle("notApplicable");
        BEButton.firstChild.firstChild.classList.toggle("notApplicable");
        
        chrome.storage.local.set({ PDActivationWarningToBeShown: "true" }, function () {});

        writeStats("PDactivationStatus set to " + currentSettingStatus);
    } else {
        let general_function;
        chrome.storage.local.get("PDactivationStatus", function (items) {
            general_function = items["PDactivationStatus"];
            if (general_function) {
                if (setting == "PDsetBGColor") {
                    chrome.storage.local.set(
                        { PDsetBGColor: currentSettingStatus },
                        function () {}
                    );
                    writeStats("PDsetBGColor set to " + currentSettingStatus);
                } else if (setting == "PDShareData") {
                    chrome.storage.local.set({ PDActivationWarningToBeShown: true }, function () {});
                    writeStats("PDShareData set to false"); //If set to true, this will automatically be blocked
                    handleStatsSharing(currentSettingStatus);
                }
            }
        });
    }
    await sleep(100);
    chrome.storage.local.get(setting, function (items) {
        console.log("Option set to: " + items[setting]);
    });
}

async function handleStatsSharing(currentSettingStatus) {
    await sleep(50);
    chrome.storage.local.set(
        { PDShareData: currentSettingStatus },
        function () {
            if (currentSettingStatus) {
                writeStats("PDShareData set to true"); //If set to false, this will automatically be blocked if done earlier than now
            }
        }
    );
}

//Only needed for the Prolific Study
function checkAndSetProlificID() {
    chrome.storage.local.get("PDProlificID", function (items) {
        if (items["PDProlificID"] == undefined || items["PDProlificID"] == "") {
            var prolificID = "";
            while (
                (prolificID == null || prolificID.length < 16) &&
                prolificID != "none"
            ) {
                //should be length 24
                prolificID = window.prompt(
                    'Enter your Prolific ID. Type "none" if you are not part of the study or were recruited other than Prolific. \nIMPORTANT: Enter the ID correctly and without spaces!'
                );
            }
            if (prolificID == "none") {
                chrome.storage.local.get(
                    "PDIDNumberOfClient",
                    function (items) {
                        IDNr = items["PDIDNumberOfClient"] + "_";
                        chrome.storage.local.set(
                            { PDProlificID: IDNr.split("_")[0] },
                            function () {}
                        );
                    }
                );
            } else {
                chrome.storage.local.set(
                    { PDProlificID: prolificID },
                    function () {}
                );
            }
            writeStats("ProlificID set to " + prolificID);
            if (!(prolificID == "none")) {
                chrome.storage.local.get(
                    "PDIDNumberOfClient",
                    function (items) {
                        console.log(items["PDIDNumberOfClient"]);
                        var PDID = items["PDIDNumberOfClient"] + "_";
                        chrome.storage.local.set(
                            {
                                PDIDNumberOfClient:
                                    PDID.split("_")[0] + "_" + prolificID,
                            },
                            function () {}
                        );
                    }
                );
                chrome.storage.local.get(
                    "PDProlificStudyCompleted",
                    function (items) {
                        if (items["PDProlificStudyCompleted"] == false) {
                            window.alert(
                                "If you are recruited by Prolific: The Prolific completion code is PD22LMU\nCopy and paste it into the Google Forms."
                            );
                            chrome.storage.local.set(
                                { PDProlificStudyCompleted: "true" },
                                function () {}
                            );
                        }
                    }
                );
            }
            document.location.reload();
        }
    });
}

//Main function, coordinates the popup
async function init() {
    checkAndSetProlificID();
    writeStats("popup");
    await chrome.storage.local.get("PDlanguage", function (items) {
        language = items["PDlanguage"];
    });

    await sleep(1);

    //General Container
    var container = createElementWithClass("div", "popupContainer");

    //Upper Part with Logo, name etc
    var identifier = container.appendChild(
        createElementWithClass("div", "identifier")
    );
    var logo = identifier.appendChild(createElementWithClass("div", "logo"));
    var newItemIMG = logo.appendChild(createElementWithClass("img", "logoSVG"));
    newItemIMG.setAttribute(
        "src",
        "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon.svg"
    );
    var nameExtension = identifier.appendChild(
        createElementWithClass("div", "name")
    );
    nameExtension.innerHTML = "PhishingDetector";
    var prolificID = nameExtension.appendChild(
        createElementWithClass("div", "prolificID")
    );
    chrome.storage.local.get("PDProlificID", function (items) {
        prolificID.innerHTML = "ID: " + items["PDProlificID"];
        var resetProlific = prolificID.appendChild(
            createElementWithClass("button", "resetProlificID")
        );
        resetProlific.innerHTML = "Reset ID";
        resetProlific.addEventListener("click", resetProlificFun);
        async function resetProlificFun() {
            chrome.storage.local.set({ PDProlificID: "" }, function () {});
            window.alert(texts.texts.prolific.reset[language]);
            await sleep(5); //Allowing to set the ID before reloading
            document.location.reload();
        }
    });

    iconsRight = identifier.appendChild(
        createElementWithClass("div", "iconsRight")
    );
    var infopage = iconsRight.appendChild(
        createElementWithClass("a", "infoSection")
    );
    var infoImg = infopage.appendChild(
        createElementWithClass("img", "infoIMG")
    );
    infoImg.setAttribute(
        "src",
        "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/info.png"
    );
    infopage.setAttribute(
        "href",
        "https://phishingdetector.github.io/PhishingDetector/"
    );
    infopage.setAttribute("target", "_blank");
    container.appendChild(createElementWithClass("div", "separatorLine"));

    //Page Info Part
    pageInfos = container.appendChild(
        createElementWithClass("div", "pageInfos")
    );
    var currentPageText = pageInfos.appendChild(
        createElementWithClass("div", "currentPageText")
    );
    var currentPageColored = pageInfos.appendChild(
        createElementWithClass("div", "currentPageColored")
    );
    var currentPageIMG = currentPageColored.appendChild(
        createElementWithClass("img", "currentPageIMG")
    );
    currentPageIMG.setAttribute(
        "src",
        "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon.svg"
    );
    var currentPageShortIndication = currentPageColored.appendChild(
        createElementWithClass("div", "currentPageShortIndication")
    );
    var currentPageJustification = pageInfos.appendChild(
        createElementWithClass("div", "currentPageJustification")
    );
    currentPageText.innerHTML =
        texts.texts.currentPage.currentPageText[language];
    await chrome.runtime.sendMessage(
        { RequestReason: "getCurrentTabURL" },
        function (response) {
            currentSiteShort = response.currentURL;
            chrome.storage.local.get("PDopenPageInfos", function (items) {
                knownSites = items["PDopenPageInfos"];
                var siteInKnown = false;
                for (site of knownSites) {
                    if (site[0] == currentSiteShort) {
                        //Set globals
                        siteStatus = site[1];
                        siteReason = site[2];
                        if (siteReason == "VTTScan") {
                            VTTStats = site[3];
                        }
                        setIdentifierText(
                            pageInfos,
                            (currentSite = currentSiteShort),
                            (warningType = siteStatus),
                            (warningReason = siteReason)
                        );
                        siteInKnown = true;
                        //At warning, offer the option to declare as safe manually
                        if (siteStatus == "warning") {
                            var clickSafeButton = createElementWithClass(
                                "button",
                                "clickSafeButton"
                            );
                            clickSafeButton.innerHTML =
                                texts.texts.currentPage.justification.markAsSafe.markSafeButton[
                                    language
                                ];
                            clickSafeButton.setAttribute(
                                "id",
                                "clickSafeButton"
                            );
                            clickSafeButton.addEventListener(
                                "click",
                                markAsSafeSite
                            );
                            document
                                .getElementsByClassName("pageInfos warning")[0]
                                .appendChild(clickSafeButton);
                        }
                        writeStats("Popup texts set");
                        break;
                    }
                }
                //If site is not known, set Error text
                if (!siteInKnown) {
                    siteStatus = "unknown";
                    siteReason = "noScan";
                    setIdentifierText(
                        pageInfos,
                        (currentSite = ""),
                        (warningType = "unknown"),
                        (warningReason = "notOpened")
                    );
                    writeStats("Popup unknownTexts set");
                }
            });
        }
    );
    container.appendChild(createElementWithClass("div", "separatorLine"));

    //Settings Switches
    async function addSetting(optionID, name, explanation) {
        var container = createElementWithClass("div", "settingBox");
        container.setAttribute("id", optionID);
        var textsSetting = container.appendChild(
            createElementWithClass("span", "settingInfos")
        );
        var title = textsSetting.appendChild(
            createElementWithClass("div", "settingTitle")
        );
        title.innerHTML = name;
        var explanationHTML = textsSetting.appendChild(
            createElementWithClass("div", "settingExplanation")
        );
        explanationHTML.innerHTML = explanation;
        var switchBox = container.appendChild(
            createElementWithClass("label", "switch")
        );
        switchBoxInput = switchBox.appendChild(
            createElementWithClass("input", "switchInput")
        );
        switchBoxInput.setAttribute("type", "checkbox");
        switchBoxInput.checked = true;

        switchBox.appendChild(createElementWithClass("span", "slider round"));
        switchBox.addEventListener("click", handleSettingClick);
        return container;
    }

    //Add options
    settingsBox = container.appendChild(
        createElementWithClass("div", "settings")
    );

    settingA = settingsBox.appendChild(
        await addSetting(
            "PDactivationStatus",
            texts.texts.settings.active.title[language],
            texts.texts.settings.active.explanation[language]
        )
    );
    settingB = settingsBox.appendChild(
        await addSetting(
            "PDsetBGColor",
            texts.texts.settings.backgroundIndication.title[language],
            texts.texts.settings.backgroundIndication.explanation[language]
        )
    );
    settingC = settingsBox.appendChild(
        await addSetting(
            "PDShareData",
            texts.texts.settings.shareData.title[language],
            texts.texts.settings.shareData.explanation[language]
        )
    );

    async function setProperty(setting) {
        var enabled;
        await chrome.storage.local.get(setting.id, function (items) {
            enabled = items[setting.id];
            if (!enabled) {
                setting.lastChild.firstChild.checked = false;

                //If general functionality is disabled, block other inputs
                if (setting.id == "PDactivationStatus") {
                    settingB.firstChild.firstChild.classList.toggle(
                        "notApplicable"
                    );
                    settingB.lastChild.firstChild.disabled = true;
                    settingC.firstChild.firstChild.classList.toggle(
                        "notApplicable"
                    );
                    settingC.lastChild.firstChild.disabled = true;
                }
            }
        });
    }
    setProperty(settingA);
    setProperty(settingB);
    setProperty(settingC);

    //Language
    function addLanguageDropdown() {
        var container = createElementWithClass("div", "languageSelectionBox");
        container.setAttribute("id", "languageSelection");
        var textsSetting = container.appendChild(
            createElementWithClass("span", "settingInfos")
        );
        var title = textsSetting.appendChild(
            createElementWithClass("div", "settingTitle")
        );
        title.innerHTML = texts.texts.settings.language[language];
        var switchBox = container.appendChild(
            createElementWithClass("select", "languageSelection")
        );

        for (var i in texts.languages) {
            languageI = switchBox.appendChild(document.createElement("option"));
            languageI.setAttribute("value", i);
            languageI.innerHTML = texts.languages[i];
        }

        for (var i, j = 0; (i = switchBox.options[j]); j++) {
            if (i.value == language) {
                switchBox.selectedIndex = j;
                break;
            }
        }

        switchBox.addEventListener("change", function (event) {
            chrome.storage.local.set(
                { PDlanguage: this.value },
                function () {}
            );
            writeStats("Language set to " + this.value);
            document.location.reload();
        });

        return container;
    }
    settingsBox.appendChild(addLanguageDropdown());

    container.appendChild(createElementWithClass("div", "separatorLine"));

    //Info Part
    var infoBox = container.appendChild(createElementWithClass("div", "infos"));
    var infoHeadline = infoBox.appendChild(
        createElementWithClass("div", "infoHeadline")
    );
    infoHeadline.innerHTML = texts.texts.infoBox.headline[language];
    var infoText = infoBox.appendChild(
        createElementWithClass("div", "infoText")
    );
    infoText.innerHTML = texts.texts.infoBox.infoText[language];

    //Add container to page
    document.body.appendChild(container);
}

//After the popup is initialized, the texts for the safety estimation are added
function setIdentifierText(
    htmlObject,
    currentSite,
    warningType,
    warningReason
) {
    htmlObject.classList.add(warningType);
    document.body.classList.add(warningType);
    htmlObject.childNodes[1].childNodes[1].innerHTML =
        texts.texts.currentPage.shortIndication[warningType][language];
    htmlObject.childNodes[2].innerHTML =
        currentSite +
        texts.texts.currentPage.justification[warningType][warningReason][
            language
        ];
    var logoSVG = document.getElementsByClassName("currentPageIMG")[0];
    switch (warningType) {
        case "warning":
            logoSVG.setAttribute(
                "src",
                "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_red.svg"
            );
            break;
        case "unknown":
            logoSVG.setAttribute(
                "src",
                "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_yellow.svg"
            );
            break;
        case "safe":
            logoSVG.setAttribute(
                "src",
                "https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/images/svgs/PDIcon_green.svg"
            );
            break;
    }
    if (VTTStats != null) {
        //Display results of VTT
        resultText =
            texts.texts.currentPage.justification.VTTText.result[language];
        resultText += " " + VTTStats[1];
        resultText +=
            " " + texts.texts.currentPage.justification.VTTText.pos[language];
        resultText += ", " + VTTStats[2];
        resultText +=
            " " +
            texts.texts.currentPage.justification.VTTText.neg[language] +
            ".";
        var virusScanResult = createElementWithClass("div", "virusScanResult");
        virusScanResult.innerHTML = resultText;
        htmlObject.childNodes[2].appendChild(document.createElement("br"));
        htmlObject.childNodes[2].appendChild(virusScanResult);

        //Link VTT results
        var VTTResultsLink = createElementWithClass("a", "VTTResultsLink");
        //var currentSiteB64 = btoa(currentSite).replaceAll("=", ""); //Somehow, VTT can't handle '='
        VTTResultsLink.setAttribute(
            "href",
            "https://www.virustotal.com/gui/domain/" + currentSite
        );
        VTTResultsLink.setAttribute("target", "_blank");
        VTTResultsLink.innerHTML =
            texts.texts.currentPage.justification.VTTText.retrieve[language];
        htmlObject.childNodes[2].appendChild(VTTResultsLink);
    }
}

//User can manually overwrite a warning site, that he trusts --> Marking it as safe
function markAsSafeSite() {
    writeStats("MarkSafe");
    document.getElementById("clickSafeButton").remove();
    var questionContainer = createElementWithClass("div", "questionContainer");
    questionContainer.setAttribute("id", "questionContainer");
    var question = createElementWithClass("div", "sureQuestion");
    var sureNo = createElementWithClass("button", "sure sureNo");
    var sureYes = createElementWithClass("button", "sure sureYes");
    question.innerHTML =
        texts.texts.currentPage.justification.markAsSafe.doubleCheck.question[
            language
        ];
    sureNo.innerHTML =
        texts.texts.currentPage.justification.markAsSafe.doubleCheck.answerNo[
            language
        ];
    sureYes.innerHTML =
        texts.texts.currentPage.justification.markAsSafe.doubleCheck.answerYes[
            language
        ];
    questionContainer.appendChild(question);
    questionContainer.appendChild(sureNo);
    questionContainer.appendChild(sureYes);

    //Double check that it was the intention of the user to mark it as safe
    function doubleYes() {
        writeStats("MarkSafeYes");
        console.log("Marked as safe");
        document.getElementById("questionContainer").remove();
        chrome.storage.local.get("PDopenPageInfos", function (items) {
            var infoArray = items["PDopenPageInfos"];
            if (infoArray.length > 1000) {
                infoArray.pop();
            }
            //Removes all occurences of "currentSiteShort" from an array, where the name is stored in first positions of arrays
            function deleteCurrentSiteFromArray(infoArray) {
                var index = 0;
                for (site of infoArray) {
                    if (site[0] == currentSiteShort) {
                        infoArray.splice(index, 1);
                        //break; //Theoretically possible, to be 100% sure: check all further pages
                    }
                    index += 1;
                }
                return infoArray;
            }
            infoArray = deleteCurrentSiteFromArray(infoArray);
            infoArray = [
                [currentSiteShort, "safe", "userOverwrite", "[]"],
            ].concat(infoArray);
            chrome.runtime.sendMessage(
                { RequestReason: "safeSite" },
                function (response) {}
            );
            chrome.storage.local.set(
                { PDopenPageInfos: infoArray },
                function () {}
            );
        });
        document.location.reload();
    }
    function doubleNo() {
        writeStats("MarkSafeNo");
        document.getElementById("questionContainer").remove();
    }
    sureYes.addEventListener("click", doubleYes);
    sureNo.addEventListener("click", doubleNo);
    document
        .getElementsByClassName("pageInfos warning")[0]
        .appendChild(questionContainer);
}

//Send a request to the background script with a stats entry
function writeStats(type) {
    chrome.storage.local.get("PDShareData", function (items) {
        if (
            items["PDShareData"] == false &&
            !type.includes("PDactivationStatus")
        ) {
            return;
        } else {
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

//Contains all texts the user can see in English and German
texts = {
    version: "1.0",
    languages: {
        english: "English",
        german: "Deutsch",
    },
    texts: {
        currentPage: {
            currentPageText: {
                english: "CURRENT PAGE",
                german: "AKTUELLE SEITE",
            },
            shortIndication: {
                warning: {
                    english: "Fraudulent Site",
                    german: "Sch&auml;dliche Seite",
                },
                safe: {
                    english: "Safe Site",
                    german: "Sichere Seite",
                },
                unknown: {
                    english: "Unknown Site",
                    german: "Unbekannte Seite",
                } /* ,
        "notOpened": {
          "english": "Site not analyzed",
          "german": "Seite nicht analysiert"
        } */,
            },
            justification: {
                warning: {
                    blacklist: {
                        english:
                            " we found in our database of known fradulent sites. Do NOT enter any data here, the operator of the site is a fraudster.",
                        german: " haben wir in unserer Datenbank sch&auml;dlicher Webseiten gefunden. Geben Sie hier KEINE Daten ein, da der Betreiber der Seite ein Betr&uuml;ger ist.",
                    },
                    VTTScan: {
                        english: " was found unsafe by previous virus scans!",
                        german: " wurde von vorherigen Virenscans als unsicher befunden!",
                    },
                },
                safe: {
                    whitelist: {
                        english:
                            " we found in our database of safe sites. You can enter your data here without concerns.",
                        german: " haben wir in unserer Datenbank sicherer Webseiten gefunden. Sie k&ouml;nnen Ihre Daten hier ohne Bedenken eingeben.",
                    },
                    VTTScan: {
                        english: " was found safe by previous virus scans!",
                        german: " wurde von vorherigen Virenscans als sicher befunden!",
                    },
                    userOverwrite: {
                        english:
                            " was detected as fraudulent by us, but you marked it as safe.",
                        german: "wurde von uns als sch&auml;dlich erkannt, aber Sie haben es als sicher markiert.",
                    },
                },
                unknown: {
                    noList: {
                        english:
                            " we could not find in our databases. Be careful when entering data here.",
                        german: " haben wir nicht in unserer Datenbank gefunden. Seien Sie vorsichtig, wenn Sie hier Daten eingeben.",
                    },
                    noScan: {
                        english:
                            " is neither in our database nor a virus scan was performed so far. Be careful when entering data here.",
                        german: " haben wir nicht in unserer Datenbank gefunden, und bisher wurde auch kein Virenscan durchgef&uuml;hrt. Seien Sie vorsichtig, wenn Sie hier Daten eingeben.",
                    },
                    notOpened: {
                        english:
                            "The page is not fully loaded yet, the plugin is disabled, the page was not opened with the plugin enabled or is a system page.",
                        german: "Die Seite ist noch nicht vollst&auml;ndig geladen, das Plugin ist deaktiviert, die Seite wurde nicht mit aktiviertem Plugin ge&ouml;ffnet oder ist eine Systemseite.",
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
                markAsSafe: {
                    markSafeButton: {
                        english: "I trust this page - Mark as safe",
                        german: "Ich vertraue dieser Seite, als sicher markieren",
                    },
                    doubleCheck: {
                        question: {
                            english:
                                "Are you sure you want to mark the page as safe?",
                            german: "Sind Sie sicher, dass Sie die Seite als sicher markieren wollen?",
                        },
                        answerYes: {
                            english: "Yes",
                            german: "Ja",
                        },
                        answerNo: {
                            english: "No",
                            german: "Nein",
                        },
                    },
                },
            },
        },
        settings: {
            active: {
                title: {
                    english: "Activate Phishing-Protection",
                    german: "Phishing-Schutz aktivieren",
                },
                explanation: {
                    english:
                        "Activate PDIcon insertion and scanning of new visited pages. This window will always be active.",
                    german: "PDIcon und das Scannen von neu besuchten Seiten aktivieren. Dieses Fenster wird immer aktiv sein.",
                },
            },
            backgroundIndication: {
                title: {
                    english: "Color background",
                    german: "Hintergrund einf&auml;rben",
                },
                explanation: {
                    english:
                        "For detected malicious websites: color background red",
                    german: "Bei erkannten sch&auml;dlichen Webseiten: Hintergrund rot einf&auml;rben",
                },
            },
            shareData: {
                title: {
                    english: "Share Statistics",
                    german: "Statistik teilen",
                },
                explanation: {
                    english:
                        "PhishingDetector is a study. Please help us by sharing anonymous data.",
                    german: "PhishingDetector ist eine Studie. Bitte hilf uns, indem du anonyme Daten mit uns teilst.",
                },
            },
            language: {
                english: "Language",
                german: "Sprache",
            },
        },
        infoBox: {
            headline: {
                english: "How does it work?",
                german: "Wie funktioniert es?",
            },
            infoText: {
                english:
                    "English: PhishingDetector uses blacklists and whitelists for known sites. If a website is not on these lists, a virus scan is retrieved from virustotal.com.",
                german: "PhishingDetector benutzt Black- sowie Whitelists f&uuml;r bekannte Seiten. Ist eine Webseite nicht auf diesen Listen vorhanden, wird ein Virenscan von virustotal.com abgerufen.",
            },
        },
        prolific: {
            reset: {
                english:
                    'WARNING: Entering "none" in the next step will not delete your ID, but reset the visualized value to the default value. If you do not wish to share data, please disable the option "Share Statistics".',
                german: 'ACHTUNG: Wenn Sie im naechsten Schritt "none" eingeben, wird Ihre ID nicht gelöscht, sondern die Anzeige wird auf den Ursprungswert zurueckgesetzt. Wenn Sie keine Daten teilen moechten, deaktivieren Sie bitte die Option "Statistik teilen".',
            },
        },
    },
};
