const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;
const pino = require('pino')();
pino.level = 'silent';

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    logger: false,
    auth: {
        user: 'ami@ed.amdsb.ca',
        pass: 'rkhz bwmi laje bsya'
    }
});



async function connectToImap() {
    while (true) {
        try {
            // Wait until client connects and authorizes
            await client.connect();

            // Open the INBOX
            await client.mailboxOpen('INBOX');
            console.log('INBOX is selected.');

            // Set up a listener for new emails
            client.on('exists', async () => {
                console.log('New email detected');
                let searchResult = await client.search({ seen: false });
                await getEmailInfo(searchResult);
            });

            // Handle connection close and attempt to reconnect
            client.on('close', async () => {
                console.log('IMAP connection closed. Attempting to reconnect...');
                client.removeAllListeners(); // Remove all listeners to avoid duplicate events
                setTimeout(connectToImap, 5000); // Reconnect after 5 seconds
            });

            // Exit the loop if connected successfully
            break;

        } catch (err) {
            console.error('Failed to connect to IMAP server:', err);
            console.log('Retrying connection in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Retry connection after 5 seconds
        }
    }
}

connectToImap().catch(err => console.error(err));

const emailRegex = /^[^@.]+\.([^@.]+)@ed\.amdsb\.ca$/i;

async function getEmailInfo(searchResult) {

    for (let msg of searchResult) {
        const message = await client.fetchOne(msg, { source: true });
        let parsed = await simpleParser(message.source);

        let fromField = parsed.from.text;
        const fromAddressMatch = fromField.match(/<([^>]+)>/);
        const fromAddress = fromAddressMatch ? fromAddressMatch[1] : '';

        console.log(fromAddress);
        //console.log("cc: " + parsed.cc.text);
        //console.log("bcc: " + parsed.bcc.text);
        console.log(`Message ID: ${parsed.messageId}`);
        console.log(`Subject: ${parsed.subject}`);
        console.log("From: " + parsed.from.text);
        console.log(`Date: ${parsed.date}`);
        console.log(`Body: ${parsed.text}`);

        let emailBody = {
            to: parsed.to.text,
            //cc: parsed.cc.text,
            //bcc: parsed.bcc.text,
            messageId: parsed.messageId,
            subject: parsed.subject,
            from: parsed.from.text,
            date: parsed.date,
            body: parsed.html,
        }


        if (emailRegex.test(fromAddress)) {
            console.log("--------------------- MSG:  " + msg + " ---------------------");
            sendEmailToAIChat(emailBody, msg);
        } else {
            console.log("Email not sent to AI chat. Email is not from an AMDSB email address or is not staff.");
        }


    }
}


async function sendEmailToAIChat(emailBody, msgUid) {
    try {
        const response = await fetch('https://localhost:3000/api/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emailBody: emailBody }),
        });

        if (response.ok) {
            console.log(response.message);

            // mark it seen
            try {
                await client.messageFlagsAdd(msgUid, ['\\Seen']);
                console.log(`Message ${msgUid} marked as seen`);
            } catch (error) {
                console.error(`Failed to mark message ${msgUid} as seen:`, error);
            }

        } else {
            console.error(`Failed to send email: ${response.statusText}`);
        }

    } catch (error) {
        console.error('Error sending email', error);
    }

}