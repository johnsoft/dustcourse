/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

import express = require('express');
import fs = require('fs');
import Promise = require('bluebird');

var app = express();
app.set('views', './views')
app.set('view engine', 'jade');

app.get('/', (req, res) => {
    var levelName = req.params.level;
    res.redirect(302, '/level/Main Nexus DX');
});

app.get('/replay/:replayId', (req, res) => {
    Promise.promisify(fs.readFile)('replay.json')
    .then(text => {
        res.header('Content-Type', 'application/json');
        res.send(text);
    })
    .catch(err => {
        console.log(err);
        res.status(404);
        res.write('sorry');
        res.end();
    });
});

app.get('/level/:levelName', (req, res) => {
    res.render('level', { levelName: req.params.levelName });
});

app.use('/assets', express.static('assets', { maxAge: 1000 * 60 * 60 }));

app.use('/static', express.static('static', { maxAge: 1000 * 60 * 60 }));

var port: number = +process.env.PORT || 3000;

var server = app.listen(port, function() {
    console.log('Express server listening on port ' + port);
});
