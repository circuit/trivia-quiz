const Circuit = require('circuit-sdk');
const config = require('./config.json');
const express = require('express');

const app = express();
const client = new Circuit.Client(config.credentials);

// Constants
const MODERATOR_CONVERSATION_ID = config.moderatorConversationId;
const QUIZ_CONVERSATION_ID = config.quizConversationId;
const DOMAIN = config.credentials.domain;
const HOST = config.host;

const addEventListeners = () => {
    console.log('Add Listeners');
}

const initWebhooks = async (token) => {
    // Delete previous webhooks
    await fetch(`${DOMAIN}/rest/webhooks`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });

    // Register new webhook for USER.SUBMIT_FORM_DATA
    let webhookId = await fetch(`${DOMAIN}/rest/webhooks`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: `url=${encodeURI(`${HOST}/webhook`)}&filter=USER.SUBMIT_FORM_DATA`
    });
    console.log(`Webhook ${webhookId} created for USER.SUBMIT_FORM_DATA`);

    // Register new webhook for CONVERSATION.ADD_ITEM
    webhookId = await fetch(`${DOMAIN}/rest/webhooks`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: `url=${encodeURI(`${HOST}/webhook`)}&filter=CONVERSATION.ADD_ITEM`
    });
}

// Express Route seciton for webhooks
app.get('/webhook', (req, res) => {
    console.log('hi');
});

app.post('/webhook', (req, res) => {
    console.log('hi');
});

// Start the bot as soon as script is run
(async () => {
    try {
        const bot = await client.logon();
        addEventListeners();
        await initWebhooks(client.accessToken);
        app.listen(7000, () => console.log('App listening on port 7000'));
    } catch (err) {
        console.error(err);
    }
})();