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

`<home>` is the directory of the current user. Example:

1. Windows: `C:\Users\<username>`
1. Linux: `/home/<username>`
1. Mac: `/Users/<username>`

The application generated data is stored in `<home>/yank-note` dir, click the "Open Main Dir" menu in the tray to view them.

Directory description

1. configuration file `<home>/yank-note/config.json`
1. export docx reference doc `<home>/yank-note/pandoc-reference.docx`
1. document versions `<home>/yank-note/histories`
    > [!TIP]
    > If you accidentally lost your document content, you can check this folder and try to recovery it.

    > [!CAUTION]
    > For performance reasons, documents with more than *102400* characters will not store history. Therefore, please be careful when embedding Base64 images in documents.

1. plug-ins `<home>/yank-note/plugins`
1. themes `<home>/yank-note/themes`
1. extensions `<home>/yank-note/extensions`
1. other user data `<home>/yank-note/data`

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

## Markdown Enhance

Type '/' in the editor to get prompts

+ Mark: ==marked==
+ Sup: 29^th^
+ Sub: H~2~0
+ Footnote: footnote[^1] syntax[^2]
+ Emoji: :) :joy:
+ Abbr：
    *[HTML]: Hyper Text Markup Language
    *[W3C]:  World Wide Web Consortium
    The HTML specification is maintained by the W3C.
+ Wiki Link: Supports using `[[filename#anchor|display text]]` syntax to link documents, such as [[README#Highlights|Highlights]]

## Github Alerts

This feature is implemented using [markdown-it-github-alerts](https://github.com/antfu/markdown-it-github-alerts), providing support for [GitHub-style alert prompts](https://github.com/orgs/community/discussions/16925).

> [!NOTE] Note
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.

### Element Attribute

This feature is implemented using [markdown-it-attributes](https://github.com/purocean/markdown-it-attributes).

- Red Text, white background, border, align text center {.bgw .text-center .with-border style="color:red"}
- Display As **Block Element**{.block}
- Escape\{style="color:red"}

**Some built-in style classes:**

| Class Name | Description |
| -- | -- |
| `avoid-page-break` | Avoid page breaks inside the element when printing/exporting PDF |
| `new-page` | Page break before the element when printing/exporting PDF |
| `skip-print` | Skip the element when printing/exporting PDF |
| `skip-export` | Skip the element when exporting/copying HTML |
| `inline` | The current element is displayed as an inline element |
| `block` | The current element is displayed as a block element |
| `reduce-brightness` | Reduce the brightness of the element when using dark theme |
| `bgw` | Set current element background to white |
| `copy-inner-text` | Mark "Ctrl/Cmd + left click" to copy element text |
| `wrap-code` | Applied to a code block to make it wrap |
| `text-left` | Align text left for the current element |
| `text-center` | Align text center for the current element |
| `text-right` | Align text right for the current element |
| `with-border` | Add borders to the current element |

### Image Enhancement

![](mas_en.svg?.inline)

1. If the paragraph has one image element only, the picture will be rendered as a block element and centered by default. If you want to display the image as an inline element, you can add `.inline` after the image link parameter, example is above.
1. If you want to add a white background to the image to optimize the display effect (for some transparent images), you can add `.bgw` after the image link parameter, such as: ![](mas_en.svg?.bgw)
1. You can use [markdown-it-imsize](https://github.com/tatsy/markdown-it-imsize) to set the image size. For example, this is an image with a width of 16px: ![](logo-small.png?.inline =16x)

## Mind Map

Just need to add `{.mindmap}` to the end of root node of the list.

+ Central node{.mindmap}
    + [1] State Visibility
    + [2] Environmental Appropriate
    + [3] User Controllable
    + [4] Consistency
    + [5] Error Proofing
    + [6] Accessibility
    + [7] Agility and Efficiency
    + [8] Grace and Simplicity
    + [9] Fault Tolerance
    + [10] Friendly Help

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

## PlantUML

You can *<a href="javascript: ctx.setting.showSettingPanel('plantuml-api')">configure</a>* the use of local endpoint or PlantUML online endpoint to generate graph in Settings.

> [!IMPORTANT]
> If you are use local endpoint, the system needs to have a Java environment with Graphviz installed.
If it prompts an error `Cannot find Graphviz`,
Please refer to [Test your GraphViz installation](https://plantuml.com/graphviz-dot)

The example is as follows

@startuml
a -> b
@enduml

## Table Enhancement

This feature is implemented using [markdown-it-multimd-table](https://github.com/RedBug312/markdown-it-multimd-table).
Support the use of multiple lines of text and lists in tables. Support table description rendering.

You can double-click or right-click on a cell to quickly edit its content. Here are the related shortcuts:

- `DBLClick`: Edit cell
- `Escape`: Exit editing
- `Enter`: Confirm editing and move to the next row
- `Shift + Enter`: Confirm editing and move to the previous row
- `Cmd/Ctrl + Shift + Enter`: Confirm editing and insert a new row below
- `Tab`: Confirm editing and move to the next column
- `Shift + Tab`: Confirm editing and move to the previous column

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

| h1 | h2 | h3 |
| -- | -- | -- |
| x1 | x2 | x3 {rowspan=2 style="color:red"} |
| x4 {colspan=2} |
[Merge Cells]

## Katex

This feature is provided by [KaTeX](https://github.com/KaTeX/KaTeX).

$$
\begin{array}{c}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &
= \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} & = 0
\end{array}
$$

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
console.log('HELLOWORLD')
```

```js
// --run-- --output-html--
console.log(`output <i>HTML</i>`)
```

```node
// --run--
console.log('HELLOWORLD')
```

```php
// --run--
echo 'HELLOWORLD!';
```

```python
# --run--
print('HELLOWORLD')
```

```shell
# --run--
date
```

```bat
REM --run--
@echo HELLOWORLD
```

```c
// --run-- gcc $tmpFile.c -o $tmpFile.out && $tmpFile.out

#include <stdio.h>

int main () {
    printf("Hello, World!");
    return 0;
}
```

```java
// --run-- java $tmpFile.java

class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
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

You can also *<a href="javascript: ctx.showExtensionManager('@yank-note/extension-repl')">install and activate the Vue Repl extension</a>* to write applet using Vue SFC.

## ECharts

The string containing `--echarts--` in the first line of the Js code block will be resolved into ECharts graphics, the example is as follows

```js
// --echarts--

const option = {
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
}

chart.setOption(option, true)
```

## Draw.io

The value of the link attribute `link-type` needs to be a `drawio` string. The use of the link format will not affect other Markdown resolver resolving.

[drawio](./test.drawio){link-type="drawio"}

## Luckysheet Table

The value of the link attribute `link-type` needs to be a `luckysheet` string. The use of the link format will not affect other Markdown resolver resolving.

> [!WARNING]
> [Luckysheet](https://github.com/mengshukeji/Luckysheet) has many bugs and should be used with caution.

[luckysheet](./test.luckysheet){link-type="luckysheet"}

## Container Block

Support functions similiar to [VuePress Container Block](https://v2.vuepress.vuejs.org/zh/reference/default-theme/markdown.html#%E8%87%AA%E5%AE%9A%E4%B9%89%E5%AE%B9%E5%99%A8),using [markdown-it-container](https://github.com/markdown-it/markdown-it-container) to achieve.

**Use It**

```md
::: <type> [title]
[content]
:::
```

`type` is required, `title` and `content` are optional.

The supported `types` are: tip, warning, danger, details, group, group-item, row, col, section, div

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

::::: row Columns
:::: col TODO
::: warning
Item 1
:::
::: warning
Item 2
:::
::: warning
Item 3
:::
::::
:::: col DONE
::: tip
Item 4
:::
::: tip
Item 5
:::
::::
:::::

:::: row
::: col Column 1
test 1
:::
::: col Column 2
test 2
:::
::: col Column 3
test 3
:::
::::

## AI Copilot

Yank Note integrates with artificial intelligence platforms such as [OpenAI](https://openai.com) and [Google AI](https://ai.google.dev/), enabling features like intelligent autocompletion and text rewriting.

> [!NOTE]
> You need to obtain the relevant API tokens yourself. *<a href="javascript: ctx.showExtensionManager('@yank-note/extension-openai')">Requires AI Copilot extension installed and enabled</a>*.

## Front Matter

The page supports configuration information similar to [Jekyll Front Matter](https://jekyllrb.com/docs/front-matter/)

Built-in variables

variable name | type | description
---- | ----- | ---
`headingNumber` | `boolean` | whether to enable the page title serial number
`wrapCode` | `boolean` | whether to enable code wrapping
`enableMacro` | `boolean` | whether to enable macro replacement
`define` | `Record<string, string>` | Macro definition, string replacing
`defaultPreviewer` | `string` | The default previewer for the document, some extensions may provide a special preview interface. Such as *<a href="javascript: ctx.showExtensionManager('@yank-note/extension-reveal-js')">Reveal.js extension</a>*
`mdOptions` | `Record<string, boolean>` | Markdown-it parse options
`mdOptions.html` | `boolean` | Enable HTML tags in source
`mdOptions.breaks` | `boolean` | Convert `\n` in paragraphs into `<br>`
`mdOptions.linkify` | `boolean` | Autoconvert URL-like text to links
`mdOptions.typographer` | `boolean` | Enable some language-neutral replacement + quotes beautification
`katex` | `Record<string, any>` | [Katex Options](https://katex.org/docs/options.html)

## Macro Replacement
> [!NOTE]
> *<a href="javascript: ctx.showPremium()">Available in premium version</a>*

Yank Note allows you to embed macros in the page to dynamically replace the document.

> [!IMPORTANT]
> Before using, you need to enable macro replacement in Front Matter and define `enableMacro: true`.

> [!WARNING]
> Using macro replacement may lead to inaccurate correspondence between source code and preview line numbers. Yank Note has dealt with it as much as possible, but some cases may still cause synchronous scrolling exceptions.

### Definition

The `define` field can define some text replacement mappings. Supports definition in another file, supports macro expressions. For details, please refer to the Front Matter at the top of this document.

> [!TIP]
> You can define global macros in the <a href="javascript: ctx.setting.showSettingPanel('macros')">settings</a>. But you still need to define `enableMacro: true` in Front Matter.

- App Name: --APP_NAME--
- App Version: --APP_VERSION--
- From Another File: --TEST_DEFINE--

### Macro Expression

Syntax:

```md
[= <expression> =]
```

 `expression` is the js expression that needs to be executed, and supports await/Promise asynchronous expressions.

If the expression needs to contain [\= or =\], please enter `[\=` or `=\]` to escape and replace.

### Examples

- whether to enable the page title serial number:  [= headingNumber =]
- use variable:  [= customVar =]
- custom variable:  [= $export('testVar', 'Test') =][= testVar =]
- custom function:  [= $export('format', (a, b) => `${a}, ${b}!`) =][= format('HELLO', 'WORLD') =]
- further processing: XXXXXXXXXXXXXX [= $afterMacro(src => src.replace(/X{4,}/g, 'YYYYY')) =]
- application version: [= $ctx.version =]
- current document name: [= $doc.basename =]
- current time:  [= $ctx.lib.dayjs().format('YYYY-MM-DD HH:mm') =]
- sequence: [= $seq`Figure-` =] | [= $seq`Figure-` =] | [= $seq`Figure-` =] | [= $seq`Table-` =] | [= $seq`Table-` =]
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

Macro expression can use variables defined in Front Matter, or use the following built-in variables

variable name | type | description
---- | ----- | ---
`$ctx` | `object` | Editor `ctx`，refer to [Plug-In Development GUide](PLUGIN.md) and [Api Document](https://yn-api-doc.vercel.app/modules/renderer_context.html)
`$include` | `(path: string, trim = false) => Result` | Introduce other document fragment methods
`$export` | `(key: string, val: any) => Result` | Define a variable that can be used in this document
`$afterMacro` | `(fn: (src: string) => string) => Result` | Define a macro-replaced callback function that can be used for further processing of the replaced text.
`$noop` | `() => Result` | no operation, Used for holding text space
`$doc` | `object` | Current document information
`$seq` | `(label: string) => Result` | Sequence
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

## Custom Styles

1. Right click the tray icon and click "Open Main Dir", go to the `themes` folder.
2. Copy `github.css` to a new CSS file ans modify it.
3. Open Setting => Appearance => Custom CSS switch CSS file.

## Plug-In Development

Please refer to [Plug-In Development Guide](PLUGIN.md)

[^1]: This is a footnote
[^2]: This is a footnote too
