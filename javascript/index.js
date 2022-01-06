/**
 * Sample code to fetch sales orders from Handy API.
 * It can query created and deleted sales orders.
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
 *    You can either create a .env file or add it as an environment variable in your operating system.
 * 2. You can adjust the cron expression to run the code at a frequency.
 * 
 */

// https://crontab.guru/#*/10_*_*_*_*
// Default: every 10 minutes
const cronExpression = '*/10 * * * *'

const businessLogic = async function (salesOrders, deleted) {
    console.log(`${deleted ? 'Fetched deleted orders' : 'Fetched created orders'}. Received ${salesOrders.length} sales orders.`);

    for (const salesOrder of salesOrders) {
        if (deleted) {
            // A sales order was deleted in Handy
            // If you want, you can delete the externalId from your system.
        } else {
            // *****
            // Implement your business logic here:
            // ✅ Save sales order in your ERP or system.
            // *****

            // Once you saved the sales order in your system, 
            // you can save the externalId on the sales order with the Handy API
            // for future reference if the sales order is deleted in Handy.
            // Then you can easily find the corresponding sales order in your system
            // and delete it too.
            await saveExternalIdOnSalesOrder(salesOrder.id, salesOrder.externalId);
        }
    }
};

// -----------------------------------------------------------------------------

require('dotenv').config()
const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const dateFormat = 'DD/MM/YYYY HH:mm:ss'
const moment = require('moment');

const jobFunction = async function () {
    await fetchSalesOrders(false);
    await fetchSalesOrders(true);
}

const fetchSalesOrders = async (deleted) => {
    let lastTime = {};
    const filePath = deleted ? './last_time_deleted.json' : './last_time.json';

    if (fs.existsSync(filePath)) {
        lastTime.start = JSON.parse(fs.readFileSync(filePath));
        lastTime.end = moment().format(dateFormat);
    } else {
        // Defaults
        lastTime.start = moment().format(dateFormat);
        lastTime.end = lastTime.start;
    }

    const url = `https://app.handy.la/api/v2/salesOrder?start=${lastTime.start}&end=${lastTime.end}&deleted=${deleted}`;
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
        await businessLogic(salesOrders, deleted);
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
        method: 'PATCH',
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