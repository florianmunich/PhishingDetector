document.body.style.backgroundColor = 'orange';

var port = chrome.runtime.connect();
port.postMessage({
  'from': 'popup',
  'message' : 'Hellofrom jsonloading'
});

let url = 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/safeSites.json?token=GHSAT0AAAAAABR6GEETWUYH3PFVMJLETBS2YRB7N4A';
var allKnownSites;
var phishingSites;
var safeSites;

async function getPhishingData() {
    await fetch(url)
    .then(res => res.json())
    .then((out) => {allKnownSites = out;
    });
}

async function declareSites(){
    await getPhishingData();
    phishingSites = allKnownSites.phishingSites;
    safeSites = allKnownSites.safeSites;
    console.log(phishingSites);
}
declareSites();

function warning() {
    var elems = document.querySelectorAll('input[type=password]');
    console.log(elems);


    for(let item of elems){
        console.log(item);
        item.placeholder="Think twice";
        var newItem = document.createElement("img");
        newItem.src="https://img.icons8.com/ios-glyphs/100/000000/knight-shield.png";
        newItem.className = "appendedSecurityLogo";
        item.parentNode.appendChild(newItem);
    }
}

warning();
/* port.postMessage({
    'from': 'popup',
    'message' : 'URLrequest'
  });

chrome.runtime.onConnect.addListener(function(port) {

    // listen for every message passing throw it
    port.onMessage.addListener(function(o) {

        // if the message comes from the popup
        if (o.from && o.from === 'background') {
            
            console.log("Received message from background");
            console.log(o.message);
        }
    });
}); */