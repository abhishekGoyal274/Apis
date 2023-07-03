//ES 6 
const express = require('express');
const dotenv = require('dotenv');
const twilio = require('twilio');


dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const serviceId = process.env.TWILIO_SERVICE_ID;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = new twilio(accountSid, authToken);
app.get("/", (req, res) => {
    res.send("Phone verification");
})
app.post("/login", (req, res) => {
    console.log(req.body);
    const phoneNumber = req.body.number;
    const channel = req.body.channel;

    client
        .verify
        .services(serviceId)
        .verifications
        .create({
            to: `+${phoneNumber}`,
            channel: channel
        }).then((data) => {
            res.status(200).send(data)
        })
})

app.post("/verify", (req, res) => {
    const phoneNumber = req.body.number;
    const code = req.body.code;
    client
        .verify
        .services(serviceId)
        .verificationChecks
        .create({
            to: `+${phoneNumber}`,
            code: code
        }).then((data) => {
            res.status(200).send(data)
        })
})


const PORT = 5000 || process.env.PORT
app.listen(PORT, () => console.log(`listening on ${PORT}`))




// const client = require('twilio')(accountSid, authToken);

// client.verify.v2.services('VAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
//     .verifications
//     .create({ to: 'recipient@foo.com', channel: 'email' })
//     .then(verification => console.log(verification.sid));
