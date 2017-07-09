var express = require('express')
var path = require('path')
var mongoose = require('mongoose')
var passport = require('passport')
var flash = require('connect-flash')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session')
var redis = require('redis')
var Redisstore = require('connect-redis')(session)
var client = redis.createClient()
var Xvfb = require('xvfb')
var xvfb = new Xvfb()
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var Admin = require('./models/user')

mongoose.connect(require('./config/database').url)

Admin.findOne({email: 'admin@monitor.kicks'}, function (err, admin) {
  if (err) throw err
  if (!admin) {
    var newAdmin = new Admin()
    newAdmin.email = 'admin@monitor.kicks'
    newAdmin.password = newAdmin.generateHash('k1ck3monitor')
    newAdmin.verified = true
    newAdmin.isAdmin = true
    newAdmin.save(function (err) {
      if (err) throw err
    })
  }
})


app.set('views', path.resolve(__dirname, 'views'))
app.use(express.static('public'))
app.set('view engine', 'html')
app.engine('html', require('hbs').__express)


app.use(cookieParser()) // read cookies (needed for auth)
app.use(bodyParser()) // get information from html forms
app.use(bodyParser.json()) // get JSON data
app.use(session({
  secret: 'ilovescotchscotchyscotchscotch',
    // create new redis store.
  store: new Redisstore({host: 'localhost', port: 6379, client: client, ttl: 760}),
  saveUninitialized: false,
  resave: false
}))

app.use(passport.initialize())
app.use(passport.session()) // persistent login sessions
app.use(flash()) // use connect-flash for flash messages stored in session

xvfb.start(function (err, xvfbProcess) {
  // code that uses the virtual frame buffer here
  if (err) throw err
  require('./routes/route')(app, passport)
  require('./config/passport')(passport)
  require('./comms')(io)
  process.nextTick(function () {
    require('./asyncops')()
  })
})

server.listen(8080, '0.0.0.0', function () {
  console.log('Listening on 80')
})
