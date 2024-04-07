# Markdown 项目

## election

### 下载项

1. election [官网](https://www.electronjs.org/zh/)

   ```
   npm install --save-dev electron@latest
   ```

   安装完毕后使用 npm start 运行项目，本质是桌面端浏览器

2. nodemon

   自动监听文件变化，自动运行命令

   ```
   npm install nodemon --save-dev
   ```

3. remote

   ```
   npm install --save @electron/remote
   ```

---

### 创建第一个窗口

在项目下 main.js 新建窗口，electron 本质就是个浏览器

```js
const { app, BrowserWindow } = require('electron')

// 创建窗口
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600
    })
    win.loadFile('index.html')			// 加载文件
    win.webContents.openDevTools()		// 加载开发者工具，相当于浏览器开F12
}
app.on('ready', () => {
    createWindow()
})
```

---

### 创建子窗口

```js
const { app, BrowserWindow } = require('electron')

function createWindow() {
    const win = new BrowserWindow({
        width: 850,
        height: 600
    })
    win.loadFile('index.html')
    win.webContents.openDevTools()
    return win
}
// 创建子窗口，把父窗口作为参数传入
function createAnotherWindow(parent) {
    const win = new BrowserWindow({
        width: 600,
        height: 300,
        parent						// parent 代表窗口的父节点
    })
    win.loadFile('second.html')
}
app.on('ready', () => {
    const parent = createWindow()
    createAnotherWindow(parent)
})
```

---

### 进程间通信（单向、双向）

每一个 tab 都是一个**独立的进程**，有一个 main 进程，控制整个程序。进程间的通信使用 preload 脚本，是一种阉割版 nodejs

- **单向通信 - 从渲染器进程到主进程**

  **使用`ipcRenderer.send` API 发送信息，使用`ipcMain.on` API 接收**

  以用户点击页面内的 input 旁的按钮修改标题为例。

  **发送：**

  preload 准备，提供一个名为 setTitle 的方法，使用 ipcRenderer.send() 发送信息

  ```js
  /* preload.js */
  // ipcRenderer 为浏览器渲染进程
  const { contextBridge, ipcRenderer } = require('electron')
  
  contextBridge.exposeInMainWorld('electron', {
      // 从渲染进程发送到主进程
      setTitle: (title) => ipcRenderer.send('set-title', title)
  })
  ```

  将用户输入的 title 值发送出去（渲染进程→主进程）

  ```js
  /* renderer.js */
  const btn = document.getElementById('btn')
  const titleInput = document.getElementById('title')
  btn.addEventListener('click', () => {
      const title = titleInput.value
      // 借助 preload 中的方法，会挂载到 window 上
      window.electron.setTitle(title)
  })
  ```

  **接收：**使用 ipcMain.on() 接收内容，触发回调函数

  ```js
  const { app, BrowserWindow, ipcMain } = require('electron')
  // ...
  
  function handleSetTitle(event, title) {
      const webContents = event.sender  // event.sender 返回发送请求的 webContents
      const win = BrowserWindow.fromWebContents(webContents) // 拿到 window 实例
      win.setTitle(title)    // 设置标题
  }
  app.on('ready', () => {
      ipcMain.on('set-title', handleSetTitle)
      // createWindow()
  })
  ```

- **双向通信 - 从渲染器进程到主进程，再从主进程到渲染进程**

  **使用`ipcRenderer.invoke` API 发送信息，使用`ipcMain.handle` API 接收**

  以用户点击页面内的 input 旁的按钮保存文件，输出文件大小为例。

  **发送：**

  preload 准备，使用 ipcRenderer.invoke() 发送信息

  ```js
  /* preload.js */
  const { contextBridge, ipcRenderer } = require('electron')
  
  contextBridge.exposeInMainWorld('electron', {
      writeFile: (content) => ipcRenderer.invoke('write-file', content)
  })
  ```

  将用户输入的内容发送出去，**接收返回的值**——文件大小

  ```js
  /* renderer.js */
  const btn2 = document.getElementById('btn2')
  const contentInput = document.getElementById('content')
  
  btn2.addEventListener('click', async () => {
      const content = contentInput.value
      // 接收返回来的文件大小
      const len = await window.electron.writeFile(content)
      info.innerHTML = `File size: ${len}`
  })
  ```

  **接收：**使用 ipcMain.handle() 接收内容，触发回调函数，这个回调会返回 promise

  ```js
  /* main.js */
  const { app, BrowserWindow, ipcMain } = require('electron')
  const fs = require('fs')
  
  // 返回 Promise
  async function handleWriteFile(event, content) {
      console.log('the content', content)
      await fs.promises.writeFile('test.txt', content)
      // 返回文件大小
      const stats = await fs.promises.stat('test.txt')
      return stats.size
  }
  app.on('ready', () => {
      ipcMain.handle('write-file', handleWriteFile)
      // createWindow()
  })
  ```

- **单向通信 - 从主进程到渲染器进程**

  **使用`win.webContents.send` API 发送信息，使用`ipcRenderer.on` API 接收**

  以每三秒改变计数器值渲染到页面为例

  **发送：**

  ```js
  /* main.js */
  app.on('ready', () => {
      let counter = 1
      const win = createWindow()
      win.webContents.send('update-counter', counter)  // 使用窗口实例下的方法发送
      setInterval(() => {
          counter += 3
          win.webContents.send('update-counter', counter)
      }, 3000)
  })
  ```

  preload 准备，使用 ipcRenderer.on() 发送信息，使用回调函数处理接收到的数据

  ```js
  /* preload.js */
  const { contextBridge, ipcRenderer } = require('electron')
  
  contextBridge.exposeInMainWorld('electron', {
      onupdateCounter: (callback) => ipcRenderer.on('update-counter', (_event, value) => callback(value))
  })
  ```

  **接收：**

  ```js
  /* renderer.js */
  const counter = document.getElementById('counter')
  
  window.electron.onupdateCounter((value) => {
      counter.innerText = value.toString()
  })
  ```

---

### 打破沙盒 nodeIntegration 参数

**沙盒化进程**包括渲染器进程，沙盒化进程有限制，比如在 preload.js 中无法使用 fs 模块，为了解除限制，配置 nodeIntegration

- 配置 nodeIntegration

  ```js
  const { app, BrowserWindow } = require('electron')
  const path = require('path')
  function createWindow() {
      const win = new BrowserWindow({
          width: 850,
          height: 600,
          webPreferences: {
              nodeIntegration: true,     // 配置在这 - 打破沙盒行为
              preload: path.join(__dirname, 'preload.js')
          }
      })
  }
  app.on('ready', () => {
      createWindow()
  })
  ```

  打破了限制就可以不通过IPC完成工作了

  ```js
  /* preload.js */
  const { contextBridge } = require('electron')
  const fs = require('fs')
  
  contextBridge.exposeInMainWorld('electron', {
      readFile: fs.promises.readFile
  })
  ```

  把文件的内容读取出来显示在页面上，而不借助 IPC

  ```js
  /* renderer.js */
  /* const info = document.getElementById('info')
  const btn2 = document.getElementById('btn2')
  const contentInput = document.getElementById('content') */
  btn2.addEventListener('click', async () => {
      /* const content = contentInput.value
      const len = await window.electron.writeFile(content)
      info.innerHTML = `File size: ${len}` */
      const c = await window.electron.readFile('test.txt', { encoding: 'utf-8' })
      info.innerHTML += `File Content: ${c}`
  })
  ```

  在此基础上，甚至可以把 require 整个模块暴露出去

  ```js
  /* preload.js */
  const { contextBridge } = require('electron')
  const fs = require('fs')
  
  contextBridge.exposeInMainWorld('require', require)
  ```

  就可以实现 renderer.js 中拿到任何想要的 nodejs 模块

  ```js
  /* renderer.js */
  const fs = window.require('fs')   // 通过 window 拿到暴露的 fs 模块
  // 使用 fs 实现读取
  btn2.addEventListener('click', async () => {
      // const c = await window.electron.readFile('test.txt', { encoding: 'utf-8' })
      const c = await fs.promises.readFile('test.txt', { encoding: 'utf-8' })
      info.innerHTML += `File Content: ${c}`
  })
  ```

  但是关闭沙盒会有安全问题，虽然提供了，但建议使用沙盒。

---

### 打破沙盒 remote 模块

刚才打破了沙盒，扩展了 preload 模块，现在可以使用 remote，再次扩展模块，注意此模块需单独安装

- 安装在最开始

- 使用 remote - 要给窗口使用，必须先 enable

  ```js
  /* main.js */
  const { app, BrowserWindow, webContents } = require('electron')
  const remote = require('@electron/remote/main')
  remote.initialize()      // remote 初始化
  
  // function createwindow(...)
  
  app.on('ready', () => {
      const win = createWindow()
      remote.enable(win.webContents)  // 要让哪个窗口使用，就激活哪个窗口
  })
  ```

  在使用了 nodejs 模块基础上，使用 remote 可以扩展以使用主进程的一系列模块

  ```js
  /* renderer.js */
  // 获取主进程的一系列模块
  const { dialog } = window.require('@electron/remote')
  
  const btn = document.getElementById('btn')
  
  btn.addEventListener('click', () => {
      dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })  // 打开文件，允许多选
  })
  ```

----

## React

### 下载与配置

- 下载

  ```
  npx create-react-app 项目名
  ```


---

### useState 状态

称为 StateHook，Hook 是能在函数内钩入 react 特性的函数，StateHook 可以给函数添加内置的 State

- **useState 使用**

  useState 内为对象，setObj 更新时是替换整个对象而不是只改一个属性。

  ```jsx
  import React, { useState } from 'react'
  
  const LikeButton = () => {
      // useState 返回数组，第一项为当前 state，第二项为更新 state 函数
      const [ obj, setObj ] = useState({ like: 0, on: true })
      return (
          <>
              <button onClick={() => { setObj({ like: obj.like + 1, on: obj.on })} }>
                  { obj.like } !
              </button>
              <button onClick={() => { setObj({ on: !obj.on, like: obj.like })} }>
                  { obj.on ? 'On' : 'Off' }
              </button>
          </>
      )
  }
  
  export default LikeButton
  ```

  这样会显得代码比较冗余，可以多次 useState，逻辑就清晰多了。

  ```jsx
  import React, { useState } from 'react'
  
  const LikeButton = () => {
      const [ like, setLike ] = useState(0)
      const [ on, setOn ] = useState(true)
      return (
          <>
              <button onClick={() => { setLike( like + 1 ) }}>
                  { like } !
              </button>
              <button onClick={() => { setOn( !on ) }}>
                  { on ? 'On' : 'Off' }
              </button>
          </>
      )
  }
  
  export default LikeButton
  ```

---

### useEffect 副作用

- **不需要清除的 Effect**

  useEffect 可以添加副作用，会在每次渲染后更新数据之后调用此回调函数，会在**第一次渲染和之后每次更新都执行**

  ```jsx
  import React, { useState, useEffect } from 'react'
  
  const LikeButton = () => {
      const [ like, setLike ] = useState(0)
      // useEffect 接收回调函数
      useEffect(() => {
          document.title = `点击了${like}次`				// 点击按钮网页标题就会更新 
      })
      return (
          <button onClick={() => { setLike( like + 1 ) }}>
              { like } !
          </button>
      )
  }
  
  export default LikeButton
  ```

- **需要清除的 Effect**

  有些副作用需要清除，比如下面的例子（监听用户点击的坐标）

  ```jsx
  import React, { useState, useEffect } from 'react'
  
  const MouseTracker = () => {
      const [ positions, setPositions ] = useState({ x: 0, y: 0 })
      useEffect(() => {
          document.addEventListener('click', (event) => {
              console.log('inner')      // 每点一次，都会多次添加点击监听，会导致 inner 越来越多
              setPositions({ x: event.clientX, y: event.clientY })
          })
      })
      return (
          <p>X: {positions.x}, Y: {positions.y}</p>
      )
  }
  
  export default MouseTracker
  ```

  修改办法是 useEffect 中 return 一个函数，**react 将在组件卸载时执行 return 的方法（清除）**。

  ```jsx
  import React, { useState, useEffect } from 'react'
  
  const MouseTracker = () => {
      const [ positions, setPositions ] = useState({ x: 0, y: 0 })
      useEffect(() => {
          const updateMouse = (event) => {
              console.log('inner')
              setPositions({ x: event.clientX, y: event.clientY })
          }
          console.log('add listener')
          document.addEventListener('click', updateMouse)
          return () => {
              console.log('remove listener')
              document.removeEventListener('click', updateMouse)
          }
      })
      return (
          <p>X: {positions.x}, Y: {positions.y}</p>
      )
  }
  
  export default MouseTracker
  ```

- **控制 useEffect 执行次数**

  **useEffect() 接收第二个参数为数组**，数组中任意一项发生变化，就会执行 useEffect，所以可以传入空数组。

  这是一个随机生成狗狗图片的示例：

  ```jsx
  import React, { useState, useEffect } from 'react'
  import axios from 'axios'
  
  const DogShow = () => {
      const [ url, setUrl ] = useState('')
      const [ loading, setLoading ] = useState(false)
      const style = {
          width: 200
      }
      useEffect(() => {
          setLoading(true)
          axios.get('https://dog.ceo/api/breeds/image/random').then(result => {
              console.log(result)
              setUrl(result.data.message)    // 这两个set 会导致更新，更新会导致再次调用 useEffect，造成死循环
              setLoading(false)
          })
      })
      return (
          <>
              { loading ? <p>狗狗读取中...</p> : <img src={url} alt="dog" style={style}></img> }
          </>
      )
  }
  
  export default DogShow
  ```

  会发现屏幕一直是狗狗读取中...，一直在调用 useEffect

  ```jsx
  /*import React, { useState, useEffect } from 'react'
  import axios from 'axios'
  
  const DogShow = () => {
      const [ url, setUrl ] = useState('')
      const [ loading, setLoading ] = useState(false)
      const style = {
          width: 200
      }*/
      useEffect(() => {
          setLoading(true)
          axios.get('https://dog.ceo/api/breeds/image/random').then(result => {
              console.log(result)
              setUrl(result.data.message)
              setLoading(false)
          }) 
      }, [])   // 空数组，表示不依赖任何内容，不会重复执行 useEffect
      return (
          <>
              { loading ? <p>狗狗读取中...</p> : <img src={url} alt="dog" style={style}></img> }
          </>
      )
  }
  
  export default DogShow
  ```

  或者增加按钮，点击刷新狗狗图片

  ```jsx
  /*import React, { useState, useEffect } from 'react'
  import axios from 'axios'
  
  const DogShow = () => {
      const [ url, setUrl ] = useState('')
      const [ loading, setLoading ] = useState(false) */
      const [ fetch, setFetch ] = useState(false)   // 按钮依赖
      const style = {
          width: 200
      }
      useEffect(() => {
          setLoading(true)
          axios.get('https://dog.ceo/api/breeds/image/random').then(result => {
              console.log(result)
              setUrl(result.data.message)
              setLoading(false)
          })
      }, [fetch])  // 依赖于 fetch，改变就重新 useEffect
      return (
          <>
              { loading ? <p>狗狗读取中...</p> : <img src={url} alt="dog" style={style}></img> }
              <button onClick={() => {setFetch(!fetch)}}>刷新狗子</button>  // 添加按钮
          </>
      )
  }
  
  export default DogShow
  ```

---

### useRef

component 函数中每次组件重新渲染后创建新的变量，**新的变量与旧变量没有关系，useRef 可以再不同渲染中记住不同的变量值。**

---

### 自定义 Hook 与 高阶组件 HOC

自定义的 hook 必须以 use 开头命名，**每次使用 hook 的作用域都是隔离的**，以获取用户鼠标位置为例：

- 使用自定义 Hook

  ```jsx
  /* useMousePosition.js */
  import React, { useState, useEffect } from 'react'
  
  const useMousePosition = () => {
      const [ positions, setPositions ] = useState({ x: 0, y: 0 })
      useEffect(() => {
          const updateMouse = (event) => {
              setPositions({ x: event.clientX, y: event.clientY })
          }
          document.addEventListener('mousemove', updateMouse)
          return () => {
              document.removeEventListener('mousemove', updateMouse)
          }
      })
      return positions
  }
  
  export default useMousePosition
  ```

  然后任意组件引入就可以使用了，很方便。

  ```jsx
  import './App.css';
  import useMousePosition from './hooks/useMousePosition';
  
  function App() {
    const position = useMousePosition()
    return (
      <div className="App">
        <header className="App-header">
          <h1>{position.x}</h1>
        </header>
      </div>
    );
  }
  
  export default App;
  ```

- 高阶组件 HOC

  高阶组件就是一个函数，接收一个组件作为参数，返回一个新的组件。

  不建议写，建议用自定义 Hook。

- Hook 规则

1. 只在最顶层使用 Hook，不要再条件语句 / 循环中使用
2. 只在 React 函数中调用 Hook

---

## 全局需求

- 原生菜单，通过菜单和快捷键可以新建、保存、搜索文件
- 持久化数据，保存文件在本地文件系统

需求分为 React 需求与 Electron 需求

React 需求为：搜索框、文件列表、新建文件、文件 Tabs、编辑器

Electron 需求为：文件列表右键子菜单、文件导入、应用菜单、全局快捷键、文件数据持久化保存

---

## 配置开发环境

- 安装

  ```
  npx create-react-app tn-markdown
  npm install electron --save-dev
  npm install electron-is-dev --save-dev
  npm install bootstrap --save
  ```
  
- main.js

  ```js
  import { app, BrowserWindow } from 'electron'
  import isDev from 'electron-is-dev' // 是否是开发环境
  let mainWindow
  
  app.on('ready', () => {
      mainWindow = new BrowserWindow({
          width: 1024,
          height: 680,
          webPreferences: {
              nodeIntegration: true
          }
      })
      const urlLocation = isDev ? 'http://localhost:3000' :'dummyurl'
      mainWindow.loadURL(urlLocation)   // 将网页套在应用里
  })
  ```

- package.json

  ```json
  {
    // ...略
    "main": "main.mjs",
    "scripts": {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "test": "react-scripts test",
      "eject": "react-scripts eject",
      "dev": "electron ."
    },
    "devDependencies": {
      "electron": "^29.2.0",
      "electron-is-dev": "^3.0.1"
    }
  }
  ```

  完成以上，需要先开启 `npm start` 启动浏览器，再 `npm run dev` 启动应用，很麻烦而且有先后顺序。

- 同时运行与解决白屏

  首先安装 concurrently 以合并命令

  ```
  npm install concurrently --save-dev
  ```

  package.json 修改：

  ```json
  {
    // ...
    "main": "main.mjs",
    "private": true,
    "scripts": {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "test": "react-scripts test",
      "eject": "react-scripts eject",
      "dev": "concurrently \"electron .\" \"npm start\""  // 使用 concurrently
    },
  }
  ```

  但是，现在浏览器要启动一会，导致应用白屏，刷新才行，使用 wait-on 小工具解决。

  安装 wait-on 以等待命令

  ```
  npm install wait-on --save-dev
  ```

  package.json 修改

  ```json
  {
    // ...
    "scripts": {
      // ...
      "dev": "concurrently \"wait-on http://localhost:3000 && electron .\" \"npm start\""
    },
  }
  ```

  这样就会在浏览器加载好后，在启动应用了，但是浏览器只需要启动服务，不需要打开窗口。

  安装 cross-env 以解决跨平台

  ```
  npm install cross-env --save-dev
  ```

  package.json 修改，意思是在运行 npm start 时赋值环境变量 BROWSER=NONE

  ```json
  {
    // ...
    "scripts": {
      // ...
      "dev": "concurrently \"wait-on http://localhost:3000 && electron .\" \"cross-env BROWSER=NONE npm start\""
    },
  }
  ```

---

## 左侧栏

- 下载 fontawesome

  ```
  npm i --save @fortawesome/fontawesome-svg-core
  npm i --save @fortawesome/free-solid-svg-icons
  npm i --save @fortawesome/react-fontawesome@latest
  npm i --save @fortawesome/free-brands-svg-icons
  ```

---

### 搜索框

- 监听按下按键与抬起按键的 Hook

  按键码 13 代表 Enter，按键码 13  代表 Esc

  ```jsx
  import { useState, useEffect } from 'react'
  
  // 传入 keyCode, 返回这个键有没有被按到
  const useKeyPress = (targetkeyCode) => {
      const [ keyPressed, setKeyPressed ] = useState(false) // 按键状态
      // 按下按键
      const keyDownHandler = ({ keyCode }) => {
          if (keyCode === targetkeyCode) {
              setKeyPressed(true)
          }
      }
      // 抬起按键
      const keyUpHandler = ({ keyCode }) => {
          if (keyCode === targetkeyCode) {
              setKeyPressed(false)
          }
      }
      useEffect(() => {
          document.addEventListener('keydown', keyDownHandler)
          document.addEventListener('keyup', keyUpHandler)
          return () => {
              document.removeEventListener('keydown', keyDownHandler)
              document.removeEventListener('keyup', keyUpHandler)
          }
      }, [])
      return keyPressed
  }
  
  export default useKeyPress
  ```

- 文件搜索

  ```jsx
  /* FileSearch.js */
  import React, { useState, useEffect, useRef } from 'react'
  import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
  import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
  import PropTypes from 'prop-types'
  import useKeyPress from '../hooks/useKeyPress'
  
  // title: 搜索标题，onFileSearch: 点击搜索的回调
  const FileSearch = ({ title, onFileSearch }) => {
      const [ inputActive, setInputActive ] = useState(false) // 输入状态
      const [ value, setValue ] = useState('')  // 搜索框内容
      const enterPressed = useKeyPress(13)  // 是否按了 Enter 键
      const escPressed = useKeyPress(27)  // 是否按了 Esc 键
      let node = useRef(null) // 记录DOM节点
  
      // 按 esc 或点击关闭按钮
      const closeSearch = () => {
          setInputActive(false)
          setValue('')
      }
      useEffect(() => {
          if (enterPressed && inputActive) {
              onFileSearch(value)   // 执行搜索功能回调
          }
          if (escPressed && inputActive) {
              closeSearch()         // 关闭搜索框
          }
      })
      useEffect(() => {
          // 当 inputActive 改变时，输入框聚焦
          if (inputActive) {
              node.current.focus()
          }
      }, [inputActive])
      return (
          <div className='alert alert-primary d-flex justify-content-between align-items-center'>
              { !inputActive && 
                <>
                  <span>{title}</span>
                  <button
                      title="button"
                      className="icon-button"
                      onClick={() => { setInputActive(true) }}
                  >
                      <FontAwesomeIcon
                          title="搜索"
                          size="lg"
                          icon={faSearch}
                      />
                  </button>
                </>
              }
              { inputActive &&
                <>
                  <input
                      className="form-control"
                      value={value}
                      ref={node}
                      onChange={(e) => { setValue(e.target.value) }}
                  />
                  <button
                      title="button"
                      className="icon-button"
                      onClick={ closeSearch }
                  >
                      <FontAwesomeIcon
                          title="关闭"
                          size="lg"
                          icon={faTimes}
                      />
                  </button>
                </>
              }
          </div>
      )
  }
  
  // 类型检查
  FileSearch.propTypes = {
      title: PropTypes.string,
      onFileSearch: PropTypes.func.isRequired // 必传
  }
  // 默认属性
  FileSearch.defaultProps = {
      title: '我的云文档'
  }
  export default FileSearch
  ```

---

### 文件列表

- 文件列表

  ```jsx
  /* FileList.js */
  import React, { useState, useEffect, useRef } from 'react'
  import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
  import { faEdit, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons'
  import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
  import PropTypes from 'prop-types'
  import useKeyPress from '../hooks/useKeyPress'
  
  const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
      const [ editStatus, setEditStatus ] = useState(false)  // 编辑状态
      const [ value, setValue ] = useState('')        // 编辑值
      const enterPressed = useKeyPress(13)            // 是否按了 Enter 键
      const escPressed = useKeyPress(27)              // 是否按了 Esc 键
      const closeSearch = () => {
          setEditStatus(false)
          setValue('')
      }
      useEffect(() => {
          if (enterPressed && editStatus) {
              const editItem = files.find(file => file.id === editStatus)
              onSaveEdit(editItem.id, value)
              setEditStatus(false)
              setValue('')
          }
          if (escPressed && editStatus) {
              closeSearch()
          }
      })
      return (
          <ul className='list-group list-group-flush file-list'>
              {
                  files.map(file => (
                      <li
                          className='list-group-item bg-light row d-flex align-items-center file-item'
                          key={file.id}
                      >
                          {
                              (file.id !== editStatus) &&
                              <>
                                  <span className='col-2'>
                                      <FontAwesomeIcon
                                          size="lg"
                                          icon={faMarkdown}
                                      />
                                  </span>
                                  <span 
                                      className='col-8 c-link'
                                      onClick={() => { onFileClick(file.id) }}
                                  >
                                      {file.title}
                                  </span>
                                  <button
                                      title="button"
                                      className="icon-button col-1"
                                      onClick={() => { setEditStatus(file.id); setValue(file.title); }}
                                  >
                                      <FontAwesomeIcon
                                          title="编辑"
                                          size="lg"
                                          icon={faEdit}
                                      />
                                  </button>
                                  <button
                                      title="button"
                                      className="icon-button col-1"
                                      onClick={() => { onFileDelete(file.id) }}
                                  >
                                      <FontAwesomeIcon
                                          title="删除"
                                          size="lg"
                                          icon={faTrash}
                                      />
                                  </button>
                              </>
                          }
                          {
                              (file.id === editStatus) &&
                              <>
                                  <div className='col-10'>
                                      <input
                                          className="form-control"
                                          value={value}
                                          onChange={(e) => { setValue(e.target.value) }}
                                      />
                                  </div>
                                  <button
                                      title="button"
                                      className="icon-button col-2"
                                      onClick={ closeSearch }
                                  >
                                      <FontAwesomeIcon
                                          title="关闭"
                                          size="lg"
                                          icon={faTimes}
                                      />
                                  </button>
                              </>
                          }
                      </li>
                  ))
              }
          </ul>
      )
  }
  FileList.propTypes = {
      files: PropTypes.array,
      onFileClick: PropTypes.func,
      onFileClick: PropTypes.func,
      onSaveEdit: PropTypes.func
  }
  export default FileList
  ```

---

### 底部按钮

- 底部按钮

  通过传入文字、颜色、图标、点击回调，实现类似 vue 插槽一样的组件
  
  ```jsx
  /* BottomBtn.js */
  import React from 'react'
  import PropTypes from 'prop-types'
  import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
  
  // 传入文字, 颜色, 图标, 点击回调, 返回 JSX
  const BottomBtn = ({ text, colorClass, icon, onBtnClick }) => (
      <button
          type="button"
          className={`btn btn-block no-border ${colorClass}`}
          onClick={onBtnClick}
      >
          <FontAwesomeIcon
              className='mr-2'
              size="lg"
              icon={icon}
          />
          {text}
      </button>
  )
  
  BottomBtn.propTypes = {
      text: PropTypes.string,
      colorClass: PropTypes.string,
      icon: PropTypes.element.isRequired,
      onBtnClick: PropTypes.func
  }
  BottomBtn.defaultProps = {
      text: '新建'
  }
  export default BottomBtn
  ```
  

---

## 右侧栏

上面应该有 Tab，点击左侧新建 Tab

- 安装 classnames

  ```
  npm install classnames --save
  ```

- 安装 sass

  ```
  npm install node-sass --save
  ```

- 安装文本编辑器

  ```
  npm install --save react-simplemde-editor
  ```

- TabList

  ```jsx
  import React from 'react'
  import PropTypes from 'prop-types'
  import classNames from 'classnames'
  import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
  import { faTimes } from '@fortawesome/free-solid-svg-icons'
  import './TabList.scss'
  
  // files 文件, activeId 当前编辑的文件id , unsaveIds 未保存文件id, onTabClick 点击tab回调, onCloseTab 点击tab关闭回调
  const TabList = ({ files, activeId, unsaveIds, onTabClick, onCloseTab }) => {
      return (
          <ul className="nav nav-pills tablist-component">
              {files.map(file => {
                  const withUnsaveMark = unsaveIds.includes(file.id)
                  // classNames 接收 Object 动态添加类
                  const fClassName = classNames({
                      'nav-link': true,
                      'active': file.id === activeId,
                      "withUnsaved": withUnsaveMark
                  })
                  return (
                      <li className='nav-item' key={file.id}>
                          <a
                              href="#"
                              className={fClassName}
                              onClick={(e) => {e.preventDefault(); onTabClick(file.id)}}
                          >
                              {file.title}
                              <span 
                                  className='ml-2 close-icon'
                                  onClick={(e) => {e.stopPropagation(); onCloseTab(file.id)}}
                              >
                                  <FontAwesomeIcon
                                      icon={faTimes}
                                  />
                              </span>
                              { withUnsaveMark && <span className='rounded-circle ml-2 unsaved-icon'></span> }
                          </a>
                      </li>
                  )
              })}
          </ul>
      )
  }
  
  TabList.propTypes = {
      files: PropTypes.array, 
      activeId: PropTypes.string, 
      unsaveIds: PropTypes.array, 
      onTabClick: PropTypes.func, 
      onCloseTab: PropTypes.func,
  }
  TabList.defaultProps = {
      unsaveIds: []
  }
  export default TabList
  ```

- 编辑器

  采用 React SimpleMDE (EasyMDE) Markdown Editor

  ```jsx
  <div className='col-9 right-panel'>
    <TabList/>
    <SimpleMDE
      value={defaultFiles[1].body}
      onChange={(value) => {console.log(value)}}
      options={{
        minHeight: '515px'
      }}
    />
  </div>
  ```

---

## App 状态

- 状态分析

  |     需要的状态     |    变量名     | 类型 |
  | :----------------: | :-----------: | :--: |
  |      文件列表      |     files     | 数组 |
  |  搜索后的文件列表  | searchedFiles | 数组 |
  |  未保存的文件列表  | unsavedFiles  | 数组 |
  | 已经打开的文件列表 |  openedFiles  | 数组 |
  |  当前被选中的文件  |  activeFile   | 对象 |

  以上有大量重复内容，需要修改，搜索后的文件列表只需计算得到就好

  |     需要的状态     |    变量名    |          类型          |
  | :----------------: | :----------: | :--------------------: |
  |      文件列表      |    files     | 数组[file 对象, ..., ] |
  |  未保存的文件列表  | unsavedFiles |    数组[id, ..., ]     |
  | 已经打开的文件列表 | openedFiles  |    数组[id, ..., ]     |
  |  当前被选中的文件  |  activeFile  |           id           |

- 数据处理

  在 App.js 下，各个组件需要的回调已经暴露给了 App.js，所以要写相应的逻辑

  ```jsx
  function App() {
    return (
      <div className="App container-fluid px-0">
        <...>
            <FileSearch onFileSearch={() => {}}/>
        <...>
      </div>
    );
  }
  function App() {
    const [ files, setFiles ] = useState(defaultFiles)
    const [ activeFileID, setActiveFileID ] =useState('')
    const [ openedFileIDs, setOpenedFileIDs ] = useState([])
    const [ unsavedFileIDs, setUnsavedFileIDs ] = useState([])
    const openedFiles = openedFileIDs.map(openID => {
      return files.find(file => file.id === openID)
    })
    const activeFile = files.find(file => file.id === activeFileID)
    return (
      <div className="App container-fluid px-0">
        <div className='row no-gutters'>
          <div><!-- 左侧 --></div>
          <div className='col-9 right-panel'>
            {
              !activeFile &&
              <div className='start-page'>
                选择/创建新的 Markdown 文档
              </div>
            }
            {
              activeFile &&
              <>
                <TabList
                  files={openedFiles}
                  activeId={activeFileID}
                  unsaveIds={unsavedFileIDs}
                />
                <SimpleMDE
                  value={activeFile && activeFile.body}
                />
              </>
            }
          </div>
        </div>
      </div>
    );
  }
  ```

  