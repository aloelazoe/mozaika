#!/usr/bin/env node
const http = require('http');
const path = require('path');
const fse = require('fs-extra');
const connect = require('connect');
const bodyParser = require('body-parser');
const send = require('send');
// might use it to open url in browser automatically
const open = require('open');

const defaultPort = 6090;
const tokenTypes = {
    path: /{@(.*)@}/gm,
    content: /{#(.*)#}/gm,
};

function main() {
    console.log('cwd:', process.cwd());
    console.log('__dirname:', __dirname);
    // console.log('argv:', process.argv);

    let tokens = null;
    let indexTemplate = null;
    let server = null;
    let app = connect();

    app.use(bodyParser.urlencoded({ extended: true }));

    app.use((req, res) => {
        // console.log({
        //     url: req.url,
        //     method: req.method,
        // });

        if (req.method === 'POST') {
            // respond with index.html after customizing it according to form data in url,
            // or redirect to the menu
            if (req.body && indexTemplate && tokens) {
                // todo: also check if existing token data is invalid
                // todo: make sure we use the same exact data from index.html that we used to create options for the menu from
                // console.log('req.body:');
                // console.log(req.body);

                // update tokens with the form data from the request
                Object.entries(req.body).forEach((entry) => {
                    // separate the index from key i.e. 'key0' => 'key', 0
                    let key = Object.keys(tokens).find((k) => entry[0].indexOf(k) !== -1);
                    let idx = parseInt(entry[0].split(key)[1]);
                    tokens[key].selected[idx] = entry[1];
                });

                // console.log('updated tokens:');
                // console.log(tokens);

                // fill in data in index.html according to the tokens
                // also generate data for the widget
                let indexFilled = indexTemplate;
                let widgetHtml = '';
                Object.entries(tokens).forEach((entry) => {
                    const key = entry[0];
                    const token = entry[1];
                    for (let i = 0; i < token.selected.length; i++) {
                        const relPath = path.join(key, token.selected[i]);
                        let replacement;
                        switch (token.type) {
                            case 'content':
                                replacement = fse.readFileSync(path.join(process.cwd(), relPath), 'utf8');
                                break;
                            case 'path':
                            default:
                                replacement = relPath;
                        }
                        indexFilled = indexFilled.replace(token.match, replacement);
                        widgetHtml += `<p>${token.selected[i]}</p>\n`;
                    }
                });

                // add a widget showing what files are currently open
                if (widgetHtml !== '') {
                    let widgetTemplate = fse.readFileSync(path.join(__dirname, 'widget.html'), 'utf8');
                    widgetTemplate = widgetTemplate.replace('</div>', widgetHtml + '</div>');
                    indexFilled = indexFilled.replace('</body>', widgetTemplate + '</body>');
                }

                res.writeHead(200, { "content-type": "text/html" });
                res.end(indexFilled);
            } else {
                res.writeHead(303,
                    // using 303 status code to make sure redirected page will be displayed with GET method
                    { location: 'http://localhost:' + (server && server.address().port) }
                );
                res.end();
            }
        } else if (req.url === '/') {
            // respond with menu after generating forms according to tokens found in index.html and folder sctructure
            indexTemplate = fse.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
            // reset tokens
            tokens = {};
            // find tokens
            Object.keys(tokenTypes).forEach((tokenType) => {
                // tokenMatches.push([...indexTemplate.matchAll(tokenTypes[tokenType])]);
                [...indexTemplate.matchAll(tokenTypes[tokenType])].forEach((m) => {
                    // key will be the string inside the capturing group
                    let key = m[1];
                    if (key) {
                        if (tokens[key]) {
                            tokens[key].count++;
                        } else {
                            tokens[key] = {
                                match: m[0], // save the whole match to replace it later
                                type: tokenType,
                                options: [],
                                selected: [],
                                count: 1,
                            }
                        }
                    }
                });
            });

            // get a list of options for each token by scanning a folder that it point to
            Object.keys(tokens).forEach((k) => {
                let dir;
                try {
                    dir = fse.opendirSync(path.join(process.cwd(), k));
                    while (true) {
                        curEnt = dir.readSync();
                        if (!curEnt) break;
                        if (curEnt.isFile() && !curEnt.name.startsWith('.')) {
                            tokens[k].options.push(curEnt.name);
                        }
                    }
                    dir.closeSync();
                } catch (err) {
                    console.error(`couldn't open ${k}:`, err.code === 'ENOENT' ? "directory doesn't exist" : err);
                    // todo: show in menu html that the folder wasn't found
                    delete tokens[k];
                    return;
                }
            });

            // create a string with generated form elements
            let formHtml = '';
            Object.entries(tokens).forEach((entry) => {
                let key = entry[0];
                let token = entry[1];
                for (let i = 0; i < token.count; i++) {
                    let formChunk = '';
                    formChunk += `<p>${key}:</p>\n`;
                    token.options.forEach((option, idx) => {
                        formChunk += `<input type="radio" id="${key + idx}" name="${key + i}" value="${option}"${idx === 0 ? 'checked="true"' : ''}>\n`;
                        formChunk += `<label for="${key + idx}">${option}</label><br>\n`;
                    });
                    formHtml += formChunk + '\n<br>\n';
                }
            });
            // put form elements in menu html
            let menu = fse.readFileSync(path.join(__dirname, 'menu.html'), 'utf8');
            menu = menu.replace('</body>', `<form method="POST">\n ${formHtml} <input type="submit" value="submit"><br>\n</form>\n</body>`);

            // console.log('tokens:');
            // console.log(tokens);

            // res.writeHead(200, {"content-type": "application/json"});
            // res.write(JSON.stringify(tokens));
            res.writeHead(200, { "content-type": "text/html" });
            res.end(menu);
        } else {
            // respond with the file specified in url
            // res.writeHead(200, {"content-type": "text/plain"});
            // res.end(`the following url was requested: ${req.url}`);
            // todo: use send library to send files
            send(req, req.url, { root: process.cwd() })
                .pipe(res)
        }
    });

    server = http.createServer(app);
    server.on('listening', () => {
        const address = 'http://localhost:' + server.address().port;
        console.log('hosting mozaika at', address);
        open(address);
    });
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`default port ${defaultPort} is already in use, retrying with a random port`);
            server.close();
            server.listen();
        } else {
            console.error(e);
            server.close();
        }
    });
    server.listen(parseInt(process.argv[2]) || defaultPort, '127.0.0.1');
}

main();
