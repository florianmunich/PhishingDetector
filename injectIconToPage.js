//document.body.style.backgroundColor = 'orange';


let url = 'https://raw.githubusercontent.com/florianmunich/PhishingDetector/main/safeSites.json?token=GHSAT0AAAAAABR7DQS3EPX6UX3XFHA4XSDCYRDM5NA';
var allKnownSites;
var phishingSites;
var safeSites;

async function main(){
    await getPhishingData();
    await declareSites();
    var currentSite = window.location.toString();
    var pwElems = document.querySelectorAll('input[type=password]');
    if(!pwElems.length == 0){
        inputPDIcon(pwElems);
        var phishingSite = await siteInSuspected(currentSite);
        if(phishingSite){
            warning();
        }
        var safeSite = await siteInSafe(currentSite);
        if(safeSite){
            safe();
        }
        if(!safeSite && !phishingSite){
            console.log("Site was not found safe or unsafe");
            unknown();
        }
    }

}
main();

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
}

function inputPDIcon(pwElems) {
    for(let item of pwElems){
        item.placeholder="Think twice before entering data!";
        //create item svg
        //TODO: Altes Logo von Icons8 --> Erneuern
        var newIcon = document.createElement('span');
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
        newIcon.setAttribute('title', 'Mouseover text');
        newIcon.appendChild(newItemSVG)
        newItemSVG.appendChild(newItemPath);
        item.parentNode.appendChild(newIcon);
        iconAppended = document.getElementsByClassName('appendedSecurityLogo')[0];
       
        console.log('started building container');
        var container = document.createElement('div');
        container.setAttribute('class', 'hoverContainer');
        var hoverContainerBackground = document.createElement('div');
        hoverContainerBackground.setAttribute('class', 'hoverContainerBackground');
        container.appendChild(hoverContainerBackground);
        var siteInfoText = document.createElement('div');
        siteInfoText.setAttribute('class', 'siteInfoText');
        siteInfoText.innerHTML = 'We currently do not have information about this page.';
        var justifyPhish = document.createElement('div');
        justifyPhish.setAttribute('class', 'justifyPhish');
        justifyPhish.innerHTML = '';
        var readMore = document.createElement('div');
        readMore.setAttribute('class', 'readMore');
        readMore.innerHTML = 'Read more here: ';
        var readMorePage = document.createElement('a');
        readMorePage.setAttribute('href', 'https://www.wildfirecu.org/education-and-resources/blog/blog-post/wildfire-blog/how-to-spot-a-phishing-website');
        readMorePage.innerHTML = 'How to detect a Phishing Page';
        readMore.appendChild(readMorePage);
        hoverContainerBackground.appendChild(siteInfoText);
        hoverContainerBackground.appendChild(justifyPhish);
        hoverContainerBackground.appendChild(readMore);
        iconAppended.parentNode.appendChild(container);
        console.log('finished building container');

        iconAppended.addEventListener("mouseenter", function(event) {
            console.log("hover");
            iconAppended.classList.add('iconHovered');
            container.classList.add('hoverContainerOnHover');
        })
    }
}

function warning(){
    var icon = document.getElementsByClassName("appendedSecurityLogo")[0];
    icon.classList.add('warningSecurityLogo');
    icon.parentNode.setAttribute('title', 'Message from PD: This website ist probably unsafe! Do NOT enter personal information or BE VERY CAUTOUS!');

    //var siteInfotext = document.getElementsByClassName('siteInfoText')[0];

    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextWarning');
    var justifyPhish = document.getElementsByClassName('justifyPhish')[0];
    siteInfoText.innerHTML = 'We found that ' + window.location.toString().split('/')[2] + ' is probably unsafe!';
    justifyPhish.innerHTML = 'Reason: We found the web page in a blacklist of phishing sites!';
}

function safe(){
    var icon = document.getElementsByClassName("appendedSecurityLogo")[0];
    icon.classList.add('safeSecurityLogo');
    icon.parentNode.setAttribute('title', 'Message from PD: We think this website might be safe! You can enter your data.')

    //Put info text to hover popup
    var siteInfoText = document.getElementsByClassName('siteInfoText')[0];
    siteInfoText.classList.add('siteInfotextSafe');
    var justifyPhish = document.getElementsByClassName('justifyPhish')[0];
    siteInfoText.innerHTML = 'We found that ' + window.location.toString().split('/')[2] + ' is probably safe!';
    justifyPhish.innerHTML = 'Reason: We found the web page in our database!';
}

function unknown(){
    var icon = document.getElementsByClassName("appendedSecurityLogo")[0];
    icon.classList.add('unknownSecurityLogo');
    icon.parentNode.setAttribute('title', 'Message from PD: We do not know this webpage. be careful when entering data.')
}

function triggerHoverContainer(icon){
/*     var position = icon.getBoundingClientRect();
    console.log(position); */
    console.log('started builing container')
    
    var container = document.createElement('div');
    container.setAttribute('class', 'hoverContainer');

    var hoverContainerBackground = document.createElement('div');
    hoverContainerBackground.setAttribute('class', 'hoverContainerBackground');
    container.appendChild(hoverContainerBackground);

    var siteInfoText = document.createElement('div');
    siteInfoText.setAttribute('class', 'siteInfoText');
    siteInfoText.innerHTML = 'We currently do not have information about this page.';

    var justifyPhish = document.createElement('div');
    justifyPhish.setAttribute('class', 'justifyPhish');
    justifyPhish.innerHTML = '';

    var readMore = document.createElement('div');
    readMore.setAttribute('class', 'readMore');
    readMore.innerHTML = 'Read more here: ';

    var readMorePage = document.createElement('a');
    readMorePage.setAttribute('href', 'https://www.wildfirecu.org/education-and-resources/blog/blog-post/wildfire-blog/how-to-spot-a-phishing-website');
    readMorePage.innerHTML = 'How to detect a Phishing Page';

    readMore.appendChild(readMorePage);
    hoverContainerBackground.appendChild(siteInfoText);
    hoverContainerBackground.appendChild(justifyPhish);
    hoverContainerBackground.appendChild(readMore);

    icon.parentNode.appendChild(container);
}

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