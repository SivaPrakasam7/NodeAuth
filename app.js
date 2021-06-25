var express = require('express'),
    path = require('path'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    bcrypt = require('bcrypt'),
    passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth2').Strategy;

require('dotenv').config();

// Mongoose configuration

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

var con = mongoose.connection;

const User = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    mobileNo: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /d{10}/.test(v);
            },
            message: '{VALUE} is not valid number'
        }
    }, address: { type: String, required: true }, about: { type: String }
});

UserTable = mongoose.model('users', User);

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
    function (request, accessToken, refreshToken, profile, done) {
        UserTable.findOneAndUpdate({ email: profile.email },{$set:{name: profile.displayName, accessToken: accessToken}}, function (err, result) {
            if (err) throw err;
            if (!result) con.collection('users').insertOne({ name: profile.displayName, email: profile.email, accessToken: accessToken });
        });
        return done(null, profile);
    }
));

passport.serializeUser(function (user, done) { done(null, user); });

passport.deserializeUser(function (user, done) { done(null, user); });

// ROUTES

// Home

app.get('/', function (req, res) {
    if (req.session.user) res.send(`<h3>Hello ${req.session.user.name}<br>${req.session.user.email}<h3><br><a href="/logout">Logout</a>`)
    else if (req.user) res.send(`<img src="${req.user.picture}" style="border-radius:100%;"/><h3>Hello ${req.user.displayName}<br>${req.user.email}<h3><br><a href="/logout">Logout</a>`)
    else res.redirect('/login')
});

// Google authendication routes

app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }), function (err, result) { });

// Normal login

app.post('/login', function (req, res) {
    var password = req.body.passwd;
    UserTable.findOne({ name: req.body.email }, function (err, result) {
        try {
            bcrypt.compare(password, result.password, function (err, isPasswordMatch) {
                if (err) throw err;
                if (isPasswordMatch) {
                    req.session.user = result;
                    res.redirect('/')
                } else res.send('Invalid credential')
            });
        } catch (err) {
            res.send('Invalid')
        }
    });
});

app.get('/register', function (req, res) { res.render('register') });

app.post('/register', function (req, res) {
    var password = req.body.passwd;
    bcrypt.genSalt(10, function (err, salt) {
        if (err) throw err;
        bcrypt.hash(password, salt, function (err, hash) {
            con.collection('users').insertOne({ name: req.body.username, email: req.body.email, password: hash, mobileNo: req.body.mobileNo, address: req.body.address, about: req.body.about }, function (err, result) { req.session.userID = result.insertedId; });
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