var express = require('express'),
    path = require('path'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    bcrypt = require('bcrypt'),
    passport = require('passport'),
    UesrTable = require('./models/user'),
    GoogleStrategy = require('passport-google-oauth2').Strategy;

require('dotenv').config();

var port = process.env.PORT || 8080;

// Mongoose configuration

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

var con = mongoose.connection;

// app init

const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Google authendication

passport.use(new GoogleStrategy({
    clientID: process.env.GCLIENT_ID,
    clientSecret: process.env.GSECRET,
    callbackURL: `${process.env.URL}/auth/google/callback`,
    passReqToCallback: true,
},
    function (req, accessToken, refreshToken, profile, done) {
        console.log(profile);
        profile.accessToken = accessToken;
        req.session.user = new UserTable(profile);
        UserTable.findOneAndUpdate({ email: profile.email }, { $set: new UserTable(profile) }, function (err, result) {
            if (err) throw err;
            if (!result) con.collection('users').insertOne(new UserTable(profile));
        });
        return done(null, profile);
    }
));

passport.serializeUser(function (user, done) { done(null, user); });

passport.deserializeUser(function (user, done) { done(null, user); });

// ROUTES

// Home

app.get('/', function (req, res) {
    if (req.session.user) res.send(`<img src="${req.session.user.picture}" style="border-radius:100%;"/><h3>Hello ${req.session.user.name}<br>${req.session.user.email}<h3><br><a href="/logout">Logout</a>`)
    else res.redirect('/login')
});

// Google authendication routes

app.get('/auth/google', passport.authenticate('google', {
    scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/user.phonenumbers.read',
        'https://www.googleapis.com/auth/user.addresses.read'
    ]
}));

app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));

// Normal login

app.post('/login', function (req, res) {
    UserTable.findOne({ email: req.body.email }, function (err, result) {
        try {
            bcrypt.compare(req.body.passwd, result.accessToken, function (err, isPasswordMatch) {
                if (err) throw err;
                if (isPasswordMatch) {
                    req.session.user = result;
                    res.redirect('/')
                } else res.send('Invalid')
            });
        } catch (err) {
            res.send('Invalid')
        }
    });
});

app.get('/register', function (req, res) { res.render('register') });

app.post('/register', function (req, res) {
    bcrypt.genSalt(10, function (err, salt) {
        if (err) throw err;
        bcrypt.hash(req.body.passwd, salt, function (err, hash) {
            con.collection('users').insertOne(new UserTable({ name: req.body.username, email: req.body.email, accessToken: hash, mobileNo: req.body.mobileNo, address: req.body.address, about: req.body.about }));
            res.redirect('/');
        });
    });
});

app.get('/login', function (req, res) { res.render('login') });

app.get('/logout', function (req, res) {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});

app.listen(process.env.PORT, () => { console.log(`${process.env.URL}`) });