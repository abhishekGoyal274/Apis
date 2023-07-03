const mongoose = require('mongoose');
const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const bodyparser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const MongoStore = require('connect-mongo')(session)

//dotenv Configuration
dotenv.config();

// connect to mongoDB
mongoose.set('strictQuery', true);

const conn = process.env.MDB_CONNECT;
const connection = mongoose.connect(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, () => { console.log("Connected to MongoDB"); });

const sessionStore = new MongoStore({
    mongooseConnection: mongoose.connection,
    collection: "sessions"
})

//Middlewares
const app = express();
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.json())
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}))
app.use(passport.initialize());
app.use(passport.session());

//User Model
const nameSchema = new mongoose.Schema({
    givenName: String,
    familyName: String,
})
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    picture: String,
    name: nameSchema

});
UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);

const User = mongoose.model('User', UserSchema);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            username: profile.displayName,
            googleId: profile.id,
            name: profile.name,
            picture: profile.photos[0].value,
        },
            function (err, user) {
                return cb(err, user);
            });

    }

));



passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

//Home Route
app.get("/", (req, res) => {
    var ApiHomeHTML = '\
        <html>\
        <link rel="preconnect" href="https://fonts.googleapis.com">\
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\
        <link href="https://fonts.googleapis.com/css2?family=Lobster&display=swap" rel="stylesheet">\
        <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans&display=swap" rel="stylesheet">\
        <link rel="icon" type="image/x-icon" href="https://images.ctfassets.net/vwq10xzbe6iz/tnwT7PN9aBmT7vgkTtGhV/940f001eb249a42904cd40e64d13c7e9/passportJS-300x300.png">\
        <title>Passport.js</title>\
            <body style="background-color:black; margin:0px; padding:0px; font-family: Josefin Sans, sans-serif;;\">\
                <div style="display: flex;\
                    justify-content: center;\
                    align-items: center;\
                    height: 100vh;\
                    margin:0px; padding:0px;\
                    width: 100vw;\
                    font-size: 50px;\
                    color: white;">\
                        <h1>Passport</h1> <br> \
                        &nbsp;<p style="font-size:40px;">API</p>\
                </div>\
            </body>\
        </html>\
    ';
    res.send(ApiHomeHTML);
})

app.get('/auth/google',
    passport.authenticate("google", { scope: ["profile"] })
);
app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.status(200).send({ successMessage: "login with google successfull" });
    });

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) res.status(200).send({ successMessage: "Still logged in!" });
    else res.status(401).send({ errorMessage: "Unautherised" });
})

app.post("/register", (req, res) => {
    User.register(
        { "username": req.body.username },
        req.body.password,
        function (err, user) {
            if (err) res.status(404).send({ errorMessage: err });
            else passport.authenticate("local")(req, res, () => { res.status(200).send({ successMessage: "Registered!" }); })
        });

});

app.post("/login", (req, res) => {
    const newUser = User({
        username: req.body.password,
        password: req.body.password
    });
    req.login(newUser, function (err) {
        if (err) res.status(404).send({ errorMessage: err });
        else passport.authenticate("local")(req, res, () => { res.status(200).send({ successMessage: "Login Successfully!" }); })
    });
})

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        else res.status(200).send("logout Success.")
    });
})

//create Server
const PORT = 3000 || process.env.PORT;
app.listen(PORT, () => console.log(`Server started on port: ${PORT}`))

