const sgMail = require('@sendgrid/mail')
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const crypto = require('crypto');
const flash = require('req-flash');

//Middlewares
app = express()
app.use(cookieParser());
app.use(session({ secret: "proccess.env.secret", resave: false, saveUninitialized: true }));
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(flash());


// connect to mongoDB
mongoose.set('strictQuery', true);
const conn = process.env.MDB_CONNECT;
mongoose.connect(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, () => { console.log("Connected to MongoDB"); });


//Server
const PORT = process.env.PORT || "5000"
app.listen(PORT, () => console.log(`listening on port ${PORT}`))


//Model
const emailVerificationSchema = new mongoose.Schema({
    emailToken: String,
    email: String,
    isVerified: Boolean
}, { timestamps: true }
)
const EmailVerification = mongoose.model("emailVerification", emailVerificationSchema);


//Configurations
dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const sgMailFunction = (host, emailToken, email, res, registered) => {
    const msg = {
        to: email, // Change to your recipient
        from: 'abhishekgoyal274@gmail.com', // Change to your verified sender
        subject: 'Email verification using SendGrid',
        html: `<div>
                <h1>Email verification</h1>
                <h3>Hello, thanks registering on my site. Please register your email.</h3>
                <a href="http://${host}/verifyEmail?emailToken=${emailToken}&email=${email}">
                    <button style=" background-color: #4CAF50; /* Green */
                    border: none;
                    color: white;
                    padding: 15px 32px;
                    text-align: center;
                    text-decoration: none;
                    display: inline-block;
                    font-size: 16px;"> verify </button>
                </a>
                <h5>If you haven't registered please ignore this and if you get this often please mail me.</h5>
               </div>`,
    }
    sgMail
        .send(msg)
        .then(() => {
            if (registered) res.send({ successMessage: `Email already registerd but not verifiied. Email sent again, please check ${email} inbox.` })
            else res.send({ successMessage: `Email sent please check ${email} inbox.` })
        })
        .catch((error) => {
            console.error(error.response)
        })
}

// console.log(EmailVerification.getIndexes());
//Register 
app.post("/registerEmail", async (req, res) => {
    const email = req.body.email;
    console.log(req.headers.host);
    const existingUser = await EmailVerification.findOne({ email: email })
    if (existingUser) {
        if (existingUser.isVerified == true) {
            res.send("Email already verified");
        } else {
            sgMailFunction(req.headers.host, existingUser.emailToken, existingUser.email, res, true);
        }
    }
    else {
        const emailToken = crypto.randomBytes(64).toString("hex");
        const newEmail = new EmailVerification({
            email: email,
            emailToken: emailToken,
            isVerified: false
        });
        const user = await newEmail.save();
        sgMailFunction(req.headers.host, user.emailToken, user.email, res, false);
    }
})

//verify Email
app.get("/verifyEmail", async (req, res) => {
    const user = await EmailVerification.findOne({ email: req.query.email });
    const verified = user.isVerified;
    if (!user) {
        res.send("Email does not exist in database");
    } else if (verified) {
        res.send("Email alread verified");
    } else {
        const verifing = await EmailVerification.findOneAndUpdate(req.query, { isVerified: true, emailToken: null });
        res.send(`${verifing.email} verified`);
    }
})




