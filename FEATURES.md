# Yank-Note 特色功能使用说明

## TOC 生成
需要生成目录的地方写入 `[toc]{type: "ul", level: [1,2,3]}`
可以控制目录样式 `ul` 或 `ol` 和级别
[toc]{type: "ul", level: [1,2,3]}

## 系统配置
1. 用户数据目录存放在 `<home>/yank-note` 下面
1. 配置文件 `<home/yank-note/config.json>`

## 多仓库
1. 系统默认有一个 `main` 仓库，默认位于 `<home>/yank-note/main`
1. 在配置文件 `<home/yank-note/config.json>` 中可以配置多个仓库，或者自定义 `main` 仓库路径

## 文件管理
Yank-Note 最初是为了方便自己写 Markdown，所以很多功能直接使用的快捷键操作
1. 新增文件：`双击目录`
1. 在系统中打开文件/目录：`Ctrl ＋ 双击文件/目录`
1. 删除文件/目录：`Shift + 右键文件/目录`
1. 重命名文件/目录：`Ctrl + 右键文件/目录`
1. 刷新目录树 `双击目录空白区域`

## 待办切换
在预览界面打勾试试
+ [ ] TEST1
+ [ ] TEST2
+ [ ] TEST3

## 加密文档
1. 以 `.c.md` 结尾的文档视为加密文档，可以用来保存机密的信息。
2. 加密和解密过程均在前端完成
3. 请务必保管好文档密码，密码一旦丢失就只能自己暴力破解了。

## Plantuml 图形解析
系统需要有 Java 环境，并安装有 graphviz
示例如下

@startuml
a -> b
@enduml

## 导出 DOCX 文件
使用此功能之前系统需要安装需要安装 [pandoc](https://pandoc.org/)

## 表格增强
此功能由 [markdown-it-multimd-table](https://github.com/RedBug312/markdown-it-multimd-table) 插件提供
支持在表格中使用多行文本和列表。支持表格说明渲染

First header | Second header
-------------|---------------
List:        | More  \
- [ ] over   | data  \
- several    |
----- | -----
ds | fsfdd
[测试表格]

## Katex 公式解析
此功能由 [markdown-it-katex](https://github.com/waylonflinn/markdown-it-katex) 插件提供

$$\begin{array}{c}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &
= \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} & = 0
\end{array}$$

## 运行代码
支持运行 `PHP` `nodejs` `Python` `bash` `bat` 代码。
此功能执行外部命令实现，所以需要安装相应环境。

代码块第一行需要包含以 `--run--` 字符串，示例如下
```php
// --run--
echo 'HELLOWORD!';
```

```js
// --run--
console.log('HELLOWORD')
```

```python
# --run--
print('HELLOWORD')
```

```bash
# --run--
date
```

```bat
REM --run--
@echo HELLOWORD
```

## 集成终端
1. 使用 `Ctrl + O` 或者点击状态栏 **切换终端** 菜单唤起集成终端
1. 支持在编辑器中选中一段代码后按下 `Ctrl+Alt+R` 直接在终端中运行命令。免去复制粘贴。
1. 切换内置终端工作目录到当前目录 `Ctrl + Alt + 单击目录`

## 小工具
支持在文档中嵌入 HTML 小工具。
HTMl代码块第一行需要包含以 `--applet--` 字符串，其余字符串作为小工具标题，示例如下

```html
<!-- --applet-- Hash -->

<script>
function run (type) {
    const input = document.getElementById('input')
    const output = document.getElementById('output')
    output.value = ''

    switch (type) {
        case 'md5':
            output.value = CryptoJS.MD5(input.value).toString().toLowerCase()
            break
        case 'sha1':
            output.value = CryptoJS.SHA1(input.value).toString().toLowerCase()
            break
        case 'sha256':
            output.value = CryptoJS.SHA256(input.value).toString().toLowerCase()
            break
    }
    output.focus()
    output.select()
}
</script>

<div>
    输入
    <textarea id="input" style="display: block; width: 100%"></textarea>
    <button onclick="run('md5')">MD5</button>
    <button onclick="run('sha1')">SHA1</button>
    <button onclick="run('sha256')">SHA256</button>
    <textarea id="output" style="display: block; width: 100%"></textarea>
    <button onclick="document.getElementById('input').value = ''; document.getElementById('output').value = ''">清空</button>
    <button onclick="var x = document.getElementById('output'); x.value = x.value.toUpperCase()">结果大写</button>
</div>
```

## ECharts 图形
Js 代码块第一行包含以 `--echarts--` 字符串会被解析成 ECharts 图形，示例如下

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
            color: '#ccc'
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
            name:'访问来源',
            type:'pie',
            radius : '55%',
            center: ['50%', '50%'],
            data:[
                {value:335, name:'直接访问'},
                {value:310, name:'邮件营销'},
                {value:274, name:'联盟广告'},
                {value:235, name:'视频广告'},
                {value:400, name:'搜索引擎'}
            ].sort(function (a, b) { return a.value - b.value; }),
            roseType: 'radius',
            label: {
                normal: {
                    textStyle: {
                        color: 'rgba(255, 255, 255, 0.3)'
                    }
                }
            },
            labelLine: {
                normal: {
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.3)'
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

## 编辑器快捷键
+ 默认快捷键参考 [vscode](https://code.visualstudio.com/)
    + `Ctrl + X` 剪切所选/当前行
    + `Ctrl + C` 复制所选/当前行
    + `Ctrl + Z` 撤消
    + `Ctrl + Shift + Z` 反撤消
    + `Ctrl + /` 注释行
    + `Ctrl + Shift + A` 注释段
    + `Ctrl + K, Ctrl + X` 删除尾部空格
    + `Alt + Click` 插入光标
    + `Shift + Alt + ↑/↓` 在相邻行插入光标
    + `Ctrl + U` 取消最后添加的光标
    + `Shift + Alt + I` 在选中区的所有行的最后添加光标
    + `Ctrl + D` 为下一个匹配项添加光标
    + `Ctrl + F` 查找
    + `Ctrl + H` 替换
+ 自定义编辑器快捷键
    + `Ctrl + P` 打开文件快速跳转面板
    + `Ctrl + S` 保存文档
    + `Ctrl + Enter` 强制插入新行，忽略预置补全规则
    + `Shift + Enter` 强制插入 Tab，忽略预置补全规则
    + `Ctrl + Shift + Up` 当前行上移
    + `Ctrl + Shift + Down` 当前行下移
    + `Ctrl + Shift + D` 重复当前行
    + `Ctrl + Alt + D` 插入当前日期
    + `Ctrl + Alt + T` 插入当前时间
    + `Ctrl + Alt + F` 插入文件附件
    + `Ctrl + Alt + I` 插入文档链接
    + `Ctrl + J` 连接行 join lines
    + `Ctrl + K, Ctrl + U` 转换大写
    + `Ctrl + K, Ctrl + L` 转换小写
    + `Ctrl + Alt + R` 在内置终端里面运行选中内容
    + `Ctrl + B + V` 粘贴 HTML 富文本

## 元素属性书写
此功能使用如下库实现 [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs)
示例红色文字：
**test**{style="color:red"}

## 其他
1. 转换单个外链图片到本地：`Ctrl + Shift + 单击图片`
1. 转换所有外链图片到本地 `Ctrl + Alt + L`
1. 在系统中打开文件/目录：`Ctrl ＋ 双击文件/目录`
1. 切换文档预览显示：`Alt + V` 或点击状态栏 `切换预览` 按钮
1. 切换编辑器自动换行：`Alt + W` 或点击状态栏 `切换换行` 按钮
1. 粘贴 HTML 富文本为 Markdown `Ctrl + B + V`
1. 打开文件快速切换面板 `Ctrl + P`
