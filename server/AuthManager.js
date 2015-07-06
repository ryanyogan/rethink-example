'use strict';

import bcrypt from 'bcrypt';
import cfg from './config';
import crypto from 'crypto';
import Promise from 'bluebird';
import r from 'rethinkdb';

export class AuthManager {
  constructor(dbConnPromise) {
    this.dbConnPromise = dbConnPromise;
  }

  _run(query) {
    return this.dbConnPromise.then(c => query.run(c));
  }

  _hashPassword(password) {
    return Promise.promisify(bcrypt.hash)(password, cfg.bcryptRounds);
  }

  _comparePassword(password, hashedPassword) {
    return Promise.promisify(bcrypt.compare)(password, hashedPassword);
  }

  _genAuthToken() {
    return Promise.promisify(crypto.randomBytes)(cfg.authTokenBytes).then(buf => {
      return buf.toString('base64');
    });
  }

  // Create a user in the db and return a promise that returns
  // the user object.  The promise will reject on errors, such as dups

  login(userId, password) {
    return this._run(r.table('users').get(userId)).then(user => {
      if (!user) {
        return Promise.reject('Non-existent user');
      }

      return this._comparePassword(password, user.hashedPassword).then(matches => {
        return matches ? user : Promise.reject('Incorrect password')
      });
    });
  }

  tokenAuth(userId, authToken) {
    const query = r.table('user').get(userId).getField('authToken').eq(authToken);
    return this._run(query).then(success => {
      return success ? true : Promise.reject('Authentication failure');
    });
  }
}
