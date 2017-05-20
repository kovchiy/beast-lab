/**
 * @lib Typo Работа со строками
 * @ver 0.8.1
 */

var Typo = {}

if (typeof window === 'undefined') {
    module.exports = Typo
}

;(function () {

var regExp = {
    squareBracketOpen: /\[/g,
    squareBracketClose: /\]/g,
    squareBrackets: /\[|\]/g,
    urlWastes: /^(?:(?:[a-z]+:)?\/\/)?(?:www\.)?|(?:\.(?:html?|php))?\/?(?:\?.*)?$|\/?%.*$/ig,
    urlDomainOnly: /^(?:(?:[a-z]+:)?\/\/)?(?:www\.)?|\/.*$/g,
    floatNumberTail: /[,\.]\d*/,
    formatNumber: /(\d)(?=(\d\d\d)+(?!\d))/g,
    letter: /[a-zа-я]/i,
    expression: /^[0-9\.\(\)\s\*\/+-]*$/,
    number: /^[-]?[0-9]+(?:[,\.][0-9]+)?$/,
    nbsp: /\u00A0/g,
    trimSpaces: /^\s+|\s+$/g,
    bTags: /<b>|<\/b>/g,
    htmlTag: /<\/?[a-z][^>]*>/gi,
    specialChar: /&[a-z]+;/g,
    specialCharNbsp: /&nbsp;/g,
    specialCharMdash: /&mdash;/g,
    hashtag: /#([a-z0-9\/_-]+)/gi,
}
Typo.regExp = regExp

var char = {
    nbsp: '\u00A0',
    thinsp: '\u2009',
    minus: '−',
    wbr: '\u00AD',

}
Typo.char = char

var locale = 'ru'

/**
 * @method squareBracketsToTagB Заменить в тексте ноды скобки [...] на тэги <b>...</b>
 * @arg domNode {object} DOM-нода
 */
Typo.squareBracketsToTagB = function (domNode) {
    for (var i = 0, ii = domNode.childNodes.length, node; i < ii; i++) {
        node = domNode.childNodes[i]

        if (node.nodeType === 1) {
            Typo.squareBracketsToTagB(node)
        } else if (node.nodeType === 3) {
            var span = document.createElement('span')
            span.innerHTML = node.textContent
                .replace(regExp.squareBracketOpen, '<b>')
                .replace(regExp.squareBracketClose, '</b>')

            for (var j = 0, jj = span.childNodes.length; j < jj; j++) {
                node.parentNode.insertBefore(span.childNodes[j], node)
                j--
                jj--
            }

            node.parentNode.removeChild(node)
        }
    }
}

Typo.hashtagReplace = function (domNode, replaceString) {
    if (replaceString === undefined) {
        replaceString = '<a href="$1">#$1</a>'
    }

    for (var i = 0, ii = domNode.childNodes.length, node; i < ii; i++) {
        node = domNode.childNodes[i]

        if (node.nodeType === 1) {
            Typo.hashtagReplace(node, replaceString)
        } else if (node.nodeType === 3) {
            var span = document.createElement('span')
            span.innerHTML = node.textContent
                .replace(/</g,'&lt;')
                .replace(regExp.hashtag, replaceString)

            for (var j = 0, jj = span.childNodes.length; j < jj; j++) {
                node.parentNode.insertBefore(span.childNodes[j], node)
                j--
                jj--
            }

            node.parentNode.removeChild(node)
        }
    }
}


Typo.clearSquareBrackets = function (string) {
    return string.replace(regExp.squareBrackets, '')
}

Typo.trimSpaces = function (string) {
    return string.replace(regExp.trimSpaces, '')
}

Typo.clearHtml = function (string) {
    return string
        .replace(regExp.htmlTag, '')
        .replace(regExp.specialCharMdash, '—')
        .replace(regExp.specialCharNbsp, ' ')
        .replace(regExp.specialChar, '')
}

/*
 * Cleaners
 */
Typo.cleanUrl = function (string) {
    //return decodeURIComponent(string).replace(regExp.urlWastes, '').toLowerCase()
    return string.replace(regExp.urlWastes, '').toLowerCase()
}
Typo.urlDomain = function (string) {
    return string.replace(regExp.urlDomainOnly, '').toLowerCase()
}

Typo.cleanSnippetTitle = function (string) {
    string = string
        .replace(snippetTitleRegExp.rub, '$1₽')
        .replace(snippetTitleRegExp.numberSpace, "$1" + char.nbsp)
        .replace(snippetTitleRegExp.spaceBeforePunctuation, "$1")
        .replace(snippetTitleRegExp.extremeEllipsis, '')
        .replace(snippetTitleRegExp.fakeEllipsis, '…')
        .replace(snippetTitleRegExp.dash, ' – ')
        .replace(snippetTitleRegExp.separator, '. ')
        .replace(snippetTitleRegExp.shortWordNowrap, char.nbsp + "$1")
        .replace(snippetTitleRegExp.parasiteDot, "$1")

    var capitalWords = string.match(snippetTitleRegExp.capitalWord)
    if (capitalWords !== null) {
        for (var i = 0, ii = capitalWords.length; i < ii; i++) {
            string = string.replace(capitalWords[i], capitalWords[i].toLowerCase())
        }
    }

    string = Typo.firstLetterUpperCase(string)

    return string
}
var snippetTitleRegExp = {
    rub: /([^а-я])руб\./ig,
    extremeEllipsis: /^\.\.\.|\.\.\.$/g,
    fakeEllipsis: /\.{2,}/g,
    dash: /\s[-—]\s/g,
    separator: /\s[|\/<>•·]\s(?![0-9])/g,
    capitalWord: /([A-ZА-Я]{4,})/g,
    shortWordNowrap: /\s([^\s]{,4})$/i,
    numberSpace: /([0-9]\]?)\s/g,
    spaceBeforePunctuation: /\s([.,;:!?])/g,
    parasiteDot: /([.,;:!?])\.|\.$/,
}

Typo.cleanAddress = function (string) {
    // Развернуть адрес: улица дом, город, район, область

    return string
}
Typo.cleanWorkingTime = function (string) {
    // Дни недели скоратить до ПН, ВТ...
    // Слова с большой: Еждневно
    // Все промежутки оформить через короткое тире: сб,вс пн-пт
    // Поставить пробелы после запятой и точки с запятой

    return string
}

Typo.removeBTags = function (string) {
    return string.replace(regExp.bTags, '')
}

Typo.firstLetterUpperCase = function (string) {
    var i = 0
    var ii = string.length

    while (i < ii && Typo.isPunctuation(string[i])) {
        i++
    }
    if (i === ii) {
        return string
    }

    return string.substring(0,i) + string.substr(i,1).toUpperCase() + string.slice(i+1)
}

Typo.formatFakeCaps = function (string) {
    if (string.length <= 3) {
        return string
    }

    return Typo.firstLetterUpperCase(
        string.toLowerCase()
    )
}

Typo.formatNumber = function (number) {
    if (typeof number === 'number') {
        number = number.toString()
    }

    if (!regExp.number.test(number)) {
        return ''
    }

    number = number.split('.')

    if (number[0].replace('-', '').length > 4) {
        number[0] = number[0]
            .replace(regExp.formatNumber, '$1' + char.nbsp)
            .replace('-', char.minus)
    }

    number = number.join(',')

    return number
}

Typo.parseFormattedNumber = function (formattedNumber) {
    var number = parseFloat(
        formattedNumber.replace(',', '.').replace(regExp.nbsp, '')
    )

    return isNaN(number) ? 0 : number
}

Typo.formatPrice = function (from, to, currencyCode) {
    if (typeof from === 'string') {
        from = parseFloat(from)
    }

    if (typeof currencyCode === 'undefined') {
        currencyCode = to
        to = false
    } else if (typeof to === 'string') {
        to = parseFloat(to)
    }

    currencyCode = currencyCode.toUpperCase()

    var symbol = currencySymbol[currencyCode] || currencyCode

    if (to) {
        return Typo.formatNumber(from) + char.nbsp + '–' + char.nbsp + Typo.formatNumber(to) + char.nbsp + symbol
    } else {
        return Typo.formatNumber(from) + char.nbsp + symbol
    }
}
var currencySymbol = {
    RUB:'₽',
    RUR:'₽',
    ' РУБ.':'₽',
    ' РУБ.':'₽',
    'РУБ.':'₽',
    'РУБ':'₽',
    'Р.':'₽',
    'Р':'₽',
    'РУБЛЬ':'₽',
    'РУБЛЯ':'₽',
    'РУБЛЕЙ':'₽',

    USD:'$',
    EUR:'€',
    GBP:'£',
    JPY:'¥',
    CNY:'¥',
    UAH:'₴',
    ILS:'₪',
    GEL:'ლ',
}

Typo.formatRange = function (from, to, unit) {
    return from + char.nbsp + '–' + char.nbsp + to + (unit ? char.nbsp + unit : '')
}

Typo.isLetter = function (symbol) {
    if (symbol === '') return false

    var charCode = symbol.charCodeAt(0)
    return charCode >= 65 && charCode <= 122 || charCode >= 1040 && charCode <= 1103
}

Typo.isCapitalLetter = function (symbol) {
    if (symbol === '') return false

    var charCode = symbol.charCodeAt(0)
    return charCode >= 65 && charCode <= 90 || charCode >= 1040 && charCode <= 1071
}

Typo.isDigit = function (symbol) {
    var charCode = symbol.charCodeAt(0)
    return charCode >= 48 && charCode <= 57
}

Typo.isPunctuation = function (symbol) {
    if (symbol === '') return false

    return punctuationSybmols.indexOf(symbol) !== -1
}
var punctuationSybmols = [
    '.', ',', ';', ':', '!', '?', '[', ']', '(', ')', '{', '}', '-', '–', '—', '<', '>', '«', '»',
]

Typo.hasLetters = function (string) {
    return regExp.letter.test(string)
}

Typo.isExpression = function (string) {
    return regExp.expression.test(string)
}

/**
 * Finds unit declination for number
 * @number number
 * @units array Words for counts: 1, 2, 5
 */
Typo.declination = function (number, units, includeNumber) {
    if (typeof number === 'string') {
        number = parseFloat(number)
    }

    var unit
    var number00 = Math.abs(number) % 100

    if (Math.floor(number) - number !== 0) {
        unit = units[1]
    } else if (number00 >= 10 && number00 <= 20) {
        unit = units[2]
    } else {
        unit = units[
            declinationArray[number % 10]
        ]
    }

    return includeNumber
        ? Typo.formatNumber(number) + char.nbsp + unit
        : unit
}
var declinationArray = [2, 0, 1, 1, 1, 2, 2, 2, 2, 2]

/**
 * Replaces $[0-9] with values in pattern string
 * @pattern   string Format is 'foo $1 bar $2'
 * @arguments string Values to replace
 * @return    string Replaced string
 */
Typo.pattern = function (pattern) {
    if (pattern === '') return ''

    var $index = pattern.indexOf('$')
    while ($index > -1) {
        pattern = pattern.substr(0, $index) + arguments[pattern[$index+1]] + pattern.substr($index+2)
        $index = pattern.indexOf('$')
    }

    return pattern
}

/**
 *
 */
Typo.secondsToHMS = function (seconds) {
    if (typeof seconds === 'string') seconds = parseInt(seconds)

    var h = Math.floor(seconds / 3600)
    var m = Math.floor((seconds % 3600) / 60)
    var s = seconds % 60
    var time = ''

    if (h !== 0) {
        time += h + ':'
    }

    if (m < 10 && h !== 0) {
        time += '0' + m + ':'
    } else {
        time += m + ':'
    }

    if (s < 10) {
        time += '0' + s
    } else {
        time += s
    }

    return time
}

Typo.minutesToHMArray = function (minutes) {
    if (typeof minutes === 'string') minutes = parseInt(minutes)

    return [
        Math.floor(minutes / 60),
        Math.floor(minutes % 60)
    ]
}

/**
 *
 */
Typo.secondsTimestampToHM = function (seconds) {
    return Typo.dateToHM(
        new Date(seconds * 1000)
    )
}

/**
 * @pattern     object {yesterdayIn:[], timeAgo:[], todayIn:[]}
 * @declination object {day:[], hour:[], minute:[]}
 * @rightNow    string
 */
Typo.secondsToTimeAgo = function (seconds, pattern, declination, rightNow) {
    if (pattern === undefined) {
        pattern = {
            timeAgo: '$1 назад',
            todayIn: 'сегодня в $1',
            yesterdayIn: 'вчера в $1',
        }
    }
    if (declination === undefined) {
        declination = {
            minute: ['минуту', 'минуты', 'минут'],
            hour: ['час', 'часа', 'часов'],
            day: ['день', 'дня', 'дней'],
        }
    }
    if (rightNow === undefined) {
        rightNow = 'Только что'
    }

    var date = new Date(parseInt(seconds) * 1000)
    var minutesAgo = Math.round((new Date - date) / 3600000)
    var hoursAgo = Math.floor(minutesAgo / 60)
    var daysAgo = Math.floor(minutesAgo / 24)

    if (daysAgo === 1) {
        return Typo.pattern(
            pattern.yesterdayIn,
            Typo.dateToHM(date)
        )
    } else if (daysAgo > 1) {
        return Typo.pattern(
            pattern.timeAgo,
            daysAgo + ' ' + Typo.declination(daysAgo, declination.day)
        )
    } else if (hoursAgo > 10) {
        return Typo.pattern(
            pattern.todayIn,
            Typo.dateToHM(date)
        )
    } else if (hoursAgo > 0) {
        return Typo.pattern(
            pattern.timeAgo,
            hoursAgo + ' ' + Typo.declination(hoursAgo, declination.hour)
        )
    } else if (minutesAgo > 0) {
        return Typo.pattern(
            pattern.timeAgo,
            minutesAgo + ' ' + Typo.declination(minutesAgo, declination.minute)
        )
    } else {
        return rightNow
    }
}

/**
 *
 */
Typo.dateToHM = function (date) {
    return date.getHours() + ':' + ('0' + date.getMinutes()).slice(-2)
}

/**
 *
 */
;(function () {

Typo.wordWrap = function (string) {
    var stringWrap = ''
    var partHasVowel = false
    var firstPart = true

    for (var i = 0, ii = string.length-1, symbol, nextSymbol, afterNextSymbol; i <= ii; i++) {
        symbol = string[i]
        stringWrap += symbol

        if (!isLetter(symbol) || i === ii) {
            partHasVowel = false
            firstPart = true
            continue
        }

        if (isVowel(symbol)) {
            partHasVowel = true
        }

        nextSymbol = string[i+1]

        if (!isLetter(nextSymbol)) {
            continue
        }

        afterNextSymbol = i+2 <= ii ? string[i+2] : ''

        if (!isLetter(afterNextSymbol)) {
            continue
        }

        if (
            isVowel(nextSymbol) && partHasVowel ||

            isConsonant(symbol) && symbol === nextSymbol && partHasVowel ||

            isConsonant(nextSymbol) && isVowel(afterNextSymbol) && partHasVowel ||

            firstPart && isVoicedConsonant(symbol) && isDeafConsonant(nextSymbol) &&
            isVoicedConsonant(afterNextSymbol) && partHasVowel
        ) {
            if (!( firstPart && (i == 0 || !isLetter(string[i-1])) )) {
                stringWrap += char.wbr
            }
            partHasVowel = false
            firstPart = false
        }
    }

    return stringWrap
}

Typo.longWordWrap = function (string) {
    var stringArray = string.split(' ')
    var wrapOnce = false

    for (var i = 0, ii = stringArray.length; i < ii; i++) {
        var word = stringArray[i]
        if (word.length >= 15 && word.indexOf('-') === -1) {
            stringArray[i] = Typo.wordWrap(word)
            wrapOnce = true
        }
    }

    return wrapOnce ? stringArray.join(' ') : string
}

function isVowel (symbol) {
    return symbol !== '' && vowels.indexOf(symbol.toLowerCase()) > -1
}
function isConsonant (symbol) {
    return symbol !== '' && consonants.indexOf(symbol.toLowerCase()) > -1
}
function isVoicedConsonant (symbol) {
    return symbol !== '' && voicedConsonants.indexOf(symbol.toLowerCase()) > -1
}
function isDeafConsonant (symbol) {
    return symbol !== '' && deafConsonants.indexOf(symbol.toLowerCase()) > -1
}
function isMute (symbol) {
    return symbol !== '' && mutes.indexOf(symbol.toLowerCase()) > -1
}
function isLetter (symbol) {
    return symbol !== '' && alphabet.indexOf(symbol.toLowerCase()) > -1
}

var alphabet ='абвгдеёжзийклмнопрстуфхцчшщъыьэюяabcdefghijklmnopqrstuvwxyz'
var vowels ='аяоёуюыиэеaeiouy'
var consonants ='бвгджзйклмнпрстфхцчшщbcdfghjklmnpqrstvwxz'
var voicedConsonants ='бвгджзйлмнрbdgjklmnrvwxz'
var deafConsonants ='пфктшсхцчшщcfhpqt'
var mutes ='ьъ'

})();

})();