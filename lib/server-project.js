/**
 * @lib ProjectServer Веб-сервер проектов
 * @ver 0.1.0
 * @arg --port {8070!} Порт
 */
var argv = require('minimist')(process.argv)
var http = require('http')
var httpRequest = require('request')
var url = require('url')
var qs = require('querystring')
var fs = require('fs')
var execSync = require('child_process').execSync
var doc = require('../build/doc-module')
var conf = require('./conf')

var staticPathRegExp = /\.(?:jpg|png|gif|svg|mp3|mp4|zip|html|css|js)$/
var imageExt = ['jpg', 'png', 'gif', 'svg']
var meta = '<meta name="bml">'

if (!argv.port) {
    argv.port = conf.port.dev
}

// В режиме разработчика сервер следит на файлами сборщика
// и перезагружает их при изменении
if (argv.dev) {
    var timeout
    fs.watch(conf.path.build + '/blocks', function () {
        if (timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(function () {
            fileContent = readBlocksFiles()
        }, 100)
    })
}

function readBlocksFiles () {
    var content = {
        lib: fs.readFileSync(conf.path.build + '/lib.js').toString(),
        blocks: {
            js: {},
            css: {},
        },
    }

    fs.readdirSync(conf.path.build + '/blocks').forEach(filename => {
        if (filename[0] === '.') {
            return
        }

        var nameExt = filename.split('.')
        var name = nameExt[0]
        var ext = nameExt[1]

        content.blocks[ext][name] = fs.readFileSync(
            conf.path.build + '/blocks/' + filename
        ).toString()
    })

    return content
}
var fileContent = readBlocksFiles()

/**
 * Запуск сервера
 */
http.createServer(function (request, response) {
    var param = url.parse(request.url, true)
    var query = param.query
    var path = param.pathname
    var pathIsStatic = staticPathRegExp.test(path)

    request.query = query

    if (path !== '/' && path.slice(-1) === '/') {
        path = path.slice(0, -1)
    }

    // Статичный файл
    if (pathIsStatic) {
        responseFile(request, response, path)
    }
    // Документация
    else if (/^\/doc\/?$/.test(path)) {
        responseFile(request, response, '/pages/doc/console.html')
    }
    // Пример документации
    else if (/^\/doc\/example\/?$/.test(path)) {
        responseFile(request, response, '/pages/doc/example.html')
    }
    // Живой поиск
    else if (path === '/search') {
        responseFile(request, response, '/pages/search/serp.html')
    }
    // API Поиск
    else if (path === '/api/search') {
        var ua = request.headers['user-agent']
        var uaIsMobile = ua.match(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i) !== null
        var path = uaIsMobile ? '/search/touch/' : '/search/'
        var qs = request.url.split('?').pop()

        httpRequest(
            {
                url: `http://hamster.yandex.ru${path}?${qs}`,
                headers: {
                    'user-agent': ua,
                },
                gzip: true,
            },
            (error, res, body) => {
                if (res && res.statusCode === 200) {
                    response.setHeader('Content-Type', 'application/json')
                    response.end(body)
                } else {
                    response.writeHead(500, conf.httpHeader[500])
                    response.end()
                }
            }
        )
    }
    // 404
    else {
        response.writeHead(404, conf.httpHeader[404])
        response.end('404')
    }
})
.listen(argv.port)

console.log(`Project server is running on http://localhost:${argv.port}`)

function replaceMetaWithSources (string, callback) {
    var metaEndIndex = string.indexOf(meta) + meta.length
    var stringJS = fileContent.lib + ';\n'
    var stringCSS = ''
    var blocks = blocksWithDeps(
        parseBlockNames(string)
    )

    for (var i = 0, ii = blocks.length; i < ii; i++) {
        stringJS += (fileContent.blocks.js[blocks[i]] || '') + ';\n'
        stringCSS += (fileContent.blocks.css[blocks[i]] || '') + '\n'
    }

    return (
        string.slice(0, metaEndIndex) +
        '<script type="text/javascript">' + stringJS + '</script>' +
        '<style>' + stringCSS + '</style>' +
        string.slice(metaEndIndex)
    )
}

function blocksWithDeps (blocks, collection) {
    var blocksLength = blocks.length
    var deps = []
    for (var i = 0, ii = blocks.length, blockDoc; i < ii; i++) {
        blockDoc = doc[blocks[i]]
        if (blockDoc !== undefined && blockDoc.dep !== undefined) {
            if (collection === undefined) {
                deps = deps.concat(blockDoc.dep)
            } else {
                for (var j = 0, jj = blockDoc.dep.length; j < jj; j++) {
                    if (collection.indexOf(blockDoc.dep[j]) === -1) {
                        deps.push(blockDoc.dep[j])
                    }
                }
            }
        }
    }

    if (deps.length !== 0) {
        blocks = blocks.concat(deps)
        blocks = blocks.concat(
            blocksWithDeps(deps, blocks)
        )
    }

    return collection === undefined
        ? Array.from(new Set(blocks)) // Remove duplicates
        : blocks
}

var blockNameRe = /<([A-Z][A-Za-z0-9]*)[\s\/>]/g
function parseBlockNames (string) {
    string = string.slice(string.indexOf('<script type="bml">'))

    var match
    var blockNames = []
    while (match = blockNameRe.exec(string)) {
        blockNames.push(match[1].toLowerCase())
    }

    return blockNames
}

function addStaticForExperiments (string, exp) {
    var indexOfBml = string.indexOf('<script type="bml">')
    if (indexOfBml !== -1) {
        var embedString = ''
        for (var i = 0, ii = exp.length; i < ii; i++) {
            embedString += `<script type="text/javascript" src="/build/exp/${exp[i]}.js"></script>`
            embedString += `<link type="text/css" rel="stylesheet" href="/build/exp/${exp[i]}.css">`
        }
        string = string.substring(0, indexOfBml) + embedString + string.substring(indexOfBml)
    }

    return string
}

function responseFile (request, response, path) {
    var filePath = path.slice(1)
    var fileExt = path.split('.').pop()

    if (fileExt === 'html' && filePath.substr(0,6) !== 'pages/') {
        filePath = `users/${conf.username}/pages/${filePath}`
    }
    else if (
        imageExt.indexOf(fileExt) !== -1 &&
        filePath.substr(0,7) !== 'assets/' &&
        filePath.substr(0,7) !== 'blocks/'
    ) {
        filePath = `users/${conf.username}/assets/${filePath}`
    }

    if (conf.httpHeader[fileExt] !== undefined) {
        for (var name in conf.httpHeader[fileExt]) {
            response.setHeader(name, conf.httpHeader[fileExt][name])
        }
    }

    if (fileExt === 'html') {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                response.writeHead(404, conf.httpHeader[404])
                response.end('404')
            } else {
                var string = data.toString()

                // Заменить meta-тег на статику
                if (string.indexOf(meta) !== -1) {
                    string = replaceMetaWithSources(string)
                }

                // Добавить статику для экспериментов
                if (request.query.exp) {
                    string = addStaticForExperiments(
                        string, request.query.exp.split(/;|,/)
                    )
                }

                response.end(string)
            }
        })
    } else {
        var readStream = fs.createReadStream(filePath)
        readStream.pipe(response)
        readStream.on('error', function() {
            response.writeHead(404, conf.httpHeader[404])
            response.end('404')
        })
    }
}