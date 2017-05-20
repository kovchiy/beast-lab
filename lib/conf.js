/**
 * Конфигурация сборщика
 */
var argv = require('minimist')(process.argv)
var username = argv.user || require('child_process').execSync('whoami').toString().slice(0, -1).toLowerCase()
var root = __dirname + '/..'
var conf = {
    username: username,
    port: {
        dev: '8070',
    },
    path: {
        blocks: [
            `${root}/blocks/*/*.bml`,
            `${root}/users/${username}/blocks/*/*.bml`,
        ],
        lib: [
            `${root}/lib/typo.js`,
            `${root}/lib/colorwiz.js`,
            `${root}/lib/ajax.js`,
            `${root}/lib/missevent.js`,
            `${root}/lib/dig.js`,
            `${root}/lib/beast.js`,
            `${root}/users/${username}/lib/*.js`,
        ],
        css: [
            `${root}/blocks/Base/*.styl`,
            `${root}/blocks/Grid/*.styl`,
            `${root}/blocks/Typo/*.styl`,
            `${root}/blocks/*/*.styl`,
            `${root}/users/${username}/blocks/Base/*.styl`,
            `${root}/users/${username}/blocks/Grid/*.styl`,
            `${root}/users/${username}/blocks/Typo/*.styl`,
            `${root}/users/${username}/blocks/*/*.styl`,
        ],
        pages: [
            `${root}/pages/**/*.html`,
            `${root}/users/${username}/pages/**/*.html`,
        ],
        exp: [
            `${root}/exp`,
            `${root}/users/${username}/exp`,
        ],
        build: `${root}/build`,
    },
    repo: 'git@github.yandex-team.ru:kovchiy/serplab.git',
    repoHost: 'github.yandex-team.ru',
    repoName: 'kovchiy/serplab',
    deploy: {
        host: 'serplab.serp.yandex.ru',
        apt: ['node', 'npm', 'git'],
        nodeModules: ['forever'],
        baseDir: 'serplab',
    },
    httpHeader: {
        200: {
            'Content-Type': 'text/html',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
        },
        404: {
            'Content-Type': 'text/plain',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
        },
        500: {
            'Content-Type': 'text/plain',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
        },
        html: {
            'Content-Type': 'text/html',
        },
        js: {
            'Content-Type': 'text/javascript',
        },
        json: {
            'Content-Type': 'application/json',
        },
        css: {
            'Content-Type': 'text/css',
        },
        svg: {
            'Content-Type': 'image/svg+xml',
            'Vary': 'Accept-Encoding',
        },
        jpg: {
            'Content-Type': 'image/jpeg',
        },
        png: {
            'Content-Type': 'image/png',
        },
        gif: {
            'Content-Type': 'image/gif',
        }
    },
    user: {
        stable: {
            port: '3000'
        },
        kovchiy: {
            port: '3001',
        },
        ialexsid: {
            port: '3002',
        },
        skorotkov: {
            port: '3003',
        },
        adrior: {
            port: '3004',
        },
        prod: {
            port: '3005',
        },
        ternos: {
            port: '3006'
        },
    }
}

conf.path.js = [].concat(conf.path.lib, conf.path.blocks)

module.exports = conf