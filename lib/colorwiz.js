/**
 * @lib ColorWiz Работа с цетом
 * @ver 0.1.1
 * @url github.yandex-team.ru/kovchiy/colorwiz
 */
'use strict';

var ColorWiz = {}

;(function () {

var MAX_DARK_BACKGROUND_BRIGHTNESS = .9
var MIN_BRIGHT_BACKGROUND_BRIGHTNESS = .6
var MAX_BRIGHT_BACKGROUND_BRIGHTNESS = .9
var MIN_CONTRAST = .7
var OPTIMAL_TITLE_CONTRAST = .85
var OPTIMAL_TEXT_CONTRAST = .75
var MIN_BRIGHTNESS_DIFF = .4
var DEFAULT_TEXT_OPACITY = .7
var BRIGHT_COLOR_LIMIT = .6
var QUALITY = 100
var SIMILAR_COLOR_DISTANCE = 100
var SHADE_COLOR_DISTANCE = 200

var options = {
    debug: false,
    backgroundPriority: 'dark', // dark, bright
}

function magic (url, callback, userOptions) {
    options = extend(userOptions, options)
    onImageLoad(
        url,
        function () {
            var canvas  = document.createElement('canvas')
            var context = canvas.getContext('2d')
            var width
            var height

            width = canvas.width = this.width
            height = canvas.height = this.height
            context.drawImage(this, 0, 0, width, height)

            var imageData = context.getImageData(0, 0, width, height).data
            var pixelCount = width * height
            var pixels = []
            var qxq = QUALITY * QUALITY
            var step = QUALITY < pixelCount ? Math.round(pixelCount / qxq) : 1

            for (var i = 0, offset; i < pixelCount; i += step) {
                offset = i * 4

                if (imageData[offset + 3] < 255) continue

                pixels.push([
                    imageData[offset],
                    imageData[offset + 1],
                    imageData[offset + 2]
                ])
            }

            var palette = pixelsPalette(pixels)
            var color = compatibleColors(options.debug ? palette.concat([]) : palette)

            if (options.debug) {
                callback(palette, color)
            } else {
                callback(color)
            }
        }
    )
}

function isFilled (url, callback) {
    onImageLoad(
        url,
        function () {
            var canvas  = document.createElement('canvas')
            var context = canvas.getContext('2d')
            var width
            var height

            width = canvas.width = this.width
            height = canvas.height = this.height
            context.drawImage(this, 0, 0, width, height)

            var leftTop = context.getImageData(0, 0, 1, 1).data
            var rightTop = context.getImageData(width-1, 0, 1, 1).data
            var leftBottom = context.getImageData(0, height-1, 1, 1).data
            var rightBottom = context.getImageData(width-1, height-1, 1, 1).data

            callback(
                !isWhiteOrTransparentPixel(leftTop) &&
                !isWhiteOrTransparentPixel(rightTop) &&
                !isWhiteOrTransparentPixel(leftBottom) &&
                !isWhiteOrTransparentPixel(rightBottom)
            )
        }
    )
}

function isWhiteOrTransparentPixel (px) {
    return px[0] > 250 && px[1] > 250 && px[2] > 250 || px[3] !== 255
}

function onImageLoad (url, callback) {
    var image = document.createElement('img')
    image.crossOrigin = 'Anonymous'
    image.src = url.replace(/^url\(/, '').replace(/\)$/, '')
    image.onload = callback
}

function pixelsPalette (pixels) {
    var similars = []

    for (var i = 0, ii = pixels.length, similarFound, pixel; i < ii; i++) {
        pixel = pixels[i]
        similarFound = false

        for (var j = 0, jj = similars.length; j < jj; j++) {
            if (distance(similars[j][0], pixel) <= SIMILAR_COLOR_DISTANCE) {
                similars[j][1]++
                similarFound = true
                break
            }
        }
        if (!similarFound) {
            similars.push([pixel, 1])
        }
    }

    similars.sort(function (a, b) {
        return b[1] - a[1]
    })

    var palette = []
    for (var i = 0, ii = similars.length; i < ii; i++) {
        palette.push(similars[i][0])
    }

    return palette
}

function compatibleColors (palette) {
    var backgroundColor
    var titleColor
    var textColor
    var buttonColor

    // Find background color in palette, that is not too close to white
    var i = 0
    var backgroundBrightness

    for (; i < palette.length; i++) {
        backgroundColor = palette[i]
        backgroundBrightness = brightness(palette[i])

        if (
            options.backgroundPriority === 'dark' &&
            backgroundBrightness <= MAX_DARK_BACKGROUND_BRIGHTNESS
        ) {
            break
        }

        if (
            options.backgroundPriority === 'bright' && (
                backgroundBrightness >= MIN_BRIGHT_BACKGROUND_BRIGHTNESS &&
                backgroundBrightness <= MAX_BRIGHT_BACKGROUND_BRIGHTNESS
            )
        ) {
            break
        }
    }

    palette.splice(i, 1)

    // Fallback text color depends on background brightness
    var backgroundIsBright = brightness(backgroundColor) > BRIGHT_COLOR_LIMIT
    var fallbackColor = backgroundIsBright ? [0,0,0] : [255,255,255]

    // Find palette colors with enough contrast width background color
    for (var i = 0, ii = palette.length, con, bri, color; i < ii; i++) {
        color = palette[i]
        con = contrast(backgroundColor, color)
        bri = brightnessDifference(backgroundColor, color)

        if (con < MIN_CONTRAST && bri < MIN_BRIGHTNESS_DIFF) {
            continue
        }
        if (!titleColor) {
            titleColor = color
            continue
        }
        if (!textColor) {
            textColor = color
        }
        if (titleColor && textColor) {
            break
        }
    }

    // If text is brighter then title, swap them
    var titleBrightness
    var textBrightness
    if (titleColor && textColor) {
        titleBrightness = brightness(titleColor)
        textBrightness = brightness(textColor)

        if ((backgroundIsBright && textBrightness < titleBrightness) || (!backgroundIsBright && textBrightness > titleBrightness)) {
            var tempColor = titleColor
            titleColor = textColor
            textColor = tempColor

            var tempColor = titleBrightness
            titleBrightness = textBrightness
            textBrightness = tempColor
        }
    }

    // Adjust text contrast for readability
    if (titleColor) titleColor = titleBrightness < BRIGHT_COLOR_LIMIT
        ? adjustDarknessFor(titleColor, backgroundColor, OPTIMAL_TITLE_CONTRAST)
        : adjustLightnessFor(titleColor, backgroundColor, OPTIMAL_TITLE_CONTRAST)

    if (textColor) textColor = textBrightness < BRIGHT_COLOR_LIMIT
        ? adjustDarknessFor(textColor, backgroundColor, OPTIMAL_TEXT_CONTRAST)
        : adjustLightnessFor(textColor, backgroundColor, OPTIMAL_TEXT_CONTRAST)

    // Fallback if colors not found
    if (!textColor) {
        if (!titleColor || contrast(titleColor, fallbackColor) < MIN_CONTRAST) {
            textColor = blend(fallbackColor, backgroundColor, DEFAULT_TEXT_OPACITY)
        } else {
            textColor = titleColor
            titleColor = fallbackColor
        }
    }
    if (!titleColor) {
        titleColor = fallbackColor
    }

    // Button color
    buttonColor = backgroundIsBright ? darken(backgroundColor, .15) : lighten(backgroundColor, .1)

    return {
        background: rgb2css(backgroundColor),
        title: rgb2css(titleColor),
        text: rgb2css(textColor),
        button: rgb2css(buttonColor)
    }
}

function isBright (rgb) {
    return brightness(rgb) > BRIGHT_COLOR_LIMIT
}

/**
 * Pythagorean Distance
 */
function distance (rgb1, rgb2) {
    var rd = rgb1[0] - rgb2[0]
    var gd = rgb1[1] - rgb2[1]
    var bd = rgb1[2] - rgb2[2]

    return Math.sqrt(rd*rd + gd*gd + bd*bd)
}

function blend (rgb1, rgb2, alpha) {
    return [
        Math.round(rgb1[0]*alpha + rgb2[0]*(1-alpha)),
        Math.round(rgb1[1]*alpha + rgb2[1]*(1-alpha)),
        Math.round(rgb1[2]*alpha + rgb2[2]*(1-alpha))
    ]
}

/**
 *
 */
function difference (rgb1, rgb2) {
    var diff = Math.max(rgb1[0], rgb2[0]) - Math.min(rgb1[0], rgb2[0]) +
               Math.max(rgb1[1], rgb2[1]) - Math.min(rgb1[1], rgb2[1]) +
               Math.max(rgb1[2], rgb2[2]) - Math.min(rgb1[2], rgb2[2])

    return diff / 765
}

function hueDifference (rgb1, rgb2) {
    var hsl1 = rgb2hsl(rgb1)
    var hsl2 = rgb2hsl(rgb2)

    return Math.abs(hsl1[0] - hsl2[0]) / 360
}

/**
 * return number 0..1
 */
function brightnessDifference (rgb1, rgb2) {
    return Math.abs(brightness(rgb1) - brightness(rgb2))
}

/**
 * return string #000000
 */
function rgb2css (rgb) {
    return '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase()
}

/**
 * return number 0..1
 */
function luminance (rgb) {
    return 0.2126 * Math.pow(rgb[0]/255, 2.2) +
           0.7152 * Math.pow(rgb[1]/255, 2.2) +
           0.0722 * Math.pow(rgb[2]/255, 2.2)
}

/**
 * return number 0..1
 */
function readability (rgb1, rgb2) {
    var l1 = luminance(rgb1)
    var l2 = luminance(rgb2)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
};

/**
 * return number 0..1
 */
function contrast (rgb1, rgb2) {
    var l1 = luminance(rgb1)
    var l2 = luminance(rgb2)
    var contrast = l1 < l2
        ? 1 - (l1 + 0.05) / (l2 + 0.05)
        : 1 - (l2 + 0.05) / (l1 + 0.05)

    return contrast
}

function adjustLightnessFor (rgb1, rgb2, base) {
    return lighten(
        rgb1, base - contrast(rgb1, rgb2)
    )
}

function adjustDarknessFor (rgb1, rgb2, base) {
    return darken(
        rgb1, base - contrast(rgb1, rgb2)
    )
}

/**
 * return number 0..1
 */
function brightness (rgb) {
    return (299*rgb[0] + 587*rgb[1] + 114*rgb[2]) / 1000 / 255
}

function extend (actuals, defaults) {
    if (!actuals) return defaults

    var extended = {}

    for (key in defaults) {
        if (typeof actuals[key] !== 'undefined') {
            extended[key] = actuals[key]
        } else {
            extended[key] = defaults[key]
        }
    }

    return extended
}

function rgb2hsl (rgb) {
    var r = rgb[0] / 255
    var g = rgb[1] / 255
    var b = rgb[2] / 255

    var max = Math.max(r, g, b)
    var min = Math.min(r, g, b)
    var h
    var s
    var l = (max + min) / 2

    if (max === min) {
        h = s = 0
    } else {
        var d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0)
        } else if (max === g) {
            h = (b - r) / d + 2
        } else if (max === b) {
            h = (r - g) / d + 4
        }

        h /= 6
    }

    return [
        unbound01(h, 360),
        unbound01(s, 100),
        unbound01(l, 100)
    ]
}

function hue2rgb (p, q, t) {
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t
    if(t < 1/2) return q
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
}

function hsl2rgb (hsl) {
    var r
    var g
    var b

    var h = hsl[0] / 360
    var s = hsl[1] / 100
    var l = hsl[2] / 100

    if (s === 0) {
        r = g = b = l
    } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s
        var p = 2 * l - q
        r = hue2rgb(p, q, h + 1/3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1/3)
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ]
}

function lighten (rgb, amount) {
    var hsl = rgb2hsl(rgb)

    hsl[2] += amount * 100
    hsl[2] = clamp (hsl[2], 100)

    return hsl2rgb(hsl)
}

function darken (rgb, amount) {
    var hsl = rgb2hsl(rgb)

    hsl[2] -= amount * 100
    hsl[2]  = clamp (hsl[2], 100)

    return hsl2rgb(hsl)
}

function brighten (rgb, amount) {
    var r = rgb[0]
    var g = rgb[1]
    var b = rgb[2]

    r = Math.max(0, Math.min(255, r - Math.round(255 * - (amount / 100))))
    g = Math.max(0, Math.min(255, g - Math.round(255 * - (amount / 100))))
    b = Math.max(0, Math.min(255, b - Math.round(255 * - (amount / 100))))

    return [r, g, b]
}

function clamp (value, base) {
    if (typeof base === 'undefined') base = 1
    return Math.min(base, Math.max(0, value))
}

function bound01(value, base) {
    return value / base
}

function unbound01(value, base) {
    return Math.round(value * base)
}

var regExpRgbString = /rgba?\(|\)|\s/g
function rgbString2rgbArray(string) {
    return string.replace(regExpRgbString,'').split(',').map(function (str) {
        return parseInt(str)
    })
}

function css2rgb (css) {
    if (css.length === 4) {
        var r = css[1]
        var g = css[2]
        var b = css[3]
        css = '#' + r + r + g + g + b + b
    }

    return [
        parseInt(css.substr(1,2), 16),
        parseInt(css.substr(3,2), 16),
        parseInt(css.substr(5,2), 16),
    ]
}


/*
 * Interface
 */
ColorWiz.darken = darken
ColorWiz.rgb2css = rgb2css
ColorWiz.css2rgb = css2rgb
ColorWiz.magic = magic
ColorWiz.brightness = brightness
ColorWiz.isBright = isBright
ColorWiz.rgbString2rgbArray = rgbString2rgbArray
ColorWiz.compatibleColors = compatibleColors
ColorWiz.isFilled = isFilled


})()