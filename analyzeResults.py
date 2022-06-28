#Analyze PDStats
from gettext import install
from os import walk
from datetime import datetime

import numpy as np
import matplotlib.pyplot as plt

import statistics
import time
import shutil
import copy
import os

folderPathRAW = "C:/Users/flori/OneDrive/Dokumente/LMU/Masterarbeit/PhishingDetectorResults/RAW"
folderPath = "C:/Users/flori/OneDrive/Dokumente/LMU/Masterarbeit/PhishingDetectorResults"#Enter folder path of files here


########################################### FINAL PROCESSING ############################################



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
            return idx - 10

def getActivityArray(fileReadlines):
    activityArray = []
    numberActions = getNumberActivities(fileReadlines)

    #go through every action and put it into array
    for idx in range(numberActions + 1):
        line = fileReadlines[idx + 9].rstrip() #as the first 9 lines are not part of the injection array
        a = True
        #Make sure the ID is correct #Deprecated, as files are copied into each other
        #if(not int(fileReadlines[idx + 9].split(",")[1]) == idx):
        #    raise Exception("ID value not as expected")
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
            if(not currentPage in pageArray):
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

def getPopupsPerType(activityArray, type):
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

def getVTTPageInits(activityArray):
    numberVisits = 0
    for entry in activityArray:
        if(entry[6] == "www.virustotal.com"):
            numberVisits += 1
    return numberVisits

def getVTTPageInitsNewTab(activityArray):
    numberVisits = 0
    knownTabs = [0,0,0]
    i = 0
    for entry in activityArray:
        if(entry[6] == "www.virustotal.com"):
            if(entry[5] in knownTabs):
                continue
            else:
                knownTabs[i] = entry[5]
                i += 1
                i = i % 3
            numberVisits += 1
    return numberVisits


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

def getDowntime(installationDate, lastUploadDate, activityArray):
    #Installationdate is factor 1000 time.time()
    maxTimePossible = time.time()*1000 - installationDate #possible time in seconds
    timeDown = 0
    for idx, entry in enumerate(activityArray):
        if(entry[2] == "PDactivationStatus set to false" or entry[2] == "PDShareData set to false"):
            reason = entry[2]
            dateDown = entry[0]
            for idy, entry in enumerate(activityArray[idx+1:]):
                if((reason == "PDShareData set to false" and entry[2] == "PDactivationStatus set to false") or entry[2] == "PDactivationStatus set to true" or entry[2] == "PDShareData set to true" or reason == "PDactivationStatus set to false"):
                    dateUp = entry[0]
                    timeDown += (dateUp - dateDown)
                    break
    timeDown += (time.time()*1000 - lastUploadDate)
    if(timeDown / maxTimePossible > 1 or timeDown < 0.001):#This is e.g. for Google's testing when they set the date into the future
        timeDown = 1
    return timeDown

def main():
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

    numberVTTVisits = 0
    numberVTTVisitsNewTab = 0
    numberVTTVisitsNewTabPerUser = []

    downtimes = []
    downtimesWithProlificID = []
    downtimesPercentages = []
    meanDowntime = 0

    for idx, participant in enumerate(participantResultsFilesArray):
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
        numberPopupsSafe += len(getPopupsPerType(activityArray, "safe"))
        numberPopupsSafePerUser += [getPopupsPerType(activityArray, "safe")]
        numberPopupsUnknown += len(getPopupsPerType(activityArray, "unknown"))
        numberPopupsUnknown += len(getPopupsPerType(activityArray, "none"))
        numberPopupsUnknownPerUser += [getPopupsPerType(activityArray, "unknown") + getPopupsPerType(activityArray, "none")]
        numberPopupsWarning += len(getPopupsPerType(activityArray, "warning"))
        numberPopupsWarningPerUser += [getPopupsPerType(activityArray, "warning")]

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

        numberVTTVisits += getVTTPageInits(activityArray)
        numberVTTVisitsNewTabPerUser += [getVTTPageInitsNewTab(activityArray)]
        numberVTTVisitsNewTab += numberVTTVisitsNewTabPerUser[idx]

        downtimes += [getDowntime(generalInformation[0][0], activityArray[-1][0], activityArray)]
        downtimesPercentages += [downtimes[idx] / (time.time()*1000 - generalInformation[0][0])]
        downtimesWithProlificID += [[participant.split("_")[2], downtimesPercentages[idx]]]



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

    numberVTTVisitsNewTabMean = numberVTTVisitsNewTab / numberParticipants
    numberVTTVisitsNewTabMedian = statistics.median(numberVTTVisitsNewTab)

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

    downtimesWithProlificID = sorted(downtimesWithProlificID)
    numberUpMoreThan60Percent = np.asarray(downtimesPercentages)
    numberUpMoreThan60Percent = (numberUpMoreThan60Percent < 0.4)
    numberUpMoreThan60Percent = numberUpMoreThan60Percent.sum()

    time_end = time.time()
    print("Time elapsed for analyzing: " + str(round(time_end - time_start)) + "s")
    print("Ende")


############################################## PREPROCESSING ############################################


def preprocessingCombineFiles():
    allFiles = []
    for (dirpath, dirnames, filenames) in walk(folderPathRAW):
        allFiles.extend(filenames)
    allFiles.sort(reverse=True)
    while(not allFiles == []):
        processFiles = []
        processFiles.append(allFiles[0])
        id = allFiles[0].split("_")[1]
        allFiles.pop(0)
        #Find all corresponding files
        lookupCopy = copy.deepcopy(allFiles)
        for file in lookupCopy:
            if(file.split("_")[1] == id):
                processFiles.append(file)
                allFiles.pop(0)
        #Combine all files for one user
        if(len(processFiles) == 1):
            source = folderPathRAW + "/" + processFiles[0]
            destination = folderPath + "/" + processFiles[0]
            shutil.copyfile(source, destination)
        else:
            indexFile = open(folderPathRAW + "/" + processFiles[0])
            indexFile = indexFile.readlines()

            activityArray = getActivityArray(indexFile)
            timestampArray = []
            knownPages = getKnownPagesArray(indexFile)
            knownPagesSingle = []
            for page in knownPages:
                knownPagesSingle += [page[0]]
            for line in activityArray:
                timestampArray += [line[0]]

            file = ""
            #check if there are new entries
            for file in processFiles[1:]:
                print("Accessed file " + file)

                file = open(folderPathRAW + "/" + file)
                file = file.readlines()

                if(not file[1] == indexFile[1]):
                    print("Error: Init datum wrong!!!")

                activityArrayNew = getActivityArray(file)
                for lineNew in activityArrayNew:
                    if(not (lineNew[0] in timestampArray)):
                        activityArray.append(lineNew)
                        timestampArray += [lineNew[0]]
                
                knownPagesNew = getKnownPagesArray(file)
                for pageNew in knownPagesNew:
                    if(not(pageNew[0] in knownPagesSingle)):
                        knownPages += [pageNew]
                        knownPagesSingle += [pageNew[0]]

            #build new activity Array and assign IDs
            activityArray = sorted(activityArray)
            for idx, x in enumerate(activityArray):
                activityArray[idx] = [x[0], idx, x[2], x[3], x[4], x[5], x[6]]
            #Build new file
            newFileString = ""
            for line in range(9):
                newFileString += file[line]
            for x in activityArray:
                newFileString += str(x[0]) + "," + str(x[1]) + "," + x[2] + "," + x[3] + "," + x[4] + "," + x[5] + "," + x[6] + "\n"

            #Append information and known pages
            newFileString += "---End of injections---\n\n\nCurrently known pages:\n"
            newFileString += str(len(knownPages)) +  "\n"
            for page in knownPages:
                newFileString += page[0] + "," + page[1] + "," + page[2] + "," + str(page[3]) + "\n"
            
            #write to file
            with open(folderPath + "/" + processFiles[0], 'w') as f:
                f.write(newFileString)


def preprocessingDeleteSmallFiles():
    deletedFiles = 0
    ## Delete Files with < 20 entries
    allFiles = []
    for (dirpath, dirnames, filenames) in walk(folderPath):
        allFiles.extend(filenames)
        break
    for fileName in allFiles:
        file = open(folderPath + "/" + fileName)
        file = file.readlines()
        activityArray = getActivityArray(file)
        if(len(activityArray) < 20):
            if os.path.exists(folderPath + "/" + fileName):
                os.remove(folderPath + "/" + fileName)
                deletedFiles += 1
                print("filename" + " deleted due to less than 20 entries")
    print(str(deletedFiles) + " files deleted due to less than 20 entries")
   

############################################### MAIN ROUTINE ############################################
################################# (Start Processing and evaluation) #####################################



def preprocessing():
    time_start = time.time()

    #preprocessingCombineFiles()
    #preprocessingDeleteSmallFiles()

    time_end = time.time()
    print("Time elapsed for preprocessing: " + str(round(time_end - time_start)) + "s")

#preprocessing()

time_start = time.time()

main()