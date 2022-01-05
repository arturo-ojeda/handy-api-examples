/**
 * Sample code to fetch sales orders from Handy API.
 * Run the code with `node index.js`
 * 
 * You only need to implement your business logic in the businessLogic function.
 * 
 * This code handles the API:
 * - Rate limit
 * - Pagination
 * - Authentication
 * - Errors
 * 
 * Note:
 * 1. You need to set the HANDY_BEARER_TOKEN environment variable to your Handy API bearer token.
 * 2. You can adjust the cron expression to run the code at a different time.
 * 
 */

// https://crontab.guru/#*/10_*_*_*_*
// Default: every 10 minutes
const cronExpression = '*/10 * * * *'

const businessLogic = async function (salesOrders) {
    // Implement your business logic here:
    console.log(`Received ${salesOrders.length} sales orders`);
    salesOrders.forEach(salesOrder => {
        // console.log(salesOrder.id);
    })
};

// -----------------------------------------------------------------------------

require('dotenv').config()
const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const dateFormat = 'DD/MM/YYYY HH:mm:ss'
const moment = require('moment');

const fetchSalesOrders = async () => {
    let lastTime = {};
    const filePath = './last_time.json';

    if (fs.existsSync(filePath)) {
        lastTime.start = JSON.parse(fs.readFileSync(filePath));
        lastTime.end = moment().format(dateFormat);
    } else {
        // Defaults
        lastTime.start = moment().format(dateFormat);
        lastTime.end = lastTime.start;
    }

    const url = `https://app.handy.la/api/v2/salesOrder?start=${lastTime.start}&end=${lastTime.end}`;
    let response = await queryHandyAPI(url);

    if (!response) {
        console.log('No response from Handy API');
        return
    }

    let salesOrders = response.salesOrders

    while (response && response.pagination && response.pagination.nextPage) {
        response = await queryHandyAPI(response.pagination.nextPage);
        if (response) salesOrders.push(...response.salesOrders);
    }

    try {
        await businessLogic(salesOrders);
    } catch (e) {
        console.error("Error implementing business logic", e);
    }

    fs.writeFileSync('last_time.json', JSON.stringify(lastTime.end));
};

const queryHandyAPI = async function (url) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.HANDY_BEARER_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 429) {
        console.log('Rate limit reached. Waiting for 60 seconds.');
        await sleep(60000);
        return queryHandyAPI(url);
    }

    if (response.status === 200) {
        return response.json();
    } else {
        console.log('Error: ' + response.status);
        return null
    }
};

const sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

new CronJob(cronExpression, fetchSalesOrders, null, true, 'America/Mexico_City', this, true);
console.log("Started cron job");