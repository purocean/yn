# ECharts Test

This document tests ECharts chart rendering in Yank Note.

> **Note**: Requires the `@yank-note/extension-echarts` extension.

## Line Chart

```js
// --echarts--
const option = {
  title: { text: 'Monthly Sales' },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  },
  yAxis: { type: 'value' },
  series: [{
    data: [820, 932, 901, 1034, 1290, 1330],
    type: 'line',
    smooth: true
  }]
}
chart.setOption(option, true)
```

## Bar Chart

```js
// --echarts--
const option = {
  title: { text: 'Weekly Report' },
  tooltip: {},
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  yAxis: { type: 'value' },
  series: [{
    data: [120, 200, 150, 80, 70, 110, 130],
    type: 'bar',
    itemStyle: { color: '#5470c6' }
  }]
}
chart.setOption(option, true)
```

## Pie Chart

```js
// --echarts--
const option = {
  title: {
    text: 'Technology Stack',
    left: 'center'
  },
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: '60%',
    data: [
      { value: 40, name: 'JavaScript' },
      { value: 25, name: 'TypeScript' },
      { value: 15, name: 'Vue.js' },
      { value: 12, name: 'Node.js' },
      { value: 8, name: 'Other' }
    ]
  }]
}
chart.setOption(option, true)
```

## Scatter Chart

```js
// --echarts--
const data = [];
for (let i = 0; i < 50; i++) {
  data.push([Math.random() * 100, Math.random() * 100]);
}
const option = {
  title: { text: 'Random Distribution' },
  xAxis: { type: 'value' },
  yAxis: { type: 'value' },
  series: [{
    type: 'scatter',
    data: data,
    symbolSize: 8
  }]
}
chart.setOption(option, true)
```

## Radar Chart

```js
// --echarts--
const option = {
  title: { text: 'Skill Assessment' },
  radar: {
    indicator: [
      { name: 'JavaScript', max: 100 },
      { name: 'CSS', max: 100 },
      { name: 'HTML', max: 100 },
      { name: 'Node.js', max: 100 },
      { name: 'Vue.js', max: 100 },
      { name: 'React', max: 100 }
    ]
  },
  series: [{
    type: 'radar',
    data: [{
      value: [90, 85, 95, 80, 88, 70],
      name: 'Developer A'
    }]
  }]
}
chart.setOption(option, true)
```

## Notes

- Use `// --echarts--` marker in the first line of a JavaScript code block
- The `chart` object is available for calling `setOption`
- All ECharts configuration options are supported
- Charts are interactive with tooltips, zoom, etc.
