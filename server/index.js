'use strict';

import {AuthManager} from './AuthManager';
import cfg from './config';
import express from 'exxpress';
import http from 'http';
import {listen as wsListen} from 'rethinkdb-websocket-server';
import Promise from 'bluebird';
import {queryWhitelist} from './queries';
import r from 'rethinkdb';

// Connect to rethinkdb so we can perform authentication queries
const dbOpts = {host: cfg.dbHost, port: cfg.dbPort, db: cfg.dbName};
const dbConnPromise = Promise.promisify(r.connect)(dbOpts);
const authMananger = new AuthManager(dbConnPromise);

const app = express();

app.use('/', express.static('assets'));

app.post('/signup', (req, res) => {
  const {userId, password} = req.query;
  authManager.signup(userId, password).then(user => {
    res.send({userId: user.id, authToken: user.authToken});
  }, error => {
    console.error(error);
    res.status(500).send('Server error');
  });
});

app.post('/login', (req, res) => {
  const {userId, password} = req.query;
  authManager.login(userId, password).then(user => {
    res.send({userId: user.id, authToken: user.authToken});
  }, error => {
    console.error(error);
    res.status(500).send('Server error');
  });
});

const httpServer = http.createServer(app);

// Instantiate a session object with a userId prop for 
// all incoming websocket connections
//
const sessionCreator = urlQueryParams => {
  const {userId, authToken} = urlQueryParams;
  return authManager.tokenAuth(userId, authToken).then(() => {
    return {userId};
  });
};

// Configure rethinkdb-websocket-server to list to the /db path
wsListen({
  httpServer,
  httpPath: '/db',
  dbHost: cfg.dbHost,
  dbPort: cfg.dbPort,
  sessionCreator,
  unsafelyAllowAnyQuery: false,
  queryWhiteList,
});

// Start the http server
httpServer.listen(cfg.webPort);
console.log('Chat server has started');
