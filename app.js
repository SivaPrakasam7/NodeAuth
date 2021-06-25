
var express = require('express'),
    path = require('path'),
    MongoClient = require('mongodb').MongoClient,
    bodyParser = require('body-parser'),
    bcrypt = require('bcrypt'),
    passport = require('passport'),
    GoogleStrategy = require('passport-google-oauth2').Strategy,
    url = 'mongodb+srv://siva:siva12345@cluster0.yudpn.mongodb.net/nodelogin?retryWrites=true&w=majority';

const app = express();
const port = 3000;
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(require('express-session')({
    secret: '*&@%VUGHCBIW',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


// Google authendication

passport.use(new GoogleStrategy({
    clientID: '828539284135-g58rop1ja3k3stkb3m9sglqras33eab5.apps.googleusercontent.com',
    clientSecret: '0srDFw37NiNJ1wb6jrvQA1gU',
    callbackURL: 'https://b8cab82c82fd.ngrok.io/auth/google/callback',
    passReqToCallback: true,
},
    function (request, accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

// ROUTES

// Home page

app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));

app.get('/', function (req, res) {
    if (req.session.userID) res.send(`Hello ${req.session.userID} <br><a href="/logout">Logout</a>`)
    else if (req.user) res.send(`<img src="${req.user.picture}" style="border-radius:100%;"/><h3>Hello ${req.user.displayName}<br>${req.user.email}<h3><br><a href="/logout">Logout</a>`)
    else res.redirect('/login')
});

app.post('/login', function (req, res) {
    var username = req.body.email;
    var password = req.body.passwd;
    MongoClient.connect(url, { useUnifiedTopology: true }, function (err, db) {
        if (err) throw err;
        var dbo = db.db('nodelogin');
        dbo.collection('users').findOne({ name: username }, function (err, result) {
            if (err) throw err;
            console.log(result);
            try {
                bcrypt.compare(password, result.password, function (err, isPasswordMatch) {
                    if (err) throw err;
                    if (isPasswordMatch) {
                        // bcrypt.genSalt(5,function(err,salt){
                        //     if (err) throw err;
                        //     bcrypt.hash(String(result._id),salt,function(err,sid){
                        //         if (err) throw err;
                        //         req.session.userID=sid;
                        //     });
                        // });
                        req.session.userID = result._id;
                        res.redirect('/')
                    } else res.send('Invalid credential')
                });
            } catch (err) {
                res.send('Invalid')
            }
            db.close();
        });
    });
});

app.get('/register', function (req, res) {res.render('register')});

app.post('/register', function (req, res) {
    var password = req.body.passwd;
    bcrypt.genSalt(10, function (err, salt) {
        if (err) throw err;
        bcrypt.hash(password, salt, function (err, hash) {
            MongoClient.connect(url,{ useUnifiedTopology: true }, function (err, db) {
                if (err) throw err;
                var dbo = db.db('nodelogin');
                dbo.collection('users').insertOne({ name: req.body.username, password: hash,mobileNo:req.body.mobileNo ,address:req.body.address,about:req.body.about}, function (err, res) {
                    if (err) throw err;
                    console.log(res.insertedId);
                    req.session.userID=res.insertedId;
                    db.close();
                });
                res.redirect('/');
            });
        });
    });
});

app.get('/login', function (req, res) {
    res.render('login')
});

app.get('/logout', function (req, res) {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});