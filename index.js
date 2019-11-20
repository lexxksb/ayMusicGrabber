const puppeteer = require('puppeteer');
const fs = require("fs");
const fsExt = require("fs-extra");
const axios = require('axios');
require('dotenv').config();
let browser;
let page;
let trackName = '';
let artistName = '';
let mp3Path = './' + (process.env.MP3PATH || 'mp3') + '/';

(async () => {
    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
        ignoreHTTPSErrors: true
    });
    page = (await browser.pages())[0];
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
        if (request.resourceType() === 'media') {

            let filePath = mp3Path + '(' + artistName + ') ' + trackName + '.mp3';

            axios({
                url: request.url(),
                method: 'GET',
                responseType: 'stream', // important
            }).then((response) => {
                response.data.pipe(fs.createWriteStream(filePath));
                console.log('success download');
            }).catch(error => {
                console.log(error);
            });

            console.log(filePath);
        }
        request.continue();
    });

})()
    .then(async () => {

        fsExt.removeSync(mp3Path);
        fsExt.ensureDirSync(mp3Path);

        await page.goto(process.env.PLAYLIST + '');

        await page.waitFor(2000);

        const trackElems = await page.$$("body > div.page-root.page-root_no-player.deco-pane-back.page-root_empty-player > div.centerblock-wrapper.deco-pane > div.centerblock > div > div > div.page-playlist__tracks-wrapper > div > div.page-playlist__tracks-list > div > div.lightlist__cont > div");

        if (trackElems.length > 0) {
            for (let i = 0; i < trackElems.length; i++) {

                const trackNameElem = await trackElems[i].$('div.d-track__quasistatic-column > div > a');
                trackName = await (await trackNameElem.getProperty('innerText')).jsonValue();

                const trackNameElemSecond = await trackElems[i].$('div.d-track__quasistatic-column > div > span');
                if (trackNameElemSecond) {
                    trackName = trackName + ' ' + await (await trackNameElemSecond.getProperty('innerText')).jsonValue();
                }

                const artistNameElem = await trackElems[i].$('div.d-track__overflowable-column > div.d-track__overflowable-wrapper > div > span > a');
                artistName = await (await artistNameElem.getProperty('innerText')).jsonValue();

                await trackElems[i].evaluate(el => el.querySelector('div.d-track__start-column > div.d-track__play.d-track__hover > span > button').click());
                await page.waitFor(1000);
            }
        }

        browser.close();
    })