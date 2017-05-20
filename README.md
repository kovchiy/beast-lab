# BeastLab

- [Workflow](#workflow)
- [Установка и запуск](#setup)
- [Работа с git](#git)
- [Работа со страницами](#pages)
- [Работа с блоками](#blocks)
- [Документирование блоков](#doc)
- [Работа с живыми данными](#live)
- [Работа с экспериментами](#exp)
- [Выкатка на сервер](#deploy)

<a name="workflow"/>

## Wrokflow

С одной стороны, хочется дать участникам максимальную свободу:
- Никаких требований к коду и количеству экспериментальных блоков.
- Никаких особых процедур создания и удаления сущностей.
- Используете столько сторонних билиотек, сколько считаете нужным.

С другой, хочется порядка:
- Обезопасить ядро проекта от засорения спонтанными правками.
- Код общих блоков проходит ревью и документируется.
- Комиты одного человека не должны ломать проект другого.

#### У каждого своя ветка
В git существует [механизм ветвления](https://git-scm.com/book/ru/v1/%D0%92%D0%B5%D1%82%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B2-Git-%D0%9E%D1%81%D0%BD%D0%BE%D0%B2%D1%8B-%D0%B2%D0%B5%D1%82%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F-%D0%B8-%D1%81%D0%BB%D0%B8%D1%8F%D0%BD%D0%B8%D1%8F). Ознакомьтесь.

Что следует усвоить на старте:
- Каждый участник живет в своей ветке. Имя ветки — ваш логин.
- Существует основная ветка — `master`. Участники обмениваются правками через нее.
- Вы никогда ни при каких обстоятельствах не разрабатываетесь в ветке `master`.

Основные команды работы с git [будут даны ниже](#setup).

#### У каждого своя директория
Исходно проект содержит слещующие директории:

- `/assets` — статика, в основном картинки.
- `/blocks` — общие блоки.
- `/build` — файлы сборки, которые загружаются в браузер.
- `/lib` — общие библиотеки проекта; весь основной код кроме самих блоков.
- `/pages` — общие страницы для демонстрации типовых выдач.
- `/users` — директории участников.

Простое правило — участник правит только свою директорию: `/user/login/...` (login — это ваш логин). Но это не ограничивает вашу свободу, а лишь оберегает от конфликтов при стягивании правок с других веток, дает всем контроль.

В своей дирекории воспроизводится почти та же струтура, что и в корне проекта:

- `/users/login/assets` — ваша статика
- `/users/login/blocks` — ваши блоки
- `/users/login/lib` — ваши библиотеки
- `/users/login/pages` — ваши страницы

В сборку проекта попадают только общие блоки и блоки из вашей директории. Есть еще одна приятная особенность — URL-роутинг:

- `http://localhost:8070/pages/index.html` — откроется страница из общей папки `/pages`
- `http://localhost:8070/index.html` — откроется страница из вашей папки `/users/login/pages`
- `http://localhost:8070/assets/movies-posters/01.jpg` — откроется картинка из общей папки `/assets`
- `http://localhost:8070/movies-posters/01.jpg` — откроется картинка из вашей папки `/users/login/assets`

<a name="setup"/>

#### Установка

Желательно иметь свежую версию node.js. Теперь набираем в своей директории с репозиториями:
```shell
git clone https://github.com/kovchiy/beast-lab.git # Клонирование репозитория
cd serplab # Переход в директорию репозитория
git fetch --all # Скачать все ветки
git checkout -b СВОЙ_ЛОГИН # Создание своей ветки и переход в нее
npm i # Установка сторонних модулей
```

<a name="launch"/>

#### Запуск

Проект запускается командой:
```shell
gulp
```

Ваш проект будет доступен по адресу: [http://localhost:8070](http://localhost:8070)

<a name="git"/>

#### Работа с git

1. Не забывайте регулярно коммитить все свои правки
2. Минимум раз в сутки делайте пуш
3. Не забывайте обновлять свой проект (могут приехать баги, не обновляйтесь перед важными встречами)
4. Если вы меняли общие блоки, влейте их в мастер

<a name="ci"/>

#### 1. Локальный комит

```shell
git add . # добавить все правки в комит
git commit -m 'описание комита' # произвести комит
```

<a name="push"/>

#### 2. Пуш

Пуш — отправка локальных комитов на сервер.

```shell
git push origin ИМЯ_МОЕЙ_ВЕТКИ # имя ветки - ваш логин
```

<a name="pull"/>

#### 3. Обновить проект

Другими словами, получить правки с ветки `master`

```shell
git pull --rebase origin master
```

Тут иногда возникают конфликты — ваши правки в файле накладываются на те, что пришли с ветки `master`. Пересекающиеся конфликтный участок кода выглядит так:

```
<<<<<<< HEAD
Версия кода с ветки master
=======
Ваша версия кода
>>>>>>> branch-name
```

Нужно либо удалить одну из версий, либо совместить их руками. Строки с `<<<<` `>>>>` и `====` также стираются вручную. После в терминале набрать:

```shell
git add .
git commit -m 'конфликт устранен'
git rebase --continue
```


<a name="merge"/>

#### 4. Влить свои правки в ветку master

Делать это необязательно — только если вы меняли общую библиотеку блоков. Но если все-таки вы решили, то потребуется слить свою ветку с `master`:

```shell
git pull --rebase origin master # Для начала нужно слить свою ветку с master
git checkout master # Переключиться на локальную ветку master
git merge origin ИМЯ_МОЕЙ_ВЕТКИ # Слить локальный мастер с вашей веткой
git push origin master # Отправить новую версию мастера на сервер
git checkout ИМЯ_МОЕЙ_ВЕТКИ # Вернуться в свою ветку
git pull # удаленная ветка обновилась, теперь формально нужно обновить локальную ветку
```

<a name="pages"/>

## Работа со страницами

Страниц доступны по адресам наподобие: `http://localhost:8070/pages/index.html`

Минимальная пустая страница выглядит так:
```xml
<meta charset="utf8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
<meta name="bml">

<title>Осмысленный заголовок</title>
<script type="bml">
    <App>
        <!-- Ваши блоки -->
    </App>
</script>
```

Возьмите за правило сразу писать внятное содержимое `<title>` — это позволит не путаться в табах, и в будущем сборщик сможет создавать красивую навигацию по вашим страницам.

Корневой блок всегда `<App>` — это обеспечивает корректную работу стандартных блоков.

Экспериментируйте с [дополнительными тегами](https://developer.chrome.com/multidevice/android/installtohomescreen), которые покрасят шапку Chrome в андроиде, добавляют большие иконки при сохранении на хоумскрин и т.д.:

```xml
<!-- Android WebApp -->
<meta name="viewport" content="width=device-width">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#000">
<link rel="icon" sizes="192x192" href="icon.png">

<!-- iOS WebApp -->
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" sizes="128x128" href="icon.png">
```

<a name="blocks"/>

## Работа со блоками

Обязательно пишите документацию — это несложно, но подробности в следующем пункте.

Выше договорились, что участники не правят содержимое папки `/blocks`. Но как быть, если хочется изменить поведение стандартного блока; например, кнопки:
```js
// /blocks/Button/Button.bml
Beast.decl({
    Button: {
        inherits: 'ControlForm',
        tag: 'button',
        on: {
            Release: function () {
                /* ... */
            }
        }
        /* ... */
    }
)
```

Для этого нужно создать такой же блок в своей директории и переопределить нужное поле в декларации:
```js
// /users/kovchiy/blocks/Button/Button.bml
Beast.decl({
    Button: {
        on: {
            Release: function () {
                console.log('Мое переопределение')
            }
        }
    }
)
```

Весь остальной код кнопки останется стандартным, изменится только реакция на нажатие. Такой подход упростит перенос ваших правок в мастер-ветку — потребуется лишь скопировать переопределяющие поля в декларациях. То же самое касатеся и стилей. Ваши правки не будут ломать чужие проекты, и никто не будет вас ни в чем ограничивать вплоть до переноса кода в `/blocks`.

Перенос кода из `/users/login/blocks` в `/blocks` делается по согласованию обоих сторон: ответственного за мастер-ветку и участника. Нет цели рано или позно перенести весь код из `/users/login/blocks` в `/blocks` — только если код из ветки участника будет реиспользоваться другими.

Тем не менее, папка `/blocks` — не запертая комната. Периодически изучайте ее код; следите, чтобы в вашей `/users/login/blocks` не появлялось случайных блоков с дублирующимися именами — пространство имен общее, и при сборке весь код склеивается в один файл.

<a name="doc"/>

## Документация к блокам

Появился новый мехазим документирования блока с низким порогом входа. Также появился новый способ эту документацию смотреть.

### Как писать документацию

Прямо в коде блока: комментариями с ключевыми словами, начинающимимися с символа `@`.

```js
/**
 * @block Button Кнопка
 * Основная в группе контролов
 * @tag control
 * @dep ControlForm
 */
Beast.decl({
    Button: {
        inherits: 'ControlForm', // @inherits ControlForm
        tag: 'button',
        mod: {
            Action: false,  // @mod Action {boolean} Активная2
            Circle: false,  // @mod Circle {boolean} Круглая
            NoLabel: false, // @mod NoLabel {boolean} Без лейбла (убирает отступы)
            Size: 'M',      // @mod Size {S M!} Размер
        },
        /* ... */

```

Существуют следующие директивы:

<a name="doc-types"/>

| Директива | Описание |
| --- | --- |
| `@block BlockName Описание` | Блок. Не пишите много, экономьте силы |
| `@tag tag1 tag2` | Теги через пробел |
| `@dep block1 block2` | Используемые блоки через пробел |
| `@elem ElementName Описание` | Элемент |
| `@mod ModifierName {value1! value2} Описание` | Модификатор с указанием значений; ! — по умолчанию |
| `@mod ModifierName {boolean} Описание` | Модификатор с указанием типа |
| `@param ParameterName {type} Описание` | Параметр с указанием типа |
| `@event EventName Описание` | Событие |
| `@event BlockName:EventName Описание` | Событие общей шины |
| `@data {type} Описание` | Прицеп к событию; какие данные передаются |
| `@method MethodName Описание` | Метод |
| `@arg ArgumentName {type} Описание` | Прицеп к методу; аргумент с указанием типа |
| `@return {type} Описание` | Прицеп к методу; результат с указанием типа |
| `@inherits BlockName` | Указание на предка блока |
| `@example <BlockName>...</BlockName>` | BML-код примера |

Директива `@block` — обязательная, без нее блок не попадет в документацию. Другая обязательная директива: `@dep` — по ней сервер понимает, какие блоки нужно включить в сборку страницы. Если не документировать блоки и не указывать зависимости, тогда придется подключать к файлу код всех блоков сразу:

```html
<!-- Вместо meta-тега: -->
<meta name="bml">

<!-- Придется вставлять: -->
<script type="text/javascript" src="/build/build.js"></script>
<link type="text/css" rel="stylesheet" href="/build/build.css">
```

Нельзя использовать одновременно и `<meta name="bml">`, и теги `<script>` с `<link>`.

Вернемся к директивам. Директивы живут в однострочных и многострочных комментариях:
```js
// @mod State {release! active} Состояние включен/выключен

/**
 * @method setValue Установить значение
 * @arg value {string} Устанавливаемое значение
 */
```

В многострочном комментарии следующая после директивы голая строка прицепляется к этой самой директиве (считайте это полем `extra`). Так можно писать разную лирику:
```js
/**
 * @block Button Кнопка
 * Механическое устройство для передачи сигнала/ввода информации, элемент интерфейса человек-машина
 */
```

Обратите внимание на директиву `@tag` — несмотря на то, что все блоки находятся в общем пространстве имен, можно делать сколько угодно срезов блоков по тегам: OO, BNO, Promo, UGC и т.д. (названия нормализуются по lowerCase). Теги используются при формировании навигационного дерева из следующего пункта.

В комментариях можно ставить локальные ссылки на блоки:

```js
// @mod Icon {string} Имя глифа из набора блока #Icon
```

Не все комментарии пока выводятся в документации — но не переживайте, со временем всему найдем применение.

### Как смотреть документацию

Теперь по нажатию клавиш `cmd + shift + X` над блоками будет появляться синяя рамка, которая по клику покажет документацию. Справа живет навигация по блокам. Разделы — те самые теги из директивы `@tag`.

<a name="exp"/>

## Работа с экспериментами

Существует так называемый __экспериментальный уровень переопределения__ — о переопределении кода блоков уже говорилось выше, в пользовательких блоках `/users/*/blocks`. Такие переопределения можно оборачивать во флаги: для этого нужно сложить код в директорию `/users/*/exp/EXP_NAME` либо `/exp/EXP_NAME` — чтобы переопределение сработало, нужно указать в адресной строке имя флага `?exp=EXP_NAME` (или перечислить несколько сразу `?exp=EXP_NAME1,EXP_NAME2`). Код в директории эксперимента рекомендутеся для порядка раскладывать по директориям блоков, как это делается в `/blocks`.

<a name="deploy"/>

## Deploy

__Функциональность в открытой версии пока что не работает — возможно, в будущем появится документация соответствующего конфига.__

Это отправка изменений на сервер, чтобы дать кому-нибудь ссылку на ваш прототип. Сборщик зайдет на удаленный сервер под вашим логином, установит туда все необходимые пакеты и запустит сервер. За сервером будет следить супервизор — программа, перезапускающая сервер, если тот по какой-то причине упадет. Так что все должно работать стабильно.

Запускается deploy командой:
```
gulp deploy
```

Добро пожаловать на борт.
