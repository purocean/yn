---
headingNumber: true
enableMacro: true
customVar: Hello
define:
    --APP_NAME--: Yank Note
    --APP_VERSION--: '[= $ctx.version =]'
---

# Yank-Note Features Instructions

English | [中文](./FEATURES_ZH-CN.md)

[toc]{type: "ol", level: [2]}

## Data Storage

The application generated data is stored in `<home>/yank-note` dir, click the "Open Main Dir" menu in the tray menu to view them.

Directory description

1. configuration file `<home>/yank-note/config.json`
1. recycle bin `<home>/yank-note/trash`
1. plug-ins `<home>/yank-note/plugins`

## TOC Generation

Use `[toc]{type: "ul", level: [1,2,3]}` to generate the TOC of document.

## TODO Switch

Click the TODO item in preview to try
+ [x] ~~2021-06-06 10:27~~ TEST1
+ [x] ~~2021-06-06 10:27~~ TEST2
+ [x] ~~2021-06-06 10:27~~ TEST3

## Encrypted Document

1. Documents ending with `.c.md` are regarded as encrypted documents and can be used to store confidential information.
2. The encryption and decryption processes are both completed at the frontend.
3. Be sure to keep the password of the encrypted document properly. Once the password is lost, it can only be cracked violently.

## Footnote

## Markdown Enhance

Type '/' in the editor to get prompts

+ Mark：==marked==
+ Sup：29^th^
+ Sub：H~2~0
+ Footnote：footnote[^1] grammar[^2]

### Element Attribute

This feature is implemented using [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs).
For example, red text:
**test**{style="color:red"}

### Image Enhancement

1. The picture will be rendered as a block element and centered by default, with a transparent background color.
    + If you want to display the image as an inline element, you can add `.inline` after the image link parameter, such as: ![](mas_en.svg?.inline)
    + If you want to add a white background to the image to optimize the display effect (for some transparent images), you can add `.bgw` after the image link parameter, such as: ![](mas_en.svg?.inline.bgw)

1. You can use [markdown-it-imsize](https://github.com/tatsy/markdown-it-imsize) to set the image size. For example, this is an image with a width of 16px: ![](logo-small.png?.inline =16x)

## Mind Map

Just need to add `{.mindmap}` to the end of root node of the list.

+ Central node{.mindmap}
    + State Visibility
    + Environmental Appropriate
    + User Controllable
    + Consistency
    + Error Proofing
    + Accessibility
    + Agility and Efficiency
    + Grace and Simplicity
    + Fault Tolerance
    + Friendly Help

Mind map is implemented using [kityminder-core](https://github.com/fex-team/kityminder-core).

## Mermaid

```mermaid
graph LR
A[Hard] -->|Text| B(Round)
B --> C{Decision}
C -->|One| D[Result 1]
C -->|Two| E[Result 2]
```

```mermaid
sequenceDiagram
Alice->>John: Hello John, how are you?
loop Healthcheck
    John->>John: Fight against hypochondria
end
Note right of John: Rational thoughts!
John-->>Alice: Great!
John->>Bob: How about you?
Bob-->>John: Jolly good!
```

```mermaid
gantt
section Section
Completed :done,    des1, 2014-01-06,2014-01-08
Active        :active,  des2, 2014-01-07, 3d
Parallel 1   :         des3, after des1, 1d
Parallel 2   :         des4, after des1, 1d
Parallel 3   :         des5, after des3, 1d
Parallel 4   :         des6, after des4, 1d
```

```mermaid
stateDiagram-v2
[*] --> Still
Still --> [*]
Still --> Moving
Moving --> Still
Moving --> Crash
Crash --> [*]
```

```mermaid
pie
"Dogs" : 386
"Cats" : 85
"Rats" : 15
```

```mermaid
journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 3: Me
```

## Plantuml
The system needs to have Java environment and graphviz installed.
The example is as follows

@startuml
a -> b
@enduml

## Table Enhancement

This feature is implemented using [markdown-it-multimd-table](https://github.com/RedBug312/markdown-it-multimd-table).
Support the use of multiple lines of text and lists in tables. Support table description rendering.

In addition, you can use: `Ctrl/Cmd + click cell` to quickly edit table cell content.

First header | Second header
-------------|---------------
List:        | More  \
- [ ] over   | data  \
- several    |
Test | Test
[Test Table]

First header | Second header
:-----------:|:--------------:
AAAAAAAAAAAA | BBBBBBBBBBBBBB
AAAAAAAAAAAA | BBBBBBBBBBBBBB
AAAAAAAAAAAA | BBBBBBBBBBBBBB
AAAAAAAAAAAA | BBBBBBBBBBBBBB
AAAAAAAAAAAA | BBBBBBBBBBBBBB
Test | Test
[Small Table]
{.small}

## Katex

This feature is provided by the [markdown-it-katex](https://github.com/waylonflinn/markdown-it-katex) plugin.

$$\begin{array}{c}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &
= \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} & = 0
\end{array}$$

equation | description
----------|------------
$\nabla \cdot \vec{\mathbf{B}}  = 0$ | divergence of $\vec{\mathbf{B}}$ is zero
$\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t}  = \vec{\mathbf{0}}$ |  curl of $\vec{\mathbf{E}}$ is proportional to the rate of change of $\vec{\mathbf{B}}$
$\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} = \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} = 4 \pi \rho$ | _what?_

## Code Running

Support to run `JavaScript` `PHP` `nodejs` `Python` `bash` `bat` code.
This function is implemented by executing external commands, so the corresponding environment needs to be installed.

The first line of the code block needs to contain the string `--run--`, an example is as follows
```js
// --run--
await new Promise(r => setTimeout(r, 500))
ctx.ui.useToast().show("info", "HELLOWORLD!")
console.log('HELLOWORD')
```

```node
// --run--
console.log('HELLOWORD')
```

```php
// --run--
echo 'HELLOWORD!';
```

```python
# --run--
print('HELLOWORD')
```

```shell
# --run--
date
```

```bat
REM --run--
@echo HELLOWORD
```

## Integrated Terminal

1. Use `Alt/Option + T` or click the status bar **Switch terminal** menu to call up the integrated terminal
1. Support to select a piece of code in the editor and press `Shift + Alt/Option + R` to run the command directly in the terminal. No need to copy and paste.
1. Switch the working directory of the terminal to the current directory: `right-click directory`

## Applets

Support to embed HTML applets in documents.

The first line of the HTML code block needs to contain the string `--applet--`, and the remaining strings are used as the title of the applet.

The example is as follows:

```html
<!-- --applet-- Hash -->

<script>
function run (type) {
    const input = document.getElementById('input')
    const output = document.getElementById('output')
    output.value = ''

    switch (type) {
        case 'md5':
            output.value = ctx.lib.cryptojs.MD5(input.value).toString().toLowerCase()
            break
        case 'sha1':
            output.value = ctx.lib.cryptojs.SHA1(input.value).toString().toLowerCase()
            break
        case 'sha256':
            output.value = ctx.lib.cryptojs.SHA256(input.value).toString().toLowerCase()
            break
    }
    output.focus()
    output.select()
}
</script>

<div>
    Input
    <textarea id="input" style="display: block; width: 100%"></textarea>
    <button onclick="run('md5')">MD5</button>
    <button onclick="run('sha1')">SHA1</button>
    <button onclick="run('sha256')">SHA256</button>
    <textarea id="output" style="display: block; width: 100%"></textarea>
    <button onclick="document.getElementById('input').value = ''; document.getElementById('output').value = ''">Clear</button>
    <button onclick="var x = document.getElementById('output'); x.value = x.value.toUpperCase()">Uppercase</button>
</div>
```
If there is no title, there will be no outer border decoration

```html
<!-- --applet--  -->
<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">HELLO</button>
```

## ECharts

The string containing `--echarts--` in the first line of the Js code block will be resolved into ECharts graphics, the example is as follows

```js
// --echarts--
function (chart) {
chart.setOption({
    // backgroundColor: '#2c343c',

    title: {
        text: 'Customized Pie',
        left: 'center',
        top: 20,
        textStyle: {
            color: '#888'
        }
    },

    tooltip : {
        trigger: 'item',
        formatter: "{a} <br/>{b} : {c} ({d}%)"
    },

    visualMap: {
        show: false,
        min: 80,
        max: 600,
        inRange: {
            colorLightness: [0, 1]
        }
    },
    series : [
        {
            name:'referer',
            type:'pie',
            radius : '55%',
            center: ['50%', '50%'],
            data:[
                {value:335, name:'Direct visit'},
                {value:310, name:'Email marketing'},
                {value:274, name:'Affiliate advertising'},
                {value:235, name:'Video advertisement'},
                {value:400, name:'Search engine'}
            ].sort(function (a, b) { return a.value - b.value; }),
            roseType: 'radius',
            label: {
                normal: {
                    textStyle: {
                        color: '#888'
                    }
                }
            },
            labelLine: {
                normal: {
                    lineStyle: {
                        color: '#888'
                    },
                    smooth: 0.2,
                    length: 10,
                    length2: 20
                }
            },
            itemStyle: {
                normal: {
                    color: '#c23531',
                    shadowBlur: 200,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },

            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
                return Math.random() * 200;
            }
        }
    ]
})
}
```

## Draw.io

### Embed xml

The first line of the xml code block needs to contain the string `--drawio--`
```xml
<!-- --drawio-- -->
<mxfile modified="2019-08-08T10:12:50.344Z" host="" agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) draw.master/1.1.2 Chrome/76.0.3809.88 Electron/6.0.0 Safari/537.36" etag="Sj0MCp6T4t3TRFXfBnGH" version="11.1.1" type="device"><diagram name="Page-1" id="c7558073-3199-34d8-9f00-42111426c3f3">7V3bd6M2E/9r/Lg5gEDgx8R2uj1nk+Y0e9qvj8SWbb5i5ALOpX99JW5GI9mxveKWTV5iSzDAzPzmphEeocnm9ZfY367v6IKEI8tYvI7QdGRZpuFh9o+PvOUjHvLygVUcLIqD9gOPwb+kPLMY3QULkggHppSGabAVB+c0isg8Fcb8OKYv4mFLGopX3forIg08zv1QHv0zWKTr4iksvB//SoLVuryyicf5zJM//3sV011UXG9koWX2l09v/JJW8aDJ2l/Ql9oQmo3QJKY0zT9tXick5Lwt2Zafd3tgtrrvmETpKSdY+QnPfrgj5R3jkJ16s+V3l74VHMH/7Pgt3Wz8eBVEI3TNZo0tk/dN9lR88EtKt/mEXU6k5DX94ofBqjhjzu6KxLW5BZnT2E8DWhzA+EbiMIhIdkx5UfZpVfzPbi1JYxqtytGHmM5JkrCzzfKAp3jEn/sWnsiGxHNrE1s4tj5A5HzGhGSZ5jNeMQOf7PEtScmGHfCY7hhmjtxVE1d/iAnTmFwMyktbwkWtZxKnAQPLdS7Z6SZYLPjcTSHqaSVnyg5dhpmCLwOmeOhmSaO0wLtpFd9v/U0QckvxlYTPhJPm7E83IT+IfczwRBbFt4xCcTNmoQ1/VzBF/Ah2qQkNaZzdLprh29vJREZGARb+NOS1NlQg5RdCNySNmTSMYtZCBf7fwPeXvY0wSxO2rtmHcTHmF2ZpVZHeQ5N9KNCpRiqSkDqLmHgJiQOuz0BEL+sgJY9bf86/vzAjrZLOQTmezeLbW10stkUWm5bM4rGCw1gDh22Jw79GzyRJaZx8GP7ahqjBjtkaex2Jvb/df5nO7q7vp9zw/fX4fXbHPkxnf8y+/fZwN7v/LnGdecst/7gtTD66+TE5JLkhMq4M23Uuk8tkokfvDeNqXP8zBTmhsSwn21AIytEgKPyRYgJr+DHBdeSHb0mQfPrmIwBCY9GymXaLvtkdPmLewdFBrBhosAD7FiQpm36gSRI8McotR937mJ+GOy68T4AfAzj2gEt0ZZfYGMC9nxjg9mABPiWpH3AxTtY0IQdy2wYBXuD6E9ZHYO1gkJHYLcJ6/BPD2hksrO/JC/eahftsF9NTknB5fiL6CKJBjcEp0dsGoku6PyWk8bAh3U343e5VJyzMT+Pd/DMueMeKmJ53ZR8uiLVrVORVsjs/8ldkw5/vo5SGMWAxNq6M+p8lMbypSrEpr3V8QH4jB105dQaLKx/YkTW8MYbLSx8fcXEJ2WKN3RVNigWm22O/vDTyB4kWH2ndybHHKuZ2oOtItbwBuEwWK1LyKaJZ8BbRWW1wz7was8ZjjmKJrdZB9iV0F8+LSxYmL2WBBCmOKk7kN3OUxXUXqFoTqgZjErLQ9JkIN6HiZXGNBxpwe7tfoxKEJq015Y9TnLQXiETHBIRMSChngkQok2z13KcJW1WZ717Y9gCE7QEhwUDqVGkjQAjS0Sdss7RKP2Pu5w479+uonPPItC/dccp+tGj74t9Jkmbh1WcaeCRkQ2IaaIsxW5tpoKOyL9CZRItr3n/ani8Zy76kNITvOpMfDggcliJ65hi7LGczTeQIwrE9QPFUl2EbxhWyXA97HgvKHW8s0sXNxQuOnOnzim/MkMDtIQsdkckFtdxFWQmHoS99k5SAewMuTRamM3x/555k+sWRwaqhSoJF1qj6uZACDpYOOMhZeq95Va0sVRGN3CHSGK/kBHtK5ztezyjbbit2xZQ3BSQBM9A+d8PbmP6fzFM5F2xRzTyxNoEUi3SNsU5OjmWrW7OwJHyiLzWTe5MNsIk1jYN/mSPzQ+022JFtcN/ieUeMwh10YThvAkI2JHTAGDOv6L/VDtvyA5IjvgWsCyNX2MjAPuQUL7b0Z5YBulArS1Yrp+dqZehSK0hIl1qBbBRhzWolFxxmof/E80JSM/JzylvPbp9IRJZBWpvI8scOLT0yOrT0qi6rnkFSYelxzyAJCy6l5Tw/DAeELEhIEyZt0DCATM2YVLX59EyvcP9NPXJ06ZXTkl7BEMLSq1cl+bqtfw3Kmk5p0RdinN+dZffE9VwxGWJ+UVif8VBrZh/LZZV7wsudPqez94wk168u8yDbMwUeWiIPHXHWaC+/xJbEw4eYruK8aLxn4ZbGnSaSju0cUUJmqUQGtqiEcjGjlwzEwFeaNlYxtA2OySWNXnLMBagEdg8rZ9vg3wDqGoqopOyF6k1YAgsFptrPnb1sCchCqoCstlBYrOeatuaQRVfVo1yP4kMRu/z/RnwbreWU3/8aNbHW4Q1AH6vK2o+2SWBAqME2CXxmm0QXtsgdgOwx6JkU40ME25dO1QT3KFmpK0qjXgygIqOwCX3LnB0XJKLehYpQLXcfsi2a3JB0w5qrpPjMikxCVjyFrmtW42U9r2dKhGCV7FJrAsttp9qPs5UI9gsWi4i6lKjU0ePll+zdZJ2mvOioT7CNd5qOm8o/XLnsMvtnF2zzHvuKf8mWzIMlC/U6Ll9h0wGMay9Vcy1NbrAWNTduv9ye2a9qafBHlwoxINTUUiGGS5KalyVcueTUM61ShNx9C61gjf9irYL70FvTKqRZq+Sy3O89qJzj8pTqhVbA79ntWXO58Fa9iqXm+K4Xzz5LWFacbfXxrFHY+BZsgnxJp1OuIqhMXVUz3QG00yg6ZXtnzkDM7FycKQJCNiTUUKZoa27TcgdQmVIEX+O+6RUMvi7dzQOjOPvE7Txn6xV0x55mvRpAZcscgmIBD+ReHH8BQvjE+OsS2cvVp69+vHhh0hiVG4FKb/9Il2kxwTPhbkMosA1CsfelKffuycUCDXAhr0GaLRwVn/mikXGVvYm1+T0yqG9IAh7bvbRDG7p+3FCHtu2qr6PLRHuWpHOKBoPfO28wgE1B4g41htKOQnJPV32hSRdnDgCZFoh5DqzynYtTCx1ryGtwk5t3UudOD4AFoSO+rwMiy2oPWQNo3SmDg14jyzwKAde+0AO+gyxIVtfWEhtYft3+UC6x9BK2luMoS3t7w9aVQ9RVS2is4K4Erd0z0IKw72KUmjB+PBGXl0BnANm+Itk/eR//524/9XXgjwLork56A9hZpAqx+1b2dsSXg3lgu3nV9nS+nh1765gNyepKjM1mta5UauF1cXEivkag62pVta2nZAJuz9GXL7KsMWjCXXbWxsLX8yZ1RpUvHioHwuAp9uOg0+VSE2y9tLFy41EbvLT6b+JUrtPomYmDKYkpRsWXu9KjuU5j2+ihA9dt4oZQu1IE631zrIdexX62lgFCTblOCzY06NYrufT1CO1/157TRONj+bODlVso23AFctmr+jmEvjDPto6+L65DPypXbyTNey6juM7YhxywDRxyryl+sa/7Hz3Ogb3/ZWk0+w8=</diagram></mxfile>
```

### Embed local drawio file

The value of the link attribute `link-type` needs to be a `drawio` string. The use of the link format will not affect other Markdown resolver resolving.

```markdown
[drawio](./test.drawio){link-type="drawio"}
```

## Luckysheet Table

The value of the link attribute `link-type` needs to be a `luckysheet` string. The use of the link format will not affect other Markdown resolver resolving.

```markdown
[luckysheet](./test.luckysheet){link-type="luckysheet"}
```

## Container Block

Support functions similiar to [VuePress Container Block](https://v2.vuepress.vuejs.org/zh/reference/default-theme/markdown.html#%E8%87%AA%E5%AE%9A%E4%B9%89%E5%AE%B9%E5%99%A8),using [markdown-it-container](https://github.com/markdown-it/markdown-it-container) to achieve.

**Use It**

```md
::: <type> [title]
[content]
:::
```

`type` is required, `title` and `content` are optional.

The supported `types` are: `tip` `warning` `danger` `details` `group` `group-item`

**Example**

::: tip
This is a prompt
:::

::: warning
This is a warning
:::

::: danger
This is a danger warning
:::

::: danger STOP
Dangerous area, no pass
:::

::: details
This is a details label
:::

::: details click to expand more
This is a details label
:::

:::: group This is label group

::: group-item Tab 1
test 1
:::

::: group-item *Tab 2
test 2
Title starts with `*` mean that this tab is activated by default
:::

::: group-item Tab 3
test 3
:::

::::

## Front Matter

The page supports configuration information similar to [Jekyll Front Matter](https://jekyllrb.com/docs/front-matter/)

Built-in variables

variable name | type | description
---- | ----- | ---
`headingNumber` | `boolean` | whether to enable the page title serial number
`enableMacro` | `boolean` | whether to enable macro replacement
`define` | `Record<string, string>` | Macro definition, string replacing

### Definition

The `define` field can define some text replacement mappings. Supports definition in another file, supports macro expressions. For details, please refer to the Front Matter at the top of this document.

- App Name: --APP_NAME--
- App Version: --APP_VERSION--
- From Another File: --TEST_DEFINE--

## Macro Replacement

> <a href="javascript: ctx.showPremium()">available in premium version</a>

Yank Note allows you to embed macros in the page to dynamically replace the document.

### Use It

Before using, you need to enable macro replacement in Front Matter and define `enableMacro: true`

```md
[= <expression> =]
```

 `expression` is the js expression that needs to be executed, and supports await/Promise asynchronous expressions.

If the expression needs to contain [\= or =\], please enter `[\=` or `=\]` to escape and replace.

### Some Examples

- whether to enable the page title serial number:  [= headingNumber =]
- use variable:  [= customVar =]
- custom variable:  [= $export('testVar', 'Test') =][= testVar =]
- application version： [= $ctx.version =]
- current document name： [= $doc.basename =]
- current time:  [= $ctx.lib.dayjs().format('YYYY-MM-DD HH:mm') =]
- qualifier escape:  [= '[\= =\]' =]
- Arithmetic:  [= (1 + 2) / 2 =]
- reference file (support 3 levels of nesting, you can use Front Matter variable defined in the target document):
    > [= $include('./_FRAGMENT.md', true) =]
- variable defined in the referenced document: [= customVarFromOtherDoc =]
- your IP address: [= fetch('https://ifconfig.me/ip').then(r => r.text()) =]
- weather forecast:
    ```
    [= await ctx.utils.sleep(1000), fetch('https://wttr.in?0AT').then(r => r.text()) =]
    ```
- Nine-Nine Multiplication Table:
  [=
  (function nine (num) {
      let res = ''
      for (let i = 1; i <= num; i++) {
          let str = '';
          for (let k = 1; k <= num; k++) {
              if (i >= k) {
                  str += k + 'x' + i + '=' + i*k + ' ';
              }
          }
          res = res + str + '\n'
      }
      return res
  })(9)
  =]

### Available Variables

Macro code can use variables defined in Front Matter, or use the following built-in variables

variable name | type | description
---- | ----- | ---
`$ctx` | `object` | Editor `ctx`，refer to [Plug-In Development GUide](PLUGIN.md) and [Api Document](https://yn-api-doc.vercel.app/modules/context.html)
`$include` | `(path: string, trim = false) => Result` | Introduce other document fragment methods
`$export` | `(key: string, val: any) => Result` | Define a variable that can be used in this document
`$noop` | `() => Result` | no operation, Used for holding text space
`$doc` | `object` | Current document information
`$doc.basename` | `string` | File name of current document (no suffix)
`$doc.name` | `string` | File name of current document
`$doc.path` | `string` | Current document path
`$doc.repo` | `string` | Current document repository
`$doc.content` | `string` | Current document content
`$doc.status` | `'loaded', 'save-failed', 'saved'` | Current document status

## Command Line Parameters

When handing over documents to others, you can use scripts or custom command line parameters to start the application to facilitate the other party to view the documents.

name               | use         | default value |  description                    | example
----------------- | ------------ | ----- | ----------------------- | ----
--port            | Server listening port | 3044 | port                      | --port=8080
--disable-tray    | Disable the resident tray   | false | true/false              | --disable-tray
--readonly        | Editor readonly    | false | true/false               | --readonly
--show-status-bar | Show status bar    | true  | true/false               | --show-status-bar=false
--data-dir        | Data directory      | none     |      directory path string       | --data-dir='./.data'
--init-repo       | Initial repository name    | none   | string                    | --init-repo='test'
--init-file       | Load file path  | none   | file path, relative to repository path     | --init-file='/1.md'

## Plug-In Development

Please refer to [Plug-In Development Guide](PLUGIN.md)

[^1]: This is a footnote
[^2]: This is a footnote too
