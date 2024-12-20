import Imap from 'imap';
import mailparser from 'mailparser';

import dotenv from 'dotenv';

dotenv.config();

const emailConfig = {
  user: process.env.GMAIL_EMAIL,
  password: process.env.APP_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: false,
  tlsOptions: {
    rejectUnauthorized: false, // Default behavior
  },
};

export default function startImap() {
  const imap = new Imap(emailConfig);

  function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
  }

  imap.once('ready', () => {
    openInbox((err, box) => {
      if (err) throw err;
      console.error(`Listening for new emails in inbox: ${box.name}`);

      // Set up a listener for new mail
      imap.on('mail', () => {
        console.log('New mail received!');

        // Fetch new messages
        imap.search(['UNSEEN'], (err, results) => {
          if (err) throw err;


          if (results.length > 0) {
            const f = imap.fetch(results, { bodies: '' });

            f.on('message', (msg, seqno) => {
              console.log(`Processing message #${seqno}`);

              msg.on('body', (stream, info) => {
                let body = '';
                stream.on('data', (chunk) => {
                  body += chunk.toString('utf8');
                });

                stream.on('end', () => {
                  console.log(`Message: ${body}`);
                });
              });

              sendEmailToAIChat(body);
            });

            f.on('end', () => {
              console.log('Done fetching all unseen messages!');
            });

          } else {
            console.log('No new messages.');
          }
        });
      });
    });
  });

  // Handle connection errors
  imap.once('error', (err) => {
    console.log('Connection error: ' + err);
  });

  // Connect to the IMAP server
  imap.connect();

}

async function sendEmailToAIChat(emailBody) {
  try {
    const response = await fetch('https://localhost:3000/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailBody }),
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
