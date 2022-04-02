/**
 * If you need to fecth sales orders go to `index.js`
 * Sample code to fetch closed routes 
 * with their sales from Handy API.
 * It can query closed routes multiple times a day,
 * in the specified interval.
 * 
 * Make sure you have packages installed with `npm install`.
 * To run this code you need to rename this file as `index.js`
 * And then run with `node index.js`
 * 
 * You only need to implement your business logic in the businessLogic and salesOrderBusinessLogic functions.
 * 
 * This code handles the API:
 * - Rate limit
 * - Pagination
 * - Authentication
 * - Errors
 * 
 * Note:
 * 1. You need to set the HANDY_BEARER_TOKEN environment variable to your Handy API bearer token.
 *    You can either create a .env file or add it as an environment variable in your operating system.
 * 2. You can adjust the cron expression to run the code at a frequency that you desire.
 * 
 */

// https://crontab.guru/#*/10_*_*_*_*
// Default: every 10 minutes
const cronExpression = '*/10 * * * *'

const businessLogic = async function (routes) {
    console.log(`Fetched closed routes. Received ${routes.length} routes.`);

    for (const route of routes) {
        // A route was closed in Handy
        // Now, you have the route information and the sales orders.

        // *****
        // If you need to save route's information implement your business logic here:
        // If you only need the sales orders don't implement nothing here
        // and look out the next piece of code
        // *****
        let salesOrdersIds = route.salesOrders

        for(const salesOrderId of salesOrdersIds) {
            await fetchSalesOrder(salesOrderId)
        }
    }
};

const salesOrderBusinessLogic = async function (salesOrder) {
    console.log(`Fetched sales order. Id ${salesOrder.id}.`);

    // *****
    // Implement your business logic here:
    // ✅ Save sales order in your ERP or system.
    // *****

    // Once you saved the sales order in your system, 
    // you can save the externalId on the sales order with the Handy API
    // for future reference if the sales order is deleted in Handy.
    // Then you can easily find the corresponding sales order in your system
    // and delete it too.
    // Uncomment line below to save externalId on sales order∫:
    // await saveExternalIdOnSalesOrder(salesOrder.id, yourExternalId);
};

// -----------------------------------------------------------------------------

require('dotenv').config()
const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const dateFormat = 'DD/MM/YYYY HH:mm:ss'
const moment = require('moment');

const jobFunction = async function () {
    await fetchRoutes();
}

const fetchSalesOrder = async (salesOrderId) => {

    const url = `https://app.handy.la/api/v2/salesOrder/${salesOrderId}`;
    let response = await queryHandyAPI(url);

    if (!response) {
        console.log('No response from Handy API');
        return
    }

    let salesOrder = response

    try {
        await salesOrderBusinessLogic(salesOrder);
    } catch (e) {
        console.error("Error implementing sales order business logic", e);
    }
};

const fetchRoutes = async () => {
    let lastTime = {};
    const filePath = './routes_last_time.json';

    if (fs.existsSync(filePath)) {
        lastTime.start = JSON.parse(fs.readFileSync(filePath));
        lastTime.end = moment().format(dateFormat);
    } else {
        // Defaults
        lastTime.start = moment().format(dateFormat);
        lastTime.end = lastTime.start;
    }

    const url = `https://app.handy.la/api/v2/route?includeSalesOrders=true&filterWithDate=dateClosed&start=${lastTime.start}&end=${lastTime.end}`;
    let response = await queryHandyAPI(url);

    if (!response) {
        console.log('No response from Handy API');
        return
    }

    let routes = response.routes

    while (response && response.pagination && response.pagination.nextPage) {
        response = await queryHandyAPI(response.pagination.nextPage);
        if (response) routes.push(...response.routes);
    }

    try {
        await businessLogic(routes);
    } catch (e) {
        console.error("Error implementing business logic", e);
    }

    fs.writeFileSync(filePath, JSON.stringify(lastTime.end));
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

const saveExternalIdOnSalesOrder = async function (salesOrderId, externalId) {
    const url = `https://app.handy.la/api/v2/salesOrder/${salesOrderId}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${process.env.HANDY_BEARER_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ externalId })
    });

    if (response.status === 200) {
        console.log(`Saved externalId ${externalId} on sales order ${salesOrderId}`);
    } else {
        console.log(`Error saving externalId ${externalId} on sales order ${salesOrderId}`);
    }
}

const sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

new CronJob(cronExpression, jobFunction, null, true, 'America/Mexico_City', this, true);
console.log("Started cron job"); 
