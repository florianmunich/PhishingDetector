#Analyze PDStats
from gettext import install
from os import walk
from datetime import datetime

import numpy as np
import matplotlib.pyplot as plt

import statistics

folderPath = ""#Enter folder path of files here


participantResultsFilesArray = []
for (dirpath, dirnames, filenames) in walk(folderPath):
    participantResultsFilesArray.extend(filenames)
    break

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

def getIconsPerType(activityArray, type):
    icons = getRequestedActivityType(activityArray, "icon")
    iconArray = []
    for icon in icons:
        if(icon[3] == type):
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

#requires an array as produced by getActivitiesPerDomain(activityArray) and either "safe" , "unknown", or "warning"
def whatWasDoneAfterIconInsertion(tabArray, safetyType):
    actionArray = []
    for tab in tabArray:
        tabHistory = tab[1:]
        for idx, entry in enumerate(tabHistory):
            if(entry[2] == "icon" and entry[3] == safetyType):
                allowedActions = ["windowUnload", "PDSiteFunctionalityInitiated"]
                #allowed actions we want to track are
                # - windowUnload --> Verlassen der Webseite (oder refresh)
                # - PDSiteFunctionalityInitiated --> Neue Webseite aufgerufen durch Klicken auf der Seite --> Auf Domain geblieben
                foundNextAction = False
                i = 1
                while(not foundNextAction):
                    if(idx + i + 1 > len(tabHistory)): 
                        actionArray += [[0, "none"]]
                        foundNextAction = True
                    elif any(tabHistory[idx + i][2] in s for s in allowedActions):
                        actionArray += [[tabHistory[idx + i][0] - entry[0], tabHistory[idx + i][2], entry[6], tabHistory[idx + i][6]]]
                        foundNextAction = True
                    i += 1
    return actionArray



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

numberHovers = 0
numberHoversPerUser = []

durationHoverPerUserMean = []
durationHoverPerUserMedian = []

numberPopups = 0
numberPopupsPerUser = []

numberKnownPages = 0
numberKnownPagesPerUser = []

for participant in participantResultsFilesArray:
    file = open(folderPath + "/" + participant)
    file = file.readlines()

    generalInformation = getGeneralInformation(file)
    installationDates += [generalInformation[0][0]]

    activityArray = getActivityArray(file)
    activityArray = activityArrayReplaceEmptyWithNone(activityArray)
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

    iconsSafe = getIconsPerType(activityArray, "safe")
    numberSafeIcons += len(iconsSafe)
    numberSafeIconsPerUser += [len(iconsSafe)]
    iconsWarning = getIconsPerType(activityArray, "warning")
    numberWarningIcons += len(iconsWarning)
    numberWarningIconsPerUser += [len(iconsWarning)]

    popups = getRequestedActivityType(activityArray, "popup")
    numberPopups += len(popups)
    numberPopupsPerUser += [len(popups)]

    knownPagesArray = getKnownPagesArray(file)
    numberKnownPages += len(knownPagesArray)
    numberKnownPagesPerUser += [len(knownPagesArray)]

    whatWasDoneAfterIconInsertion(tabArray, "safe")

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
durationHoverMean = round(statistics.mean(durationHoverPerUserMean))
durationHoverMedian = round(statistics.median(durationHoverPerUserMedian))

numberPopupsMean = numberPopups / numberParticipants
numberPopupsMedian = statistics.median(numberPopupsPerUser)

numberKnownPagesMean = numberKnownPages / numberParticipants
numberKnownPagesMedian = statistics.median(numberKnownPagesPerUser)

print("Ende")





















def analzyeFileNew(fileNumber):
    currentFile = open(folderPath + "/" + participantResultsFilesArray[fileNumber])
    currentFile = currentFile.readlines()
    installationDateInt = currentFile[1].rstrip().split(":")[0]
    installationDateString = currentFile[1].rstrip().split(" ")[1]

    generalStatistics = []
    generalStatisticsHumanRead = []
    injections = []
    numberKnownPages = 0
    knownPages = []

def analyzeFile(fileNumber):
    currentFile = open(folderPath + "/" + participantResultsFilesArray[fileNumber])
    currentFile = currentFile.readlines()
    installationDateInt = currentFile[1].rstrip().split(":")[0]
    installationDateString = currentFile[1].rstrip().split(" ")[1]

    generalStatistics = []
    generalStatisticsHumanRead = []
    injections = []
    numberKnownPages = 0
    knownPages = []

    checkInjection = False
    checkNumberKnownPages = False
    checkKnownPages = False
    checkGeneralStatistics = False
    for line in currentFile:
        if(line == "\n"): checkGeneralStatistics = False
        elif(line == "[Plugin initialized, lastSafe, lastUnknown, lastWarning, lastUpload]\n"): checkGeneralStatistics = True
        elif(checkGeneralStatistics):
            timestamp = int(line.split(":")[0])
            generalStatistics += [timestamp]
            generalStatisticsHumanRead += [str(datetime.fromtimestamp(int(timestamp/1000)))]
        lineSimple = line.rstrip()
        if(lineSimple == "---End of injections---"): checkInjection = False
        elif(checkInjection):
            injections += [[lineSimple.split(",")[0], lineSimple.split(",")[1], lineSimple.split(",")[2], lineSimple.split(",")[3], lineSimple.split(",")[4], lineSimple.split(",")[5]]]
        elif(lineSimple == "---Begin list of injections [timestamp, id, action performed, siteStatus, reason, pageURL]---"):
            checkInjection = True
        elif(checkNumberKnownPages): 
            numberKnownPages = int(lineSimple)
            checkNumberKnownPages = False
        elif(lineSimple == "Currently known pages:"): checkNumberKnownPages = True
        elif(checkKnownPages):
            pageToAdd = [lineSimple.split(",")[0], lineSimple.split(",")[1], lineSimple.split(",")[2]]
            try:
                pageToAdd += [lineSimple.split(",",3)[3]]
            except:
                pageToAdd += [""]
            if(not pageToAdd[3] ==""):
                pageToAdd[3] = [int(pageToAdd[3].split(",")[0]), int(pageToAdd[3].split(",")[1]), int(pageToAdd[3].split(",")[2])]
            else: pageToAdd[3] = []
            knownPages += [pageToAdd]
        elif(lineSimple == "---Begin list of known pages [site, status, reason, (if applicable VTT results)]---"):checkKnownPages = True
    return generalStatistics, generalStatisticsHumanRead, injections, knownPages

def analyzeAllFiles():
    allFiles = []
    for idx, x in enumerate(participantResultsFilesArray):
        generalStatistics, generalStatisticsHumanRead, injections, knownPages = analyzeFile(idx)
        allFiles += [analyzeFile(idx)]
    return allFiles

def getTotalNumbers(allFiles):
    numberParticipants = len(allFiles)
    numberIconSafe = 0
    numberIconWarning = 0
    numberIconUnknown = 0
    numberHoverSafe = 0
    numberHoverUnknown = 0
    numberHoverWarning = 0
    numberPopupClick = 0
    numberPopupSafe = 0
    numberPopupWarning = 0
    numberPopupUnknown = 0
    numberVTTInitiated = 0
    numberPopupIconSafe = 0
    numberPopupIconUnknown = 0
    numberPopupIconWarning = 0
    numberLeaves = 0

    for file in allFiles:
        for stat in file[2]:
            if(stat[2] == "icon"):
                if(stat[3] == "safe"): numberIconSafe += 1
                if(stat[3] == "unknown"): numberIconUnknown += 1
                if(stat[3] == "warning"): numberIconWarning += 1
            elif(stat[2] == "popup"):
                if(stat[3] == "safe"): numberPopupSafe += 1
                if(stat[3] == "unknown"): numberPopupUnknown += 1
                if(stat[3] == "warning"): numberPopupWarning += 1
            elif(stat[2] == "hover"):
                if(stat[3] == "safe"): numberHoverSafe += 1
                if(stat[3] == "safe"): numberHoverSafe += 1
                if(stat[3] == "safe"): numberHoverSafe += 1
            elif(stat[2] == "VTTinitiated"): numberVTTInitiated += 1
            elif(stat[2] == "Popup icon set to green (safeSite)"): numberPopupIconSafe += 1
            elif(stat[2] == "Popup icon set to yellow (unknownSite)"): numberPopupIconUnknown += 1
            elif(stat[2] == "Popup icon set to red (warningSite)"): numberPopupIconWarning += 1
            elif(stat[2] == "leaveClick"): numberLeaves += 1
    return 0

#allFiles = analyzeAllFiles()
#getTotalNumbers(allFiles)