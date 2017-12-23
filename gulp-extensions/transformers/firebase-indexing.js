'use strict';

const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const map = require('map-stream');
const firebase = require("firebase");
const firebaseConfig = require("../../firebase.js");

/**
 * This plugin parse all the asciidoc files to build a Json index file with metadata
 */
module.exports = (modeDev) => {

  let initializeDatabase = (callback) => {
    if (firebase.apps.length === 0) {
      firebase.initializeApp({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        databaseURL: firebaseConfig.databaseURL,
        storageBucket: firebaseConfig.storageBucket
      });
    }
    firebase.auth()
      .signInWithEmailAndPassword(firebaseConfig.user, firebaseConfig.password)
      .then(() => callback())
      .catch((error) => {
        throw new PluginError('asciidoctor-indexing', `Firebase authent failed : ${error.message}`);
      });
  };

  process.on('exit', () => {
    firebase.auth()
      .signOut()
      .then(() => console.log('Deconnected from Firebase'))
      .catch((error) => {
        throw new PluginError('asciidoctor-indexing', `Firebase exit failed : ${error.message}`);
      });
  });

  return map(async (file, next) => {
    const callback = () => {
      let filename = file.path.substring(file.path.lastIndexOf("/") + 1, file.path.lastIndexOf("."));

      if (file.attributes.status === 'draft') {
        next(null, file);
      }
      else {
        // Initialize counter if it does not exist
        firebase.database()
          .ref(`/stats${modeDev ? 'Dev' : ''}/${filename}`)
          .transaction(count => count ? count : 0);

        // Adds an index to this filename
        firebase.database()
          .ref(`${modeDev ? 'blogsDev' : 'blogs'}/${filename}`)
          .remove()
          .then(() => {
            firebase.database()
              .ref(`${modeDev ? 'blogsDev' : 'blogs'}/${filename}`)
              .set({
                strdate: file.attributes.strdate,
                revdate: file.attributes.revdate,
                description: file.attributes.description,
                doctitle: file.attributes.doctitle,
                keywords: file.attributes.keywords,
                filename: filename,
                category: file.attributes.category,
                teaser: file.attributes.teaser,
                imgteaser: file.attributes.imgteaser,
                modeDev : modeDev,
                dir: file.path.substring(file.path.lastIndexOf("blog/") + 5, file.path.lastIndexOf("/"))
              })
              .then(() => next(null, file))
          })
          .catch((error) => {
            throw new PluginError('asciidoctor-indexing', `Firebase insert failed : ${error.message}`);
          });
      }
    };

    initializeDatabase(callback);
  });
};






