const puppeteer = require('puppeteer');
const fs = require("fs");
const axios = require('axios');
require('dotenv').config();
let browser;
let page;
let start_record = false;
let trackName = '';
let artistName = '';

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

            if (start_record) {

                let filePath = './mp3/(' + artistName + ') ' + trackName + '.mp3';

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

                console.log(trackName, artistName, request.url());
            }
        }
        request.continue();
    });

})()
    .then(async () => {

        await page.goto(process.env.PLAYLIST + '');

        await page.waitFor(2000);

        const trackElems = await page.$$("body > div.page-root.page-root_no-player.deco-pane-back.page-root_empty-player > div.centerblock-wrapper.deco-pane > div.centerblock > div > div > div.page-playlist__tracks-wrapper > div > div.page-playlist__tracks-list > div > div.lightlist__cont > div");

        if (trackElems.length > 0) {
            for (let i = 0; i < trackElems.length; i++) {

                const trackNameElem = await trackElems[i].$('div.d-track__quasistatic-column > div > a');
                trackName = await (await trackNameElem.getProperty('innerText')).jsonValue();

                const artistNameElem = await trackElems[i].$('div.d-track__overflowable-column > div.d-track__overflowable-wrapper > div > span > a');
                artistName = await (await artistNameElem.getProperty('innerText')).jsonValue();

                start_record = true;

                await trackElems[i].evaluate(el => el.querySelector('div.d-track__start-column > div.d-track__play.d-track__hover > span > button').click());

                await page.waitFor(1000);

                start_record = false;
            }
        }

        browser.close();
    })