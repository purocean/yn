// https://github.com/DeepElement/markdown-it-plantuml-offline
import { debounce } from 'lodash-es'
import pako from 'pako'
import { defineComponent, h, nextTick, onMounted, reactive, ref, watch } from 'vue'
import Markdown from 'markdown-it'
import Token from 'markdown-it/lib/token'
import { Plugin } from '@fe/context'

const emptySrc = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

const baseUrl = location.origin + '/api/plantuml/png'

const MarkdownItPlugin = function umlPlugin (md: Markdown, options: any) {
  function generateSourceDefault (umlCode: string) {
    if (!umlCode.trim()) {
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMzIgMzIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDE9Ii0zMy40MjMiIHkxPSItMjUwLjkxMSIgeDI9Ii0zMy4zNTMiIHkyPSItMjUwLjg1OCIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgzNy4xMzQsIDI2LjAwMSwgMTMuNTc1LCAtMTkuMzg3LCA0NjczLjQ3MywgLTM5ODIuMDE5KSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzc2NzY3NiIvPjxzdG9wIG9mZnNldD0iMSIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJiIiB4MT0iLTMyLjEwNyIgeTE9Ii0yNDIuNTYzIiB4Mj0iLTMyLjAyOCIgeTI9Ii0yNDIuNTg2IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDgxLjA4MSwgNTYuNzc0LCAxNy4zMDYsIC0yNC43MTUsIDY4MDQuMDIxLCAtNDE0OS42NDQpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMDA3OWI5Ii8+PHN0b3Agb2Zmc2V0PSIxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSItMzMuMjgyIiB5MT0iLTI0My40MjMiIHgyPSItMzMuMjI0IiB5Mj0iLTI0My40NTUiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoNjAuMDAzLCA0Mi4wMTUsIDM0LjE4NCwgLTQ4LjgyLCAxMDM0My4wMDUsIC0xMDQ2OS4wODQpIiB4bGluazpocmVmPSIjYiIvPjxsaW5lYXJHcmFkaWVudCBpZD0iZCIgeDE9IjEyLjM1NiIgeTE9IjI2LjI2OCIgeDI9IjE0LjAxMSIgeTI9IjI2LjI2OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzU5NTk1OSIvPjxzdG9wIG9mZnNldD0iMC4wODciIHN0b3AtY29sb3I9IiM2ZTZlNmUiLz48c3RvcCBvZmZzZXQ9IjAuMjQyIiBzdG9wLWNvbG9yPSIjOGM4YzhjIi8+PHN0b3Agb2Zmc2V0PSIwLjQwNSIgc3RvcC1jb2xvcj0iI2E0YTRhNCIvPjxzdG9wIG9mZnNldD0iMC41NzciIHN0b3AtY29sb3I9IiNiNWI1YjUiLz48c3RvcCBvZmZzZXQ9IjAuNzY1IiBzdG9wLWNvbG9yPSIjYmZiZmJmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYzJjMmMyIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSIxOC4yOTEiIHkxPSIyNi4xNzEiIHgyPSIxOS45NDYiIHkyPSIyNi4xNzEiIHhsaW5rOmhyZWY9IiNkIi8+PGxpbmVhckdyYWRpZW50IGlkPSJmIiB4MT0iMjQuNDQiIHkxPSIyNi4xNzEiIHgyPSIyNi4wOTYiIHkyPSIyNi4xNzEiIHhsaW5rOmhyZWY9IiNkIi8+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmZmYiLz48dGl0bGU+ZmlsZV90eXBlX3BsYW50dW1sPC90aXRsZT48cG9seWdvbiBwb2ludHM9IjIwLjMwNSAxNy44NzIgMjcuMTYgMjIuNDE4IDIxLjcyIDI1LjQ5MyAxNC44NjEgMjAuOTk5IDIwLjMwNSAxNy44NzIiIHN0eWxlPSJmaWxsOiMxYzBhNDIiLz48cGF0aCBkPSJNMjEuNzE2LDI1LjYxOWwtLjA1NS0uMDM2LTcuMDA1LTQuNTksNS42NTMtMy4yNDcsNy4wNTYsNC42OFptLTYuNjUtNC42MTMsNi42NTgsNC4zNjIsNS4yMzEtMi45NTdMMjAuMywxOFoiLz48cG9seWdvbiBwb2ludHM9IjI2LjQwMSAxMS45MDkgMjkuNDE4IDEzLjU5MiAyNy4wNyAxNS4wODggMjQuMjEzIDEzLjI0NyAyNi40MDEgMTEuOTA5IiBzdHlsZT0iZmlsbDp1cmwoI2EpIi8+PHBhdGggZD0iTTI3LjA2OSwxNS4yMTVsLTMuMDU4LTEuOTcsMi4zODctMS40NiwzLjIyOCwxLjhabS0yLjY1NC0xLjk2NkwyNy4wNywxNC45NiwyOS4yMDgsMTMuNmwtMi44LTEuNTY1WiIvPjxwb2x5Z29uIHBvaW50cz0iMTQuNDk4IDE3LjgwNyAyMS4zNTQgMjIuMzU0IDE1LjkxNCAyNS40MjkgOS4wNTUgMjAuOTM1IDE0LjQ5OCAxNy44MDciIHN0eWxlPSJmaWxsOiNmZmJkM2YiLz48cGF0aCBkPSJNMTUuOTEsMjUuNTU0bC0uMDU1LS4wMzZMOC44NSwyMC45MjksMTQuNSwxNy42ODFsNy4wNTYsNC42OFpNOS4yNiwyMC45NDEsMTUuOTE4LDI1LjNsNS4yMzEtMi45NTctNi42NTQtNC40MTNaIi8+PHBvbHlnb24gcG9pbnRzPSI3Ljk5IDE3Ljk2NiAxNC45NTQgMjIuMzY2IDkuNTc3IDI1LjUwNCAyLjIxOCAyMC44NDkgNy45OSAxNy45NjYiIHN0eWxlPSJmaWxsOiNhMTFmNDAiLz48cGF0aCBkPSJNOS41NzUsMjUuNjI5LDIsMjAuODM4bDYtMyw3LjE2NCw0LjUyN1pNMi40MzYsMjAuODYsOS41OCwyNS4zNzhsNS4xNjgtMy4wMTZMNy45ODQsMTguMDg5WiIvPjxwb2x5Z29uIHBvaW50cz0iMi4xMTEgMjEuMDIxIDkuNDQzIDI1LjUxNSA5LjQ0MyAyOS4wNjMgMi4xMTEgMjQuMzMyIDIuMTExIDIxLjAyMSIgc3R5bGU9ImZpbGw6dXJsKCNiKSIvPjxwYXRoIGQ9Ik05LjU1LDI5LjI2LDIsMjQuMzkxVjIwLjgyOUw5LjU1LDI1LjQ1NVpNMi4yMTgsMjQuMjc0bDcuMTE4LDQuNTkyVjI1LjU3NUwyLjIxOCwyMS4yMTNaIi8+PHBvbHlnb24gcG9pbnRzPSIyNC4wNzEgMTMuMzQzIDI3LjAwOSAxNS4yMjIgMjcuMDA5IDIyLjEzMSAyNC4wNzEgMjAuMjQ3IDI0LjA3MSAxMy4zNDMiIHN0eWxlPSJmaWxsOnVybCgjYykiLz48cGF0aCBkPSJNMjcuMDYzLDIyLjIyOWwtMy4wNDUtMS45NTNWMTMuMjQ1bDMuMDQ1LDEuOTQ3Wm0tMi45MzgtMi4wMTIsMi44MzEsMS44MTVWMTUuMjUxbC0yLjgzMS0xLjgxWiIvPjxwb2x5Z29uIHBvaW50cz0iMjcuMTQ5IDIyLjUyNiAyNy4xNDkgMTUuMTk0IDI5LjUxNCAxMy43NzUgMjkuNTE0IDI5LjE0OSAyOC4zMzEgMjkuMTQ5IDkuNjQ2IDI5LjE0OSA5LjY0NiAyNS42MDEgMTUuMDg2IDIyLjUyNiAxNS43ODUgMjUuNjAxIDE1Ljc5NiAyNS42MDEgMjEuNDcyIDIyLjUyNiAyMS44OTEgMjUuNjAxIDIxLjk0NSAyNS42MDEgMjcuMTQ5IDIyLjUyNiIgc3R5bGU9ImZpbGw6I2ZmZiIvPjxwYXRoIGQ9Ik0yOS42MjEsMjkuMjU2SDkuNTM5VjI1LjUzOGw1LjYyLTMuMTc3LjcsMy4wODMsNS43LTMuMDg3LjQyMiwzLjEsNS4wNjEtMi45OTFWMTUuMTMzbDIuNTgtMS41NDhaTTkuNzUzLDI5LjA0MUgyOS40MDdWMTMuOTY0bC0yLjE1MSwxLjI5djcuMzMybC0uMDUzLjAzMS01LjIyOSwzLjA5SDIxLjhsLS40MTEtMy4wMTQtNS41NjQsMy4wMTRIMTUuN2wtLjY4Ni0zLjAxOC01LjI2LDIuOTczWiIvPjxyZWN0IHg9IjEyLjM1NiIgeT0iMjUuNDQiIHdpZHRoPSIxLjY1NiIgaGVpZ2h0PSIxLjY1NiIgcng9IjAuMjE1IiByeT0iMC4yMTUiIHN0eWxlPSJmaWxsOnVybCgjZCkiLz48cGF0aCBkPSJNMTMuOCwyNy4ySDEyLjU3YS4zMjIuMzIyLDAsMCwxLS4zMjItLjMyMlYyNS42NTVhLjMyMi4zMjIsMCwwLDEsLjMyMi0uMzIySDEzLjhhLjMyMi4zMjIsMCwwLDEsLjMyMi4zMjJ2MS4yMjZBLjMyMi4zMjIsMCwwLDEsMTMuOCwyNy4yWk0xMi41NywyNS41NDdhLjEwOC4xMDgsMCwwLDAtLjEwNy4xMDd2MS4yMjZhLjEwOC4xMDgsMCwwLDAsLjEwNy4xMDdIMTMuOGEuMTA4LjEwOCwwLDAsMCwuMTA3LS4xMDdWMjUuNjU1YS4xMDguMTA4LDAsMCwwLS4xMDctLjEwN1oiLz48cmVjdCB4PSIxOC4yOTEiIHk9IjI1LjM0MyIgd2lkdGg9IjEuNjU2IiBoZWlnaHQ9IjEuNjU2IiByeD0iMC4yMTUiIHJ5PSIwLjIxNSIgc3R5bGU9ImZpbGw6dXJsKCNlKSIvPjxwYXRoIGQ9Ik0xOS43MzIsMjcuMTA2SDE4LjUwNWEuMzIyLjMyMiwwLDAsMS0uMzIyLS4zMjJWMjUuNTU4YS4zMjIuMzIyLDAsMCwxLC4zMjItLjMyMmgxLjIyNmEuMzIyLjMyMiwwLDAsMSwuMzIyLjMyMnYxLjIyNkEuMzIyLjMyMiwwLDAsMSwxOS43MzIsMjcuMTA2Wm0tMS4yMjYtMS42NTZhLjEwOC4xMDgsMCwwLDAtLjEwNy4xMDd2MS4yMjZhLjEwOC4xMDgsMCwwLDAsLjEwNy4xMDdoMS4yMjZhLjEwOC4xMDgsMCwwLDAsLjEwNy0uMTA3VjI1LjU1OGEuMTA4LjEwOCwwLDAsMC0uMTA3LS4xMDdaIi8+PHJlY3QgeD0iMjQuNDQiIHk9IjI1LjM0MyIgd2lkdGg9IjEuNjU2IiBoZWlnaHQ9IjEuNjU2IiByeD0iMC4yMTUiIHJ5PSIwLjIxNSIgc3R5bGU9ImZpbGw6dXJsKCNmKSIvPjxwYXRoIGQ9Ik0yNS44ODEsMjcuMTA2SDI0LjY1NWEuMzIyLjMyMiwwLDAsMS0uMzIyLS4zMjJWMjUuNTU4YS4zMjIuMzIyLDAsMCwxLC4zMjItLjMyMmgxLjIyNmEuMzIyLjMyMiwwLDAsMSwuMzIyLjMyMnYxLjIyNkEuMzIyLjMyMiwwLDAsMSwyNS44ODEsMjcuMTA2Wm0tMS4yMjYtMS42NTZhLjEwOC4xMDgsMCwwLDAtLjEwNy4xMDd2MS4yMjZhLjEwOC4xMDgsMCwwLDAsLjEwNy4xMDdoMS4yMjZhLjEwOC4xMDgsMCwwLDAsLjEwNy0uMTA3VjI1LjU1OGEuMTA4LjEwOCwwLDAsMC0uMTA3LS4xMDdaIi8+PHBhdGggZD0iTTI3LjIxNSwxMS4yM2MtLjA1Mi4wNjktLjQxNy0uMjYyLS42NTMtLjUyNmE0LjQwOCw0LjQwOCwwLDAsMS0uNTE2LS43M0EyLjYsMi42LDAsMCwxLDI1LjcsOS4yYTIuMzU4LDIuMzU4LDAsMCwxLS4wNTItLjY4MiwyLjk1OSwyLjk1OSwwLDAsMSwuMTI5LS43NDksMy4xNDIsMy4xNDIsMCwwLDEsLjc4Ny0xLjIwNywxNS41MzIsMTUuNTMyLDAsMCwwLDEuMjgzLTEuNCwzLjA2MiwzLjA2MiwwLDAsMCwuNDc5LS45MjcsMy45NzksMy45NzksMCwwLDAsLjE1MS0uODU1Yy4wMTktLjM2NC0uMDI1LS41OTMuMDIzLS42MTNzLjIxNS4yNzQuMjg3LjU2NGEzLjE2NywzLjE2NywwLDAsMS0uNDU4LDIuMSw2LjksNi45LDAsMCwxLTEuMDk0LDEuNDQ4LDIuOCwyLjgsMCwwLDAtLjg0OSwxLjIzNEEyLjQ2NiwyLjQ2NiwwLDAsMCwyNi4zLDguOGEzLjQ2NSwzLjQ2NSwwLDAsMCwuNDc2LDEuNTQyQzI3LjA2NCwxMC45MTQsMjcuMjU2LDExLjE3NSwyNy4yMTUsMTEuMjNaIiBzdHlsZT0iZmlsbDojZWEyZDJlIi8+PHBhdGggZD0iTTI3LjE5MywxMS4yNjZjLS4xMjQsMC0uNDkyLS4zNjUtLjY1MS0uNTQ0YTQuNDc4LDQuNDc4LDAsMCwxLS41Mi0uNzM0LDIuNjI4LDIuNjI4LDAsMCwxLS4zNDYtLjc4MSwyLjM3NSwyLjM3NSwwLDAsMS0uMDUzLS42OSwyLjk3OCwyLjk3OCwwLDAsMSwuMTMtLjc1NiwzLjIwOCwzLjIwOCwwLDAsMSwuNzkzLTEuMjE2Yy4yOTQtLjMzMS41LS41MjguNjU5LS42ODZhNC4zOTMsNC4zOTMsMCwwLDAsLjYyMi0uNzExLDMuMDUyLDMuMDUyLDAsMCwwLC40NzYtLjkxOSwzLjk1MSwzLjk1MSwwLDAsMCwuMTUtLjg0OWMuMDA4LS4xNTksMC0uMjk0LDAtLjM5MywwLS4xNTktLjAwNi0uMjI1LjAzOC0uMjQzYS4wNS4wNSwwLDAsMSwuMDQzLDAsMS4yMjYsMS4yMjYsMCwwLDEsLjI4LjU3OSwzLjE2NywzLjE2NywwLDAsMS0uNDYsMi4xMjEsNi45MjgsNi45MjgsMCwwLDEtMS4xLDEuNDUzYy0uMDU1LjA2LS4xMDkuMTE2LS4xNjIuMTcxYTIuMywyLjMsMCwwLDAtLjY4MSwxLjA1MiwyLjQ3LDIuNDcsMCwwLDAtLjA4Mi42NzMsMy40NTgsMy40NTgsMCwwLDAsLjQ3MywxLjUzYy4xMTQuMjMxLjIxNS40MTUuMjg5LjU0OS4xMjkuMjM1LjE3OC4zMjMuMTQyLjM2OWgwYS4wNTEuMDUxLDAsMCwxLS4wNC4wMlpNMjguNTEyLDIuOGEuODYzLjg2MywwLDAsMCwwLC4xOWMwLC4xLjAwNy4yMzYsMCwuNGE0LjAyMSw0LjAyMSwwLDAsMS0uMTUyLjg2MSwzLjEwNiwzLjEwNiwwLDAsMS0uNDgzLjkzNCw0LjQzNyw0LjQzNywwLDAsMS0uNjI5LjcxOWMtLjE2Mi4xNTgtLjM2NC4zNTQtLjY1Ny42ODNhMy4xNjgsMy4xNjgsMCwwLDAtLjc4MiwxLjIsMi45MzMsMi45MzMsMCwwLDAtLjEyOC43NDMsMi4zMjUsMi4zMjUsMCwwLDAsLjA1Mi42NzUsMi41OSwyLjU5LDAsMCwwLC4zNDEuNzY3LDQuNDIyLDQuNDIyLDAsMCwwLC41MTMuNzI1LDIuMDM1LDIuMDM1LDAsMCwwLC42MTEuNTI2LDEuMTgzLDEuMTgzLDAsMCwwLS4xNDctLjMxYy0uMDc0LS4xMzQtLjE3NS0uMzE4LS4yOS0uNTUxQTMuNSwzLjUsMCwwLDEsMjYuMjc4LDguOGEyLjUzLDIuNTMsMCwwLDEsLjA4NC0uNjg4LDIuMzc1LDIuMzc1LDAsMCwxLC42OTQtMS4wNzVjLjA1Mi0uMDU1LjEwNi0uMTExLjE2MS0uMTcxYTYuODc5LDYuODc5LDAsMCwwLDEuMDktMS40NDIsMy4xMTksMy4xMTksMCwwLDAsLjQ1Ni0yLjA4M0ExLjI4MSwxLjI4MSwwLDAsMCwyOC41MTIsMi44WiIvPjxwYXRoIGQ9Ik0yOS45NzIsNi4wODdjLS4wMTktLjA4OC0uNDMyLS4wNC0uNzY2LjA3M2EyLjYsMi42LDAsMCwwLTEuMDU5LjcyMiwyLjgsMi44LDAsMCwwLS45MTYsMS44NTUsMi45NzIsMi45NzIsMCwwLDAsLjI1OCwxLjA2Yy4yMjEuNTcyLjQ1NS43NzMuNDQ0LDEuMjI1LS4wMDcuMy0uMTE0LjQ4NC0uMDQ4LjU0OXMuMzE0LS4xLjQ2Mi0uMzEzYTEuOCwxLjgsMCwwLDAsLjI1OS0xLjAyMmMtLjA0Ni0uODE1LS42LTEuMDE1LS42MDgtMS44YTEuODU4LDEuODU4LDAsMCwxLC4xMjktLjY3NkMyOC41Nyw2LjUwOSwzMC4wMDgsNi4yNTIsMjkuOTcyLDYuMDg3WiIgc3R5bGU9ImZpbGw6I2VhMmQyZSIvPjxwYXRoIGQ9Ik0yNy45MzQsMTEuNjE3YS4wOTQuMDk0LDAsMCwxLS4wNjktLjAyNmMtLjA0Ni0uMDQ2LS4wMy0uMTIyLS4wMDUtLjIzN2ExLjcxOCwxLjcxOCwwLDAsMCwuMDQ1LS4zMzEsMS4zNzQsMS4zNzQsMCwwLDAtLjIxNC0uNzIsNSw1LDAsMCwxLS4yMjgtLjQ5NSwyLjk4LDIuOTgsMCwwLDEtLjI1OS0xLjA3LDIuODEsMi44MSwwLDAsMSwuOTIzLTEuODc0LDIuNjQsMi42NCwwLDAsMSwxLjA3LS43MjksMS40ODIsMS40ODIsMCwwLDEsLjc2Ni0uMUEuMDY1LjA2NSwwLDAsMSwzMCw2LjA4MWgwYy4wMTUuMDctLjA5Mi4xMjEtLjMwNi4yMjRhMi43MywyLjczLDAsMCwwLTEuNTQyLDEuNDYzLDEuODI3LDEuODI3LDAsMCwwLS4xMjcuNjY3LDEuNjQ1LDEuNjQ1LDAsMCwwLC4yOTEuODg1LDEuODg5LDEuODg5LDAsMCwxLC4zMTcuOTE0LDEuODE0LDEuODE0LDAsMCwxLS4yNjQsMS4wMzkuODA5LjgwOSwwLDAsMS0uNDIxLjM0MlptMS44ODktNS41NDlhMi4xMTcsMi4xMTcsMCwwLDAtLjYwOC4xMTcsMi41ODgsMi41ODgsMCwwLDAtMS4wNDguNzE1LDIuNzY0LDIuNzY0LDAsMCwwLS45MDksMS44MzcsMi45MzUsMi45MzUsMCwwLDAsLjI1NiwxLjA1LDQuOTU1LDQuOTU1LDAsMCwwLC4yMjUuNDksMS40MzMsMS40MzMsMCwwLDEsLjIyLjc0NSwxLjc2NSwxLjc2NSwwLDAsMS0uMDQ3LjM0MWMtLjAxOS4wOTEtLjAzNS4xNjMtLjAwOS4xODhhLjA0Ni4wNDYsMCwwLDAsLjAzOC4wMS43NjkuNzY5LDAsMCwwLC4zODItLjMyLDEuNzkzLDEuNzkzLDAsMCwwLC4yNTQtMS4wMDUsMS44NDQsMS44NDQsMCwwLDAtLjMxLS44OSwxLjcxMSwxLjcxMSwwLDAsMS0uMy0uOTExLDEuODc3LDEuODc3LDAsMCwxLC4xMy0uNjg2QTIuNzc2LDIuNzc2LDAsMCwxLDI5LjY3LDYuMjU3Yy4xMjYtLjA2MS4yODMtLjEzNi4yNzctLjE2NGwtLjAwOC0uMDA3QS4yNjQuMjY0LDAsMCwwLDI5LjgyMyw2LjA2OFoiLz48L3N2Zz4K'
    }

    const data = btoa(
      pako.deflateRaw(umlCode).reduce((d, b) => d + String.fromCharCode(b), '')
    )

    return baseUrl + '?data=' + encodeURIComponent(data)
  }

  options = options || {}

  const openMarker = options.openMarker || '@startuml'
  const openChar = openMarker.charCodeAt(0)
  const closeMarker = options.closeMarker || '@enduml'
  const closeChar = closeMarker.charCodeAt(0)
  const render = options.render || md.renderer.rules.image
  const generateSource = options.generateSource || generateSourceDefault

  function uml (state: any, startLine: any, endLine: any, silent: any) {
    let nextLine
    let i
    let autoClosed = false
    let start = state.bMarks[startLine] + state.tShift[startLine]
    let max = state.eMarks[startLine]

    // Check out the first character quickly,
    // this should filter out most of non-uml blocks
    //
    if (openChar !== state.src.charCodeAt(start)) { return false }

    // Check out the rest of the marker string
    //
    for (i = 0; i < openMarker.length; ++i) {
      if (openMarker[i] !== state.src[start + i]) { return false }
    }

    const markup = state.src.slice(start, start + i)
    const params = state.src.slice(start + i, max)

    // Since start is found, we can report success here in validation mode
    //
    if (silent) { return true }

    // Search for the end of the block
    //
    nextLine = startLine

    for (;;) {
      nextLine++
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine]
      max = state.eMarks[nextLine]

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break
      }

      if (closeChar !== state.src.charCodeAt(start)) {
        // didn't find the closing fence
        continue
      }

      if (state.sCount[nextLine] > state.sCount[startLine]) {
        // closing fence should not be indented with respect of opening fence
        continue
      }

      let closeMarkerMatched = true
      for (i = 0; i < closeMarker.length; ++i) {
        if (closeMarker[i] !== state.src[start + i]) {
          closeMarkerMatched = false
          break
        }
      }

      if (!closeMarkerMatched) {
        continue
      }

      // make sure tail has spaces only
      if (state.skipSpaces(start + i) < max) {
        continue
      }

      // found!
      autoClosed = true
      break
    }

    const contents = state.src
      .split('\n')
      .slice(startLine + 1, nextLine)
      .join('\n')

    // We generate a token list for the alt property, to mimic what the image parser does.
    const altToken: any = []
    // Remove leading space if any.
    const alt = params ? params.slice(1) : 'uml diagram'
    state.md.inline.parse(
      alt,
      state.md,
      state.env,
      altToken
    )

    const token = state.push('uml_diagram', 'img', 0)
    // alt is constructed from children. No point in populating it here.

    const imgSrc = generateSource(contents, options)
    token.attrs = [
      ['src', imgSrc],
      ['alt', '']
    ]
    token.block = true
    token.children = altToken
    token.info = params
    token.map = [startLine, nextLine]
    token.markup = markup

    state.line = nextLine + (autoClosed ? 1 : 0)

    return true
  }

  md.block.ruler.before('fence', 'uml_diagram', uml, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  })
  md.renderer.rules.uml_diagram = render
}

const Plantuml = defineComponent({
  name: 'plantuml-image',
  props: {
    attrs: Object,
    src: String
  },
  setup (props) {
    const style = reactive({
      backgroundColor: 'transparent',
      backgroundImage: 'url(data:image/gif;base64,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)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '32px',
      height: '32px'
    })

    const src = ref('')

    const img = ref<HTMLImageElement>()
    const onLoad = () => {
      style.width = 'auto'
      style.height = 'auto'
    }

    const load = debounce((val: string) => {
      src.value = emptySrc
      setTimeout(() => {
        src.value = val
      }, 0)
    }, 1000)

    watch(() => props.src, val => {
      load(val || '')
    })

    onMounted(() => {
      src.value = emptySrc
      nextTick(() => {
        src.value = props.src || ''
      })
    })

    return () => {
      if (img.value && src.value === emptySrc) {
        style.width = img.value.clientWidth + 'px'
        style.height = img.value.clientHeight + 'px'
      }

      return h('img', {
        ...props.attrs,
        ref: img,
        alt: 'plantuml',
        class: 'plantuml-img',
        style,
        src: src.value,
        onLoad
      })
    }
  }
})

function render (tokens: Token[], idx: number) {
  const token = tokens[idx]
  return h(Plantuml, { attrs: token.meta?.attrs, src: token.attrGet('src') || emptySrc })
}

export default {
  name: 'markdown-plantuml',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin, { render })

    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', async ({ node, options }) => {
      const srcAttr = node.getAttribute('src')
      if (srcAttr?.startsWith(baseUrl)) {
        node.removeAttribute('style')

        if (options.preferPng || options.inlineLocalImage) {
          try {
            const res: Response = await ctx.api.fetchHttp(srcAttr)
            const base64Url = await ctx.utils.fileToBase64URL(await res.blob())
            node.setAttribute('src', base64Url)
          } catch (error) {
            console.log(error)
          }
        }
      }
    })
  }
} as Plugin
