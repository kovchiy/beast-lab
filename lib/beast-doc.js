/**
 * @lib BeastDoc парсер документации компонентов
 * @ver 0.1.0
 */

// Форматы документации:
// @block BlockName Описание блока
// @elem ElementName Описание элемента
// @mod ModifierName {value1 value2!} Описание модификатора с указанием значений (! по умолчанию) или типа
// @param ParameterName {type} Описание параметра с указанием типа
// @lib LibraryName Описание библиотеки
// @ver Версия компонента
// @url Адрес страницы компонента
// @tag tag1 tag2 - Теги через пробел
// @dep block1 block2 - Зависимости от блоков через пробел
// @event EventName Описание события
// @data {type} Что передается в событие
// @method MethodName Описание метода
// @arg ArgumentName {type} Описание аргумента метода
// @return {type} Описание результата метода
// @ext BlockName Наследование документации
// @example BML-код примера
/**
 * @keyWord Title
 * Дополнительный текст к @keyWord
 */

var commentRegExp = /(\/\/\s*@.+$|\/\*(?!\*\/)*\*\/)/gi
var trimCommentRegExp = /^\s*\*+\s*|^\s*|\s*$/g
var softTrimCommentRegExp = /^\s*\*+\s?/g
var spacesRegExp = /\s{2,}/g
var keyWordRegExp = {
    block: /^@block\s/,
    tag: /^@tag\s/,
    dep: /^@dep\s/,
    elem: /^@elem\s/,
    mod: /^@mod\s/,
    param: /^@param\s/,
    event: /^@event\s/,
    data: /^@data\s/,
    method: /^@method\s/,
    arg: /^@arg\s/,
    'return': /^@return\s/,
    ext: /^@ext\s/,
    example: /^@example(?:\s|$)/,
    lib: /^@lib\s/,
}

function parseDoc (text) {
    // Вычленить содержимое комментариев
    var doubleQuoteOpen = false
    var singleQuoteOpen = false
    var escapeChar = false
    var char = ''
    var prevChar = ''
    var singleCommentOpen = false
    var multiCommentOpen = false
    var multiCommentAfterKeyword = false
    var comment = ''
    var comments = []

    function pushComment() {
        var origin = comment
        comment = comment.replace(trimCommentRegExp, '').replace(spacesRegExp, ' ')
        if (comment !== '') {
            if (singleCommentOpen && comment[0] === '@') {
                comments.push(comment)
            }
            if (multiCommentOpen && comment[0] === '@') {
                multiCommentAfterKeyword = true
                comments.push(comment)
            } else if (multiCommentOpen && multiCommentAfterKeyword) {
                comments.push(origin.replace(softTrimCommentRegExp, ''))
            }
            comment = ''
        }
    }

    for (var i = 0, ii = text.length; i < ii; i++) {
        char = text[i]
        prevChar = i > 0 ? text[i-1] : ''

        // Case: \
        if (char === '\\' && prevChar === '\\') {
            prevChar = ''
        }
        // Case: "
        if (char === '"') {
            if (singleCommentOpen || multiCommentOpen) {
                comment += char
            }
            if (prevChar === '\\') {
                continue
            }
            if (singleQuoteOpen) {
                continue
            }
            if (doubleQuoteOpen) {
                doubleQuoteOpen = false
                continue
            }
            doubleQuoteOpen = true
            continue
        }
        // Case: '
        if (char === "'") {
            if (singleCommentOpen || multiCommentOpen) {
                comment += char
            }
            if (prevChar === '\\') {
                continue
            }
            if (doubleQuoteOpen) {
                continue
            }
            if (singleQuoteOpen) {
                singleQuoteOpen = false
                continue
            }
            singleQuoteOpen = true
            continue
        }
        // Case: //
        if (prevChar === '/' && char === '/' && !singleQuoteOpen && !singleQuoteOpen && !singleCommentOpen) {
            singleCommentOpen = true
            continue
        }
        // Case: /*
        if (prevChar === '/' && char === '*' && !singleQuoteOpen && !singleQuoteOpen && !multiCommentOpen) {
            multiCommentOpen = true
            continue
        }
        // Case: //...\n, /*...*/
        if (char === '\n' && singleCommentOpen ||
            prevChar === '*' && char === '/' && multiCommentOpen ||
            i === ii-1 && (singleCommentOpen || multiCommentOpen)
        ) {
            if (i === ii-1 && singleCommentOpen) {
                comment += char
            }
            pushComment()
            singleCommentOpen = false
            multiCommentOpen = false
            multiCommentAfterKeyword = false
            continue
        }
        // Case: /*...\n
        if (char === '\n' && multiCommentOpen) {
            pushComment()
            continue
        }

        if (singleCommentOpen || multiCommentOpen) {
            comment += char
            continue
        }
    }

    var docs = {}
    var blocks = {}
    var libs = {}
    var tags = []
    var parentBlock = undefined
    var parentElem = undefined
    var parentLib = undefined
    var parentMethod = undefined
    var parentEvent = undefined
    var prevDoc = undefined

    function pushDoc (type, text) {
        var doc = {type: type}
        var name = text.substring(0, text.indexOf(' ')) || text

        function pushToParent (parent, doc) {
            if (parent === undefined) {
                return
            }
            if (doc.type === 'block' || doc.type === 'lib') {
                parent[doc.name.toLowerCase()] = doc
                return
            }
            if (parent[doc.type] === undefined) {
                parent[doc.type] = {}
            }
            parent[doc.type][doc.name.toLowerCase()] = doc
        }

        function pushTags (blockTags) {
            for (var i = 0, ii = blockTags.length; i < ii; i++) {
                if (tags.indexOf(blockTags[i]) === -1) {
                    tags.push(blockTags[i])
                }
            }
        }

        /*
         * Работа с именем элемента документации
         */

        // Для элемента отделить собственное имя от блока
        if (type === 'elem' && name.indexOf('__') !== -1) {
            name = name.split('__')
            doc.name = name[1]

            if (blocks[name[0].toLowerCase()] === undefined) {
                pushToParent(blocks, {type: 'block', name: name[0]})
            }
            parentBlock = blocks[name[0].toLowerCase()]
            pushToParent(parentBlock, doc)
            parentElem = doc
        }
        // Для остальных, кроме примера и доп. текста передать имя как есть
        else if (type !== false && type !== 'example') {
            doc.name = name
        }

        /*
         * Соподчинение типов
         */
        if (type === 'block') {
            pushToParent(blocks, doc)
            parentBlock = doc
            parentElem = undefined
        }
        else if (type === 'mod' || type === 'param') {
            pushToParent(parentElem || parentBlock, doc)
        }
        else if (type === 'ext') {
            (parentElem || parentBlock)[type] = text.toLowerCase().split(' ')
            text = ''
        }
        else if (type === 'method') {
            pushToParent(parentElem || parentBlock || parentLib, doc)
            parentMethod = doc
        }
        else if (type === 'arg' || type === 'return') {
            pushToParent(parentMethod, doc)
        }
        else if (type === 'event') {
            pushToParent(parentElem || parentBlock, doc)
            parentEvent = doc
        }
        else if (type === 'data') {
            pushToParent(parentEvent, doc)
        }
        else if (type === 'example') {
            if (parentBlock.example === undefined) {
                parentBlock.example = []
            }
            parentBlock.example.push(doc)
        }
        else if (type === 'tag') {
            text = text.toLowerCase().split(' ')
            parentBlock[type] = text
            pushTags(text)
            text = ''
        }
        else if (type === 'dep') {
            if (parentBlock[type] === undefined) {
                parentBlock[type] = []
            }
            parentBlock[type] = parentBlock[type].concat(
                text.toLowerCase().split(' ')
            )
            text = ''
        }
        else if (type === 'lib') {
            pushToParent(libs, doc)
            parentLib = doc
        }
        else if (type === false) {
            if (prevDoc !== undefined) {
                if (prevDoc.type === 'example') {
                    if (prevDoc.text === undefined) {
                        prevDoc.text = ''
                    } else if (prevDoc.text !== '') {
                        prevDoc.text += '\n'
                    }
                    prevDoc.text += text
                } else {
                    if (prevDoc.extra === undefined) {
                        prevDoc.extra = []
                    }
                    prevDoc.extra.push(text)
                }
            }
        }

        /*
         * Работа остатком text после отделения имени
         */
        if (type === 'example') {
            var indexOfLt = text.indexOf('<')
            if (indexOfLt > 0) {
                doc.text = text.substring(indexOfLt)
                doc.extra = text.substring(0, indexOfLt - 1)
            }
        }
        else if (text !== '') {
            text = text.substring(text.indexOf(' ') + 1)

            if (text !== '') {

                // Работа с типом {...}
                if (text[0] === '{') {
                    var value = text.substring(1, text.indexOf('}'))
                    if (value.indexOf(' ') === -1) {
                        doc.value = value
                    } else {
                        doc.value = {}
                        value = value.split(' ')
                        for (var i = 0, ii = value.length; i < ii; i++) {
                            doc.value[value[i].replace('!', '')] = value[i].indexOf('!') !== -1
                        }
                    }

                    text = text.substring(text.indexOf('}') + 2)
                }

                doc.text = text
            }
        }

        if (type !== false && type !== 'tag') {
            prevDoc = doc
        }
    }

    for (var i = 0, ii = comments.length, keyWordMatch; i < ii; i++) {
        comment = comments[i]
        keyWordMatch = false

        for (var key in keyWordRegExp) {
            if (keyWordRegExp[key].test(comment)) {
                pushDoc(
                    key,
                    comment.indexOf(' ') !== -1
                        ? comment.substring(comment.indexOf(' ') + 1)
                        : ''
                )
                keyWordMatch = true
                break
            }
        }

        if (!keyWordMatch) {
            pushDoc(false, comment)
        }
    }

    return {
        blocks: blocks,
        libs: libs,
        tags: tags,
    }
}

function extendDoc (doc, newDoc, deep) {
    if (deep === undefined) {
        // Сбор уникальных тегов
        if (doc.tags === undefined) {
            doc.tags = []
        }
        for (var i = 0, ii = newDoc.tags.length; i < ii; i++) {
            if (doc.tags.indexOf(newDoc.tags[i]) === -1) {
                doc.tags.push(newDoc.tags[i])
            }
        }
    }

    // Склейка объектов документации
    for (var key in newDoc) {
        if (deep === undefined && key === 'tags') {
            continue
        }

        if (doc[key] === undefined) {
            doc[key] = newDoc[key]
        } else if (Array.isArray(newDoc[key])) {
            doc[key] = newDoc[key].concat(doc[key])
        } else if (typeof newDoc[key] === 'object') {
            extendDoc(doc[key], newDoc[key], true)
        } else {
            doc[key] = newDoc[key]
        }
    }
}

function compileDoc (doc) {

    function clone (ctx) {
        if (Array.isArray(ctx)) {
            var array = []
            for (var i = 0, ii = ctx.length; i < ii; i++) {
                array.push(
                    clone(ctx[i])
                )
            }
            return array
        }
        else if (typeof ctx === 'object' && ctx !== null) {
            var object = {}
            for (var key in ctx) {
                object[key] = clone(ctx[key])
            }
            return object
        }
        else {
            return ctx
        }
    }

    function extend (o1, o2, extName, deep) {
        var extendKeys = ['mod', 'param', 'method', 'event']
        for (var key in o2) {
            if (deep || extendKeys.indexOf(key) !== -1) {
                if (o1[key] === undefined) {
                    o1[key] = typeof o2[key] === 'object' ? clone(o2[key]) : o2[key]
                    if (deep) {
                        o1[key].source = extName
                    } else {
                        for (var key2 in o1[key]) o1[key][key2].source = extName
                    }
                } else if (typeof o2[key] === 'object' && !Array.isArray(o2[key])) {
                    extend(o1[key], o2[key], extName, true)
                }
            }
        }
    }

    function inherit (docItem, ext) {
        for (var i = 0, ii = ext.length; i < ii; i++) {
            var extDocItem = doc.blocks[ext[i]]
            if (extDocItem !== undefined) {
                extend(docItem, extDocItem, extDocItem.name)
                if (extDocItem.ext !== undefined) {
                    inherit(docItem, extDocItem.ext)
                }
            }
        }
    }

    for (var b in doc.blocks) {
        if (doc.blocks[b].ext) {
            inherit(doc.blocks[b], doc.blocks[b].ext)
        }

        if (doc.blocks[b].elem) {
            for (var e in doc.blocks[b].elem) {
                if (doc.blocks[b].elem[e].ext) {
                    inherit(doc.blocks[b].elem[e], doc.blocks[b].elem[e].ext)
                }
            }
        }
    }

    return doc
}

module.exports = {
    parseDoc: parseDoc,
    extendDoc: extendDoc,
    compileDoc: compileDoc,
}