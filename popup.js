var language = "german";
var texts = "hello";

function createElementWithClass(type, className) {
  const element = document.createElement(type);
  element.className = className;
  return element;
}

function init(){
  var container = createElementWithClass('div', 'popupContainer');
  var identifier = container.appendChild(createElementWithClass('div', 'identifier'));
  var logo = identifier.appendChild(createElementWithClass('div', 'logo'));
  var newItemSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  var newItemPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );
  newItemSVG.setAttribute('fill', '#000000');
  newItemSVG.setAttribute('viewBox', '0 0 172 172');
  newItemSVG.setAttribute('class', 'logo');
  newItemPath.setAttribute(
    'd',
    "M86,17.2c-26.3848,0 -53.82839,5.94609 -53.82839,5.94609l-0.0224,0.0224c-5.35441,1.07186 -9.21013,5.77087 -9.21589,11.23151v45.86667c0,13.18667 3.17824,24.19646 8.0401,33.36979l118.09323,-69.97578v-9.26068c0.00279,-5.47597 -3.86671,-10.18973 -9.23828,-11.25391c0,0 -27.44359,-5.94609 -53.82839,-5.94609zM57.33333,40.13333l8.6,11.46667l-8.6,11.46667l-8.6,-11.46667zM149.06667,56.9862l-111.91198,66.32526c16.78668,22.03354 42.02384,29.91384 44.81406,30.73829c0.27976,0.10814 0.56366,0.20526 0.85104,0.29114c0.0045,0.00126 0.16797,0.05599 0.16797,0.05599h0.04479c0.96727,0.26352 1.96493,0.39905 2.96745,0.40312c1.01752,-0.00013 2.03049,-0.13569 3.01224,-0.40312c0.18813,-0.05493 0.37482,-0.11467 0.55989,-0.17917c3.08872,-0.90331 59.49453,-18.17289 59.49453,-73.95104zM114.66667,97.46667l8.6,11.46667l-8.6,11.46667l-8.6,-11.46667z"
  );
  newItemSVG.appendChild(newItemPath);
  logo.appendChild(newItemSVG);
  var nameExtension = identifier.appendChild(createElementWithClass('div', 'name'));
  nameExtension.innerHTML = 'Phishing Detector';
  iconsRight = identifier.appendChild(createElementWithClass('div', 'iconsRight'));
  var infoImg = iconsRight.appendChild(createElementWithClass('img', 'logoIMG'));
  infoImg.setAttribute('src', 'https://img.icons8.com/ios-glyphs/30/000000/info--v1.png');
  var settings = iconsRight.appendChild(createElementWithClass('img', 'settings'));
  settings.setAttribute('src', 'https://img.icons8.com/ios-filled/30/000000/settings.png');
  container.appendChild(createElementWithClass('div', 'separatorLine'));

  pageInfos = container.appendChild(createElementWithClass('div', 'pageInfos'));
  var currentPageText = pageInfos.appendChild(createElementWithClass('div', 'currentPageText'));
  var currentPageColored = pageInfos.appendChild(createElementWithClass('div', 'currentPageColored'));
  var currentPageIMG = currentPageColored.appendChild(createElementWithClass('img', 'currentPageIMG'));
  currentPageIMG.setAttribute('src', 'https://img.icons8.com/ios-glyphs/30/000000/knight-shield.png');
  var currentPageShortIndication = currentPageColored.appendChild(createElementWithClass('div', 'currentPageShortIndication'));
  var currentPageJustification = pageInfos.appendChild(createElementWithClass('div', 'currentPageJustification'));
  currentPageText.innerHTML = texts.texts.currentPage.currentPageText[language];
  var warningType;
  var warningReason;
  var currentSite;
  chrome.storage.sync.get(['key'], function(result) {
    console.log('Value currently is ' + result.key);
    currentSite = result.key[0];
    warningType = result.key[1];
    warningReason = result.key[2];
    setIdentifierText(pageInfos, currentSite, warningType, warningReason);
  });
  

  container.appendChild(createElementWithClass('div', 'separatorLine'));
  document.body.appendChild(container);
}



function setIdentifierText(htmlObject, currentSite, warningType, warningReason){
  if(warningReason == "blacklist"){
    htmlObject.childNodes[2].innerHTML = currentSite + texts.texts.currentPage.justification.severe.blacklist[language];
    htmlObject.childNodes[1].childNodes[1].innerHTML = texts.texts.currentPage.shortIndication.severe[language];
  }
  if(warningReason == "whitelist"){
    htmlObject.childNodes[2].innerHTML = currentSite + texts.texts.currentPage.justification.safe.whitelist[language];
    htmlObject.childNodes[1].childNodes[1].innerHTML = texts.texts.currentPage.shortIndication.safe[language];
  }
}

//Beinhaltet alle Texte der Extension auf Englisch und Deutsch
texts = {
  "version": "1.0",
  "languages": {
      "english": true,
      "german": true
  },
  "texts": {
    "currentPage": {
      "currentPageText": {
        "english": "CURRENT PAGE",
        "german": "AKTUELLE SEITE"
      },
      "shortIndication": {
        "severe": {
          "english": "Fradulent Site",
          "german": "Sch&auml;dliche Seite"
        },
        "safe": {
          "english": "Safe Site",
          "german": "Sichere Seite"
        }
      },
      "justification": {
        "severe": {
          "blacklist": {
            "english": " we found in our database of known fradulent sites. Do NOT enter any data here, the operator of the site is a fraudster.",
            "german": " haben wir in unserer Datenbank sch&auml;dlicher Webseiten gefunden. Geben Sie hier KEINE Daten ein, da der Betreiber der Seite ein Betr&uuml;ger ist."
          },
        },
        "safe": {
          "whitelist": {
            "english": " we found in our database of safe sites. You can enter your data here without concerns.",
            "german": " haben wir in unserer Datenbank sicherer Webseiten gefunden. Sie k&ouml;nnen Ihre Daten hier ohne Bedenken eingeben."
          }
        }
      }
    }
  }
};

init();