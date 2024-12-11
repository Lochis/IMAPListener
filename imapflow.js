const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: 'ami@ed.amdsb.ca',
        pass: 'rkhz bwmi laje bsya'
    }
});



const main = async () => {
    // Wait until client connects and authorizes
    await client.connect();

    // Open the INBOX
    await client.mailboxOpen('INBOX');
    console.log('INBOX is selected.');

    let searchResult = await client.search({ seen: false });
    console.log(`\nFound ${searchResult.length} unread email(s).\n`);
    await getEmailInfo(searchResult);

    // Set up a listener for new emails
    client.on('exists', async () => {
        console.log('New email detected');
        searchResult = await client.search({ seen: false });
        await getEmailInfo(searchResult);
    });

    // Keep the connection alive
    setInterval(async () => {
        await client.noop();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Select and lock a mailbox. Throws if mailbox does not exist

    /*try {
        // fetch latest message source
        // client.mailbox includes information about currently selected mailbox
        // "exists" value is also the largest sequence number available in the mailbox
        let message = await client.fetchOne(client.mailbox.exists, { source: true });
        console.log(message.source.toString());

        // list subjects for all messages
        // uid value is always included in FETCH response, envelope strings are in unicode.
        for await (let message of client.fetch('1:*', { envelope: true })) {
            console.log(`${message.uid}: ${message.envelope.subject}`);
        }
    } finally {
        // Make sure lock is released, otherwise next `getMailboxLock()` never returns
        lock.release();
    }*/

    // log out and close connection
    // await client.logout();
};

main().catch(err => console.error(err));

async function getEmailInfo(searchResult) {

    for (let msg of searchResult) {
        const message = await client.fetchOne('*', { source: true });
        let parsed = await simpleParser(message.source);

        console.log(parsed.to.value[0].address);
        //console.log("cc: " + parsed.cc.text);
        //console.log("bcc: " + parsed.bcc.text);
        console.log(`Message ID: ${parsed.messageId}`);
        console.log(`Subject: ${parsed.subject}`);
        console.log("From: " + parsed.from.text);
        console.log(`Date: ${parsed.date}`);
        console.log(`Body: ${parsed.html}...`);

        let emailBody = {
            to: parsed.to.text,
            //cc: parsed.cc.text,
            //bcc: parsed.bcc.text,
            messageId: parsed.messageId,
            subject: parsed.subject,
            from: parsed.from.text,
            date: parsed.date,
            body: parsed.html
        }

        sendEmailToAIChat(emailBody);

        // mark it seen
        //message.messageFlagsAdd('SEEN');
    }
}


async function sendEmailToAIChat(emailBody) {
    try {
        const response = await fetch('https://localhost:3000/api/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emailBody: emailBody }),
        });

        if (response.ok) {
            console.log("Email sent successfully");
        } else {
            console.error(`Failed to send email: ${response.statusText}`);
        }

    } catch (error) {
        console.error('Error sending email', error);
    }

}