#Analyze PDStats
from gettext import install
from os import walk
from datetime import datetime

import numpy as np
import matplotlib.pyplot as plt

import statistics

folderPath = "C:/Users/flori/OneDrive/Dokumente/LMU/Masterarbeit/PhishingDetectorResults"#Enter folder path of files here


participantResultsFilesArray = []
for (dirpath, dirnames, filenames) in walk(folderPath):
    participantResultsFilesArray.extend(filenames)
    break

""" #Should be done manually
def correctStatsFiles():
    for idx, file in enumerate(participantResultsFilesArray):
        for i in range(len(participantResultsFilesArray) - idx - 1):
            a = 0
            if(file.split('_')[1] == participantResultsFilesArray[idx + i + 1].split('_')[1]):
                print("Hello")
    print("donothing")

correctStatsFiles() """

#return general information [Plugin initialized, lastSafe, lastUnknown, lastWarning, lastUpload]
#each with [timestamp, humanReadable Time]
def getGeneralInformation(fileReadlines):
    generalStatistics = []
    for i in range(5):
        humanread=str(datetime.fromtimestamp(int(fileReadlines[i+1].split(":")[0])/1000))
        generalStatistics += [[int(fileReadlines[i+1].split(":")[0]), humanread]]
    return generalStatistics

def getNumberActivities(fileReadlines):
    #Find out how many actions there are
    for idx, line in enumerate(fileReadlines):
        if(line == "---End of injections---\n"):
            return int(fileReadlines[idx-1].split(",")[1]) + 1

def getActivityArray(fileReadlines):
    activityArray = []
    numberActions = getNumberActivities(fileReadlines)

    #go through every action and put it into array
    for idx in range(numberActions):
        line = fileReadlines[idx + 9].rstrip() #as the first 9 lines are not part of the injection array
        a = True
        #Make sure the ID is correct
        if(not int(fileReadlines[idx + 9].split(",")[1]) == idx):
            raise Exception("ID value not as expected")
        #put line into activityArray
        entryForActivityArray = [int(line.split(",")[0])] #Timestamp
        entryForActivityArray += [str(datetime.fromtimestamp(int(line.split(",")[0])/1000))] #Human readable time
        entryForActivityArray += [line.split(",")[2]] #action
        entryForActivityArray += [line.split(",")[3]] #security estimation
        entryForActivityArray += [line.split(",")[4]] #estimation reason
        entryForActivityArray += [line.split(",")[5]] #tab ID
        entryForActivityArray += [line.split(",")[6]] #domain
        activityArray += [entryForActivityArray]
    a = True
    return activityArray

#receives the activity array and replaces empty Strings ("") through "none"
def activityArrayReplaceEmptyWithNone(activityArray):
    for idx, row in enumerate(activityArray):
        for idy, cell in enumerate(row):
            if(cell == ""):
                activityArray[idx][idy] = 'none'
    return activityArray

#Fill in blanks that are known but not put in stats
def correctActivityInfo(activityArray):
    for idx, row in enumerate(activityArray):
        if(row[2] == "popup"):
            for i in range(idx):
                if(activityArray[idx - (i+1)][2] == "tabChange"):
                    row[5] = activityArray[idx - (i+1)][5]
                    break
        if(row[3] == 'none' or row[4] == 'none' or row[6] == 'none'):
            for i in range(idx):
                if(activityArray[idx - (i+1)][5] == row[5] and not (activityArray[idx - (i+1)][3] == 'none')):
                    row[3] = activityArray[idx - (i+1)][3]
                    row[4] = activityArray[idx - (i+1)][4]
                    row[6] = activityArray[idx - (i+1)][6]
                    break
    """     for row in activityArray:
        if(row[2] == "popup"):
            print(row) """
    return activityArray

def getNumberOfKnownPages(fileReadlines):
    #Return the value of currently known pages
    for idx, line in enumerate(fileReadlines):
        if(line == "Currently known pages:\n"):
            return int(fileReadlines[idx+1].rstrip())

def getKnownPagesArray(fileReadlines):
    pageArray = []
    goDown = True
    for line in fileReadlines:
        if(goDown): 
            if(line == "---Begin list of known pages [site, status, reason, (if applicable VTT results)]---\n" ):
                goDown = False
        else:
            line = line.rstrip()
            currentPage = [line.split(",")[0]]
            currentPage += [line.split(",")[1]]
            currentPage += [line.split(",")[2]]
            VTTArray = []
            try:
                VTTArray += [int(line.split(",")[3])]
                VTTArray += [int(line.split(",")[4])]
                VTTArray += [int(line.split(",")[5])]
            except:
                VTTArray = None
            currentPage += [VTTArray]
            pageArray += [currentPage]
    return pageArray

def getNumberOfPageInits(activityArray):
    inits = 0
    for line in activityArray:
        if(line[2] == "PDSiteFunctionalityInitiated"):
            inits += 1
    return inits

def getNumberOfPopupViews(activityArray):
    visits = 0
    for line in activityArray:
        if(line[2] == "popup"):
            visits += 1
    return visits

def getRequestedActivityType(activityArray, type):
    typeArray = []
    for entry in activityArray:
        if(entry[2] == type):
            typeArray += [entry]
    return typeArray

def getPopupsPerType(type):
    popupTypeArray = []
    popups = getRequestedActivityType(activityArray, "popup")
    for entry in popups:
        if(entry[3] == type):
            popupTypeArray += [entry]
    return popupTypeArray

def getIconsPerType(activityArray, type):
    icons = getRequestedActivityType(activityArray, "icon")
    iconArray = []
    for icon in icons:
        if(icon[3] == type):
            iconArray += [icon]
    return iconArray

def getIconsAttentionTest(activityArray):
    icons = getRequestedActivityType(activityArray, "icon")
    iconArray = []
    for icon in icons:
        if(icon[4] == "attentionTest"):
            iconArray += [icon]
    return iconArray

def getHoverDurations(activityArray):
    #At PDSiteFunctionalityInitiated the Tab ID has to be the same, as loading an older page may finish before opening a new one
    allowedExits = ["unhover", "leaveClick", "popup", "PDSiteFunctionalityInitiated", "windowUnload", "tabChange"]
    hoverArray = []
    hoverDurationArray = []
    for idx, entry in enumerate(activityArray):
        if(entry[2] == "hover"):
            #hoverArray = Array where there is [hoverActivity, duration, unloadType (unhover, Tab Change etc)]
            #find unhover Action
            i = 1
            while(True):
                if(len(activityArray) < idx + i + 1): break
                if any(activityArray[idx + i][2] in s for s in allowedExits):
                    if(not(activityArray[idx + i][2] == "PDSiteFunctionalityInitiated") or activityArray[idx + i][5] == entry[5]):
                        hoverDuration = int(activityArray[idx+i][0]) - int(entry[0])
                        entry += [hoverDuration]
                        hoverArray += [entry]
                        hoverDurationArray += [hoverDuration]
                        break
                i += 1
    if(hoverDurationArray == []): hoverDurationArray = [None]
    
    return hoverArray, hoverDurationArray

#returns the value of the arithmetic medium of hovers that last less than 1 minute
#(we assume that hovers > 1 minute are left windows etc)
def getMediumHoverDuration(hoverArray):
    totalTime = 0
    numberHovers = 0
    for entry in hoverArray:
        if(entry[7] < 60000): 
            totalTime += entry[7]
            numberHovers += 1
    if(numberHovers > 0):
        return totalTime / numberHovers
    return 0

def getActivitiesPerDomain(activityArray):
    domainArray = []
    knownDomains = []
    for entry in activityArray:
        #if domain has no entry yet, create one
        if(not entry[6] in knownDomains):
            knownDomains += [entry[6]]
            domainArray += [[entry[6], [entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]]]]
        #otherwise look for the domain's entry and add the activity
        else:
            for domain in domainArray:
                if(entry[6] == domain[0]):#found the web page
                    domain += [[entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]]]
    return domainArray

def getActivitiesPerTab(activityArray):
    tabArray = []
    knownTabs = []
    for entry in activityArray:
        #if tab has no entry yet, create one
        if(not entry[5] in knownTabs):
            knownTabs += [entry[5]]
            tabArray += [[entry[5], [entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]]]]
        #otherwise look for the domain's entry and add the activity
        else:
            for tab in tabArray:
                if(entry[5] == tab[0]):#found the web page
                    tab += [[entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]]]
    return tabArray

def getAttentionTestTabs(activityArray):
    tabArray = []
    knownTabs = []
    for entry in activityArray:
        if(not entry[4] == "attentionTest"): continue
        #if tab has no entry yet, create one
        if(not entry[5] in knownTabs):
            knownTabs += [entry[5]]
            tabArray += [[entry[5], [entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]]]]
        #otherwise look for the domain's entry and add the activity
        else:
            for tab in tabArray:
                if(entry[5] == tab[0]):#found the web page
                    tab += [[entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]]]
    return tabArray

#requires an array as produced by getActivitiesPerDomain(activityArray) and either "safe" , "unknown", or "warning"
def whatWasDoneAfterIconInsertion(tabArray, safetyType):
    actionArray = []
    for tab in tabArray:
        tabHistory = tab[1:]
        for idx, entry in enumerate(tabHistory):
            if(entry[2] == "icon" and entry[3] == safetyType):
                allowedActions = ["windowUnload", "PDSiteFunctionalityInitiated", "Change: Set to Safe", "Change: Set to warning", "popup", "hover", "unhover", "markSafe", "markSafeYes", "markSafeNo"]
                endActions = ["windowUnload", "PDSiteFunctionalityInitiated"]
                #allowed actions we want to track are
                # - windowUnload --> Verlassen der Webseite (oder refresh)
                # - PDSiteFunctionalityInitiated --> Neue Webseite aufgerufen durch Klicken auf der Seite --> Auf Domain geblieben
                # - popup -> windowUnload; PDSiteFunctionalityInitiated; markSafe -> markSafeYes; markSaffeNo
                # - hover -> windowUnload; PDSiteFunctionalityInitiated
                # - icon -> reestimation of the security information 
                # only when window is unloaded or a new page is loaded, the action is done
                foundNextAction = False
                i = 1
                actionForArray = []
                while(not foundNextAction):
                    if(idx + i + 1 > len(tabHistory)): 
                        actionForArray += [[0, "none"]]
                        foundNextAction = True
                    elif any(tabHistory[idx + i][2] in s for s in allowedActions):
                        actionForArray += [[tabHistory[idx + i][0] - entry[0], tabHistory[idx + i][2], entry[6], tabHistory[idx + i][6]]]
                        if any(tabHistory[idx + i][2] in s for s in endActions):
                            foundNextAction = True
                    i += 1
                actionArray += [actionForArray]
    return actionArray
    #[[duration, action, webiteFrom, websiteTo]]

def getCumulatedInfos(actionsAfterTypeArray, index):
    cumulatedArray = []
    knownActions = []

    #preprocessing, put "Same" at the end, if action stays on the same page  
    for participant in actionsAfterTypeArray:
        for insertion in participant:
            for entry in insertion:
                if(entry[1] == "none"): continue
                if(entry[2] == entry[3] and (entry[1] == "windowUnload" or entry[1] == "PDSiteFunctionalityInitiated")):
                    entry[1] += "Same"

    for participant in actionsAfterTypeArray:
        for insertion in participant:
            entry = insertion[index]
            if(not entry[1] in knownActions):
                knownActions += [entry[1]]
                cumulatedArray += [[entry[1],1]]
            else:
                for idx, action in enumerate(cumulatedArray):
                    if(action[0] == entry[1]):
                        cumulatedArray[idx][1] += 1
    return cumulatedArray


installationDates = []

numberParticipants = len(participantResultsFilesArray)
numberActionsPerformed = 0
numberActionsPerformedPerUser = []

numberPDInitiates = 0
numberPDInitiatesPerUser = []

numberIconsShowed = 0
numberIconsShowedPerUser = []

numberSafeIcons = 0
numberWarningIcons = 0
numberSafeIconsPerUser = []
numberWarningIconsPerUser = []

numberAttentionTests = 0
numberAttentionTestsPerUser = []
attentionTestsPerUser = []

numberHovers = 0
numberHoversPerUser = []

durationHoverPerUserMean = []
durationHoverPerUserMedian = []

numberPopups = 0
numberPopupsPerUser = []
numberPopupsSafe = 0
numberPopupsSafePerUser = []
numberPopupsUnknown = 0
numberPopupsUnknownPerUser = []
numberPopupsWarning = 0
numberPopupsWarningPerUser = []

numberPopupIconChanged = 0
numberPopupIconChangedSafe = 0
numberPopupIconChangedWarning = 0
numberPopupIconChangedPerUser = []
numberPopupIconChangedSafePerUser = []
numberPopupIconChangedWarningPerUser = []

numberKnownPages = 0
numberKnownPagesPerUser = []

actionsAfterIconSafeInsertion = []
actionsAfterIconUnknownInsertion = []
actionsAfterIconWarningInsertion = []
actionsAfterAttentionIconInsertion = []
actionsAfterAttentionIconCumulated = []

for participant in participantResultsFilesArray:
    file = open(folderPath + "/" + participant)
    file = file.readlines()

    generalInformation = getGeneralInformation(file)
    installationDates += [generalInformation[0][0]]

    activityArray = getActivityArray(file)
    activityArray = activityArrayReplaceEmptyWithNone(activityArray)
    activityArray = correctActivityInfo(activityArray)
    numberActionsPerformed += len(activityArray)
    numberActionsPerformedPerUser += [len(activityArray)]

    numberPDInitiates += len(getRequestedActivityType(activityArray, 'PDSiteFunctionalityInitiated'))
    numberPDInitiatesPerUser += [len(getRequestedActivityType(activityArray, 'PDSiteFunctionalityInitiated'))]

    hoverArray, hoverDurationsArray = getHoverDurations(activityArray)
    numberHovers += len(hoverArray)
    numberHoversPerUser += [len(hoverArray)]
    if(not hoverDurationsArray == [None]):
        durationHoverPerUserMean += [round(statistics.mean(hoverDurationsArray))]
        durationHoverPerUserMedian += [round(statistics.median(hoverDurationsArray))]

    getActivitiesPerDomain(activityArray)
    domainArray = getActivitiesPerDomain(activityArray)
    tabArray = getActivitiesPerTab(activityArray)

    icons = getRequestedActivityType(activityArray, "icon")
    numberIconsShowed += len(icons)
    numberIconsShowedPerUser += [len(icons)]

    attentionTests = getIconsAttentionTest(activityArray)
    numberAttentionTests += len(attentionTests)
    numberAttentionTestsPerUser += [len(attentionTests)]
    attentionTestsPerUser += [attentionTests]
    attentionTestTabs = getAttentionTestTabs(activityArray)

    iconsSafe = getIconsPerType(activityArray, "safe")
    numberSafeIcons += len(iconsSafe)
    numberSafeIconsPerUser += [len(iconsSafe)]
    iconsWarning = getIconsPerType(activityArray, "warning")
    numberWarningIcons += len(iconsWarning)
    numberWarningIconsPerUser += [len(iconsWarning)]

    popups = getRequestedActivityType(activityArray, "popup")
    numberPopups += len(popups)
    numberPopupsPerUser += [len(popups)]
    numberPopupsSafe += len(getPopupsPerType("safe"))
    numberPopupsSafePerUser += [getPopupsPerType("safe")]
    numberPopupsUnknown += len(getPopupsPerType("unknown"))
    numberPopupsUnknown += len(getPopupsPerType("none"))
    numberPopupsUnknownPerUser += [getPopupsPerType("unknown") + getPopupsPerType("none")]
    numberPopupsWarning += len(getPopupsPerType("warning"))
    numberPopupsWarningPerUser += [getPopupsPerType("warning")]

    numberPopupIconChanged += len(getRequestedActivityType(activityArray, 'Popup icon set green'))
    + len(getRequestedActivityType(activityArray, 'Popup icon set red'))
    numberPopupIconChangedPerUser += [len(getRequestedActivityType(activityArray, 'Popup icon set green'))
    + len(getRequestedActivityType(activityArray, 'Popup icon set red'))]
    numberPopupIconChangedSafe += len(getRequestedActivityType(activityArray, 'Popup icon set green'))
    numberPopupIconChangedWarning += len(getRequestedActivityType(activityArray, 'Popup icon set red'))
    numberPopupIconChangedSafePerUser += [len(getRequestedActivityType(activityArray, 'Popup icon set green'))]
    numberPopupIconChangedWarningPerUser += [len(getRequestedActivityType(activityArray, 'Popup icon set red'))]
    

    knownPagesArray = getKnownPagesArray(file)
    numberKnownPages += len(knownPagesArray)
    numberKnownPagesPerUser += [len(knownPagesArray)]

    actionsAfterIconSafeInsertion += [whatWasDoneAfterIconInsertion(tabArray, "safe")]
    actionsAfterIconUnknownInsertion += [whatWasDoneAfterIconInsertion(tabArray, "unknown")]
    actionsAfterIconWarningInsertion += [whatWasDoneAfterIconInsertion(tabArray, "warning")]
    actionsAfterAttentionIconInsertion += [whatWasDoneAfterIconInsertion(attentionTestTabs, "safe")]


installationDates = sorted(installationDates)
installationDateFirst = str(datetime.fromtimestamp(int(installationDates[0]/1000)))
installationDateLast = str(datetime.fromtimestamp(int(installationDates[-1]/1000)))

numberActionsPerformedPerUserMean = numberActionsPerformed / numberParticipants
numberActionsPerformedPerUserMedian = statistics.median(numberActionsPerformedPerUser)

numberPDInitiatesMean = numberPDInitiates / numberParticipants
numberPDInitiatesMedian = statistics.median(numberPDInitiatesPerUser)

numberIconsMean = numberIconsShowed / numberParticipants
numberIconsMedian = statistics.median(numberIconsShowedPerUser)
numberIconsPer1000PageViews = round((numberIconsShowed / numberPDInitiates) * 1000, 2)

numberSafeIconsMean = numberSafeIcons / numberParticipants
numberSafeIconsMedian = statistics.median(numberSafeIconsPerUser)
numberWarningIconsMean = numberWarningIcons / numberParticipants
numberWarningIconsMedian = statistics.median(numberWarningIconsPerUser)

numberHoversMean = numberHovers / numberParticipants
numberHoversMedian = statistics.median(numberHoversPerUser)
#durationHoverMean = round(statistics.mean(durationHoverPerUserMean))
#durationHoverMedian = round(statistics.median(durationHoverPerUserMedian))

numberPopupsMean = numberPopups / numberParticipants
numberPopupsMedian = statistics.median(numberPopupsPerUser)

numberKnownPagesMean = numberKnownPages / numberParticipants
numberKnownPagesMedian = statistics.median(numberKnownPagesPerUser)

actionsAfterAttentionIconCumulated = getCumulatedInfos(actionsAfterAttentionIconInsertion, 0)
actionsAfterAttentionIconFinalActionCumulated = getCumulatedInfos(actionsAfterAttentionIconInsertion, -1)
actionsAfterSafeIconCumulated = getCumulatedInfos(actionsAfterIconSafeInsertion, 0)
actionsAfterSafeIconFinalActionCumulated = getCumulatedInfos(actionsAfterIconSafeInsertion, -1)
actionsAfterWarningIconCumulated = getCumulatedInfos(actionsAfterIconWarningInsertion, 0)
actionsAfterWarningIconFinalActionCumulated = getCumulatedInfos(actionsAfterIconWarningInsertion, -1)
actionsAfterUnknownIconCumulated = getCumulatedInfos(actionsAfterIconUnknownInsertion, 0)
actionsAfterUnknownIconFinalActionCumulated = getCumulatedInfos(actionsAfterIconUnknownInsertion, -1)

print("Ende")
