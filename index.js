'use strict';

const colors = require('./colors.js');

/**
 * @returns {number}
 * @param {number} ms 
 */

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

const mysql = require('mysql');

const connection = mysql.createConnection({
    host: "192.168.1.1",
    user: "user",
    password: "password",
    database: "mydrive",
    //connectTimeout: 2,
});

connection.connect();

/**
 * @returns {Promise<JSON>}
 * @param {string} sql
 * @param {string | string[]} args
 */

async function query(sql, args) {
    return new Promise( async (resolve, reject) => {
        connection.query(sql, async (err, results, fields) => {
            if(err) console.log(err);
            resolve(results);
        });
    });
};

/**
 * @returns {Promise<boolean>}
 * @param {string} username
 * @param {string} password
 */

async function login(username, password) {
    return new Promise( async (resolve, reject) => {
        var sql = `SELECT * FROM mydrive.users WHERE \`user\` = '${username}' && \`pass\` = '${password}'`;

        const data = await query(sql);

        if(data[0] && data[0].user === username && data[0].pass === password) {
            return resolve(true);
        } else {
            return resolve(false);
        };
    });
};

setInterval(async ()=> {
	var sql = 'SELECT * FROM mydrive.users';
	await query(sql);
}, 5*1000*60);

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const formidable = require('formidable');

/**
 * @returns {string}
 * @param {string} name 
 */

const pages = (name) => {
    return path.join(__dirname, `pages/${name}`);
};

const PORT = process.env.PORT || 8081;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'BAMA00680',
}));

// LOGGER

app.use(async (req, res, next) => {
    if(req.query.nolog == true || req.query.nolog == 'true') {
        next();
        return;
    };
    var loged = 'Sin loguear';
    if(req.session.log&&req.session.log == true) {
        loged = `Logeado como: ${req.session.user}`;
    };
    console.log(`${colors.yellow(`Se ha conectado:`)} ${colors.blue(`${req.ip.replace('::ffff:', '')} | ${loged}`)}`);
    next();
});

// LOGGIN && MAIN

app.get('/', async (req, res) => {
    if(!req.session.log) {
        res.sendFile(pages('unmain.html'));
        return;
    };
    if(req.session.log == false) {
        res.sendFile(pages('unmain.html'));
        return;
    };



    res.sendFile(pages('main.html'));
});

app.get('/login', async (req, res) => {
    if(req.session.log == true) {
        res.redirect('/');
        return;
    };
    res.sendFile(pages('login.html'));
});

app.post('/login', async (req, res) => {
    if(req.session.log == true) {


        req.session.user = null;
        req.session.pass = null;
        req.session.log = false;


        res.send(false);
        return;
    };
    var user = req.body.user;
    var pass = req.body.pass;

    var l = await login(user, pass);

    if(l == true) {


        req.session.user = user;
        req.session.pass = pass;
        req.session.log = true;

        
        res.send(true);
        return; 
    } else {
        res.send(false);
        return; 
    };
});

app.get('/unlogin', async (req, res) => {
    if(!req.session.log) {
        res.redirect('/login');
        return;
    };
    if(req.session.log == false) {
        res.redirect('/login');
        return;
    };


    req.session.user = null;
    req.session.pass = null;
    req.session.log = false;

    
    res.redirect('/login');
});

// DRIVE ZONE

app.get('/mycloud', async (req, res) => {
    if(!req.session.log) {
        res.redirect('/');
        return;
    };
    if(req.session.log == false) {
        res.redirect('/');
        return;
    };

    res.sendFile(pages('cloud.html'));
});

app.get('/api/v0/files', async (req, res) => {
    if(!req.session.log) {
        res.send(false);
        return;
    };
    if(req.session.log == false) {
        res.send(false);
        return;
    };

    var toread;

    if(!req.query.f) {
        toread = "";
    } else {
        toread = req.query.f;
    };

    if(!fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/`))) {
        await fs.mkdirSync(path.join(__dirname, `clouds/${req.session.user}`));
    };

    var files = await fs.readdirSync(path.join(__dirname, `clouds/${req.session.user}/${toread}`));
    var json = {
        dir: [],
        files: [],
    };
    for(const f of files) {
        var i;
        if(toread === "") {
            i = await fs.lstatSync(path.join(__dirname, `clouds/${req.session.user}/${f}`)).isDirectory();
        } else {
            i = await fs.lstatSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${f}`)).isDirectory();
        };
        if(i == true) {
            json.dir.push(f);
            continue;
        } else {
            json.files.push(f);
            continue;
        };
    };
    res.send(json);
});

/*app.post('/api/v0/files', async (req, res) => {
    if(!req.session.log) {
        res.send(false);
        return;
    };
    if(req.session.log == false) {
        res.send(false);
        return;
    };

    var toread;

    if(!req.query.f) {
        toread = "";
    } else {
        toread = req.query.f;
    };

    if(!fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/`))) {
        return res.send(false);
    };

    var files = await fs.readdirSync(path.join(__dirname, `clouds/${req.session.user}/${toread}`));
    var json = {
        dir: [],
        files: [],
    };
    for(const f of files) {
        var i;
        if(toread === "") {
            i = await fs.lstatSync(path.join(__dirname, `clouds/${req.session.user}/${f}`)).isDirectory();
        } else {
            i = await fs.lstatSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${f}`)).isDirectory();
        };
        if(i == true) {
            json.dir.push(f);
            continue;
        } else {
            json.files.push(f);
            continue;
        };
    };
    res.send(json);
});
*/
app.get('/d/:f', async (req, res) => {
    if(!req.session.log) {
        res.redirect('/');
        return;
    };
    if(req.session.log == false) {
        res.redirect('/');
        return;
    };

    var f = req.params.f;
    var pa;

    if(req.query.path) {
        pa = req.query.path;
    } else {
        pa = null;
    };

    if(pa == null) {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${f}`))) {
            res.download(path.join(__dirname, `clouds/${req.session.user}/${f}`));
            return;
        };
    } else {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${pa}/${f}`))) {
            res.download(path.join(__dirname, `clouds/${req.session.user}/${pa}/${f}`));
            return;
        };
    };
});

app.get('/v/:f', async (req, res) => {
    if(!req.session.log) {
        res.redirect('/');
        return;
    };
    if(req.session.log == false) {
        res.redirect('/');
        return;
    };

    var f = req.params.f;
    var pa;

    if(req.query.path) {
        pa = req.query.path;
    } else {
        pa = null;
    };

    if(pa == null) {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${f}`))) {
            res.sendFile(path.join(__dirname, `clouds/${req.session.user}/${f}`));
            return;
        };
    } else {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${pa}/${f}`))) {
            res.sendFile(path.join(__dirname, `clouds/${req.session.user}/${pa}/${f}`));
            return;
        };
    };
});

app.post('/api/v0/upload', async (req, res) => {
    if(!req.session.log) {
        res.send(false);
        return;
    };
    if(req.session.log == false) {
        res.send(false);
        return;
    };
    const form = new formidable.IncomingForm({
        multiples: true,
        encoding: 'utf-8',
        uploadDir: path.join(__dirname, `temp`),
        maxFileSize: 4000 * 1024 * 1024,
        keepExtensions: true
    });

    form.parse(req, async (err, fields, files) => {
        if(err) console.log(err);
    });

    form.on('fileBegin', async (name, file) => { //NAME = UPLOAD OR NAME IN HTML FOR THE UPLOAD
        //console.log(name);
    });

    form.on('file', async (name, file) => { //NAME = UPLOAD OR NAME IN HTML FOR THE UPLOAD
        var spl = file.name.split(".");
        const extension = spl.splice(spl.length - 1, spl.length - 1);
        const nname = spl.join(".");

        //var newPath = path.join(__dirname, `files/${file.name}`);
        //new transform(file.path, path.join(__dirname, `files/${nname}.mp4`))
        if(req.query.path) {
            fs.renameSync(file.path, path.join(__dirname, `clouds/${req.session.user}/${req.query.path}/${nname}.${extension}`));
        } else {
            fs.renameSync(file.path, path.join(__dirname, `clouds/${req.session.user}/${nname}.${extension}`));
        };
        /*fs.unlink(file.path, async (err) => {
            if(err) console.log(err);
        });*/
        res.send(true);
    });
});

app.delete('/api/v0/files', async (req, res) => {
    if(!req.session.log) {
        res.send(false);
        return;
    };
    if(req.session.log == false) {
        res.send(false);
        return;
    };

    var toread;

    if(!req.query.f) {
        toread = "";
    } else {
        toread = req.query.f;
    };


    if(toread === "") {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${req.body.file}`))) {
            await fs.unlinkSync(path.join(__dirname, `clouds/${req.session.user}/${req.body.file}`));
            return res.send(true);
        } else {
            return res.send(false);
        };
    } else {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${req.body.file}`))) {
            await fs.unlinkSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${req.body.file}`));
            return res.send(true);
        } else {
            return res.send(false);
        };
    };
});

app.post('/api/v0/dir', async (req, res) => {
    if(!req.session.log) {
        res.send(false);
        return;
    };
    if(req.session.log == false) {
        res.send(false);
        return;
    };

    var toread;

    if(!req.query.f) {
        toread = "";
    } else {
        toread = req.query.f;
    };


    if(toread === "") {
        await fs.mkdirSync(path.join(__dirname, `clouds/${req.session.user}/${req.body.dir}`));
        return res.send(true);
    } else {
        await fs.mkdirSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${req.body.dir}`));
        return res.send(true);
    };
});

app.delete('/api/v0/dir', async (req, res) => {
    if(!req.session.log) {
        res.send(false);
        return;
    };
    if(req.session.log == false) {
        res.send(false);
        return;
    };

    var toread;

    if(!req.query.f) {
        toread = "";
    } else {
        toread = req.query.f;
    };

    if(toread === "") {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${req.body.dir}`))) {
            await fs.rmdirSync(path.join(__dirname, `clouds/${req.session.user}/${req.body.dir}`), { recursive: true });
            return res.send(true);
        } else {
            return res.send(false);
        }
    } else {
        if(fs.existsSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${req.body.dir}`))) {
            await fs.rmdirSync(path.join(__dirname, `clouds/${req.session.user}/${toread}/${req.body.dir}`), { recursive: true });
            return res.send(true);
        } else {
            return res.send(false);
        }
    };
});

app.listen(PORT, async () => {
    if(PORT === 80) {
        console.log(`${colors.green('Server running in')} ${colors.yellow(`http://localhost/`)}`);
    } else {
        console.log(`${colors.green('Server running in')} ${colors.yellow(`http://localhost:${PORT}/`)}`);
    };
});
