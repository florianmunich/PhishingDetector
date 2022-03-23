import json
from urllib.request import urlopen
import indexMendeleyPyArray

filename = 'safeSites.json'

try:
    jsonFile = open(filename)
    jsonFile.close()
except:
    f = open(filename, 'w')
    f.write('{ "date": "23. Mar 2022", "safeSites": [], "phishingSites": [] }')
    f.close()

safeSitesArray = []
phishSitesArray = []

numberPhishs = 0
numberSafe = 0

def getOldData(safeSitesArray, phishSitesArray, numberSafe, numberPhishs):
    jsonFile = open(filename)
    jsonData = json.load(jsonFile)
    for i in jsonData['safeSites']:
        numberSafe += 1
        safeSitesArray += [i['url']]
    for i in jsonData['phishingSites']:
        numberPhishs += 1
        phishSitesArray += [i['url']]
    return safeSitesArray, phishSitesArray, numberSafe, numberPhishs

def mendeleyData(safeSitesArray, phishSitesArray, numberSafe, numberPhishs):
    mendeleyArray = indexMendeleyPyArray.phishArray

    i = 0
    for page in mendeleyArray:
        i += 1
        #For testing only take first 500 lines
        if(i==200): break
        #if(i%10000 == 0): print(str(i) + " pages from Mendeley are done.")
        if(page[3] == 1):
            #if(numberPhishs < 4): 
            url = page[1].split('/')[2]
            if(not(url in phishSitesArray)):
                phishSitesArray += [url]
                numberPhishs += 1
        else: 
            #if(numberSafe < 4): 
            url = page[1].split('/')[2]
            if(not(url in safeSitesArray)):
                safeSitesArray += [url]
                numberSafe += 1
    return safeSitesArray, phishSitesArray, numberSafe, numberPhishs

def openPhishData(safeSitesArray, phishSitesArray, numberSafe, numberPhishs):
    targetURL = "https://openphish.com/feed.txt"
    data = urlopen(targetURL)
    for url in data:
        url = url.decode().split('/')[2]
        if(not(url in phishSitesArray)):
            phishSitesArray += [url]
            numberPhishs += 1
    return safeSitesArray, phishSitesArray, numberSafe, numberPhishs

def writeJsonFromArrays():
    safeSites = ''
    i = True
    for url in safeSitesArray:
        if(i): 
            safeSites += '{"url": "' + url + '"}'
            i = False
        else: safeSites += ',\n{"url": "' + url + '"}'

    i = True
    phishSites =  ''
    for url in phishSitesArray:
        if(i):
            phishSites += '{"url": "' + url + '"}'
            i = False
        else: phishSites += ',\n{"url": "' + url + '"}'

    textForJson = '{\n'
    textForJson += '"date": "23. Mar 2022",\n'
    textForJson += '"safeSites": [\n'
    textForJson += safeSites
    textForJson += '],\n'
    textForJson += '"phishingSites": [\n'
    textForJson += phishSites
    textForJson += ']\n}'

    with open('safeSites.json', 'w') as f:
        f.write(textForJson)

#Alte Daten abrufen
safeSitesArray, phishSitesArray, numberSafe, numberPhishs = getOldData(safeSitesArray, phishSitesArray, numberSafe, numberPhishs)

print(str(numberPhishs) + " Phishing sites and " + str(numberSafe) + " safe sites loaded from old data.")

#Mendeley Data einfügen
safeSitesArray, phishSitesArray, numberSafe, numberPhishs = mendeleyData(safeSitesArray, phishSitesArray, numberSafe, numberPhishs)
print(str(numberPhishs) + " Phishing sites and " + str(numberSafe) + " safe sites in total after Loading Mendeley.")

#openPhish Daten einfügen
safeSitesArray, phishSitesArray, numberSafe, numberPhishs = openPhishData(safeSitesArray, phishSitesArray, numberSafe, numberPhishs)
print(str(numberPhishs) + " Phishing sites and " + str(numberSafe) + " safe sites in total after loading openPhish-Data.")

#Json schreiben
writeJsonFromArrays()

print("Wrote " + str(numberPhishs) + " Phishing sites and " + str(numberSafe) + " safe sites to json file!")