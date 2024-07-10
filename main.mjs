import { app, BrowserWindow } from 'electron'
import isDev from 'electron-is-dev'
import path from 'path'
import { initialize, enable } from '@electron/remote/main'

let mainWindow
const __dirname = path.resolve()            // 用import 导入 path 模块时这样获取 __dirname
initialize()                                // 初始化 remote

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 680,
        webPreferences: {
            preload: __dirname + 'preload.js',    // 添加preload文件参数
            nodeIntegration: true,
            contextIsolation: false               // 关闭上下文隔离
        }
    })
    const urlLocation = isDev ? 'http://localhost:3000' : 'dummyurl'
    mainWindow.loadURL(urlLocation)
    enable(mainWindow.webContents)          // window 新建后添加 remote 配置
})