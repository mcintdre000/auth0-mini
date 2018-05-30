const express = require('express');
const bodyPaser = require('body-parser');
const session = require('express-session');
const massive = require('massive');
const axios = require('axios');

require('dotenv').config();
massive(process.env.CONNECTION_STRING).then(db => app.set('db', db));

const app = express();
app.use(bodyPaser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
}));
app.use(express.static(`${__dirname}/../build`));



app.get('/auth/callback', (req, res) => {
  console.log('hit')
  
  
  // STEP 1.)
  //Make an object called payload with the code recieved from the clientside, client_id, client_secret, grant_type, redirect_uri 
  //hint: code is recieved from client side as a query
  
  let payload ={
    
    client_id: process.env.REACT_APP_AUTH0_CLIENT_ID,
    client_secret: process.env.AUTH0_CLIENT_SECRET,
    code: req.query.code,
    grant_type: 'authorization_code',
    redirect_uri: `http://${req.headers.host}/auth/callback`
    
  }
  
  
  //STEP 2.)
  // WRITE a FUNCTION that RETURNS an axios POST with the payload as the body
  function tradeCodeForAccessToken(){
    
    //code here..
    return axios.post(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/oauth/token`, payload);
    
  }
  
  //STEP 3.)
  // WRITE a FUNCTION that accepts the access token as a parameter and RETURNS an axios GET to auth0 that passes the access token as a query
  function tradeAccessTokenForUserInfo(response){
    
    //code here ..
    const accessToken = response.data.access_token;
    return axios.get(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/userinfo?access_token=${accessToken}`);
    
  }
  
  
  //STEP 4.)
  
  // WRITE a FUNCTION that accepts the userInfo as a parameter and RETURNS a block of code.
  // Your code should set session, check your database to see if user exists and return thier info or if they dont exist, insert them into the database
  function storeUserInfoInDataBase(response){
    
    //code here...
    const userData = response.data;
    const db = req.app.get('db');
    return db.find_user_by_auth0_id(userData.sub).then(users => {
      if (users.length) {
        const userFromDb = users[0];
        req.session.user = userFromDb;
        res.redirect('/');
      } else {
        return db.create_user([
          userData.sub,
          userData.email,
          userData.name,
          userData.picture,
        ]).then(newUser => {
          req.session.user = newUser;
          res.redirect('/');
        });
      }
    });

    
  }
   
  //Final Code, Uncomment after completeing steps 1-4 above
  
  tradeCodeForAccessToken()
  .then(accessToken => tradeAccessTokenForUserInfo(accessToken))
  .then(userInfo => storeUserInfoInDataBase(userInfo))
  .catch(error => {
    console.log('===========server error', error);
    res.status(500).send('Check the server for error message');
  })
  
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.send();
});

app.get('/api/user-data', (req, res) => {
  res.json({ user: req.session.user });
});

function checkLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(403).json({ message: 'Unauthorized' });
  }
}

app.get('/api/secure-data', checkLoggedIn, (req, res) => {
  res.json({ someSecureData: 123 });
});

const SERVER_PORT = process.env.SERVER_PORT || 3040;
app.listen(SERVER_PORT, () => {
  console.log('Server listening on port ' + SERVER_PORT);
});
