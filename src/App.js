import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import "easymde/dist/easymde.min.css"
import { v4 as uuidv4 } from 'uuid'
import { flattenArr, objToArr } from './utils/helper'
import fileHelper from './utils/fileHelper'
import { faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import BottomBtn from './components/BottomBtn'
import defaultFiles from './utils/defaultFiles'
import TabList from './components/TabList'
import SimpleMDE from 'react-simplemde-editor'
import { useState } from 'react'

// 使用 require js
const { join } = window.require('path')
const remote = window.require('@electron/remote')

function App() {
  const [ files, setFiles ] = useState(flattenArr(defaultFiles))
  const [ activeFileID, setActiveFileID ] = useState('')
  const [ openedFileIDs, setOpenedFileIDs ] = useState([])
  const [ unsavedFileIDs, setUnsavedFileIDs ] = useState([])
  const [ searchedFiles, setsearchedFiles ] = useState([])
  const filesArr = objToArr(files)    // 有些要转换前文件格式
  const saveLocation = remote.app.getPath('documents')  // 使用remote.app.getPath() 拿到文件路径

  const fileClick = (fileID) => {
    // set 当前 ID 未活跃 ID
    setActiveFileID(fileID)
    // 添加至右侧 TabList 里 - openedFileID
    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([ ...openedFileIDs, fileID ])
    }
  }

  const tabClick = (fileID) => {
    // 点谁就把 ID 设置为 activeID
    setActiveFileID(fileID)
  }

  const tabClose = (id) => {
    // 移除点击的tab
    const tabWithout = openedFileIDs.filter(fileID => fileID !== id)
    setOpenedFileIDs(tabWithout)
    // 高亮其他内容
    if (tabWithout.length > 0) {
      setActiveFileID(tabWithout[0])
    } else {
      setActiveFileID('')
    }
  }
  const fileChange = (id, value) => {
    /* 修改前
    const newFiles = files.map(file => {
      if (file.id === id) {
        file.body = value
      }
      return file
      setFiles(newFiles)
    })
    */
    // 尝试改为 files[id].body = value 逻辑没错但不能直接修改 State！
    // 修改后：
    const newFile = { ...files[id], body: value }
    setFiles({ ...files, [id]: newFile })

    if (!unsavedFileIDs.includes(id)) {
      setUnsavedFileIDs([ ...unsavedFileIDs, id])
    }
  }
  const deleteFile = (id) => {
    delete files[id]
    setFiles(files)
    // 关闭 tab
    tabClose(id)
  }
  const updateFileName = (id, title, isNew) => {
    // 编辑更新标题
    const modifiedFile = { ...files[id], title, isNew: false }
    if (isNew) {  // 新建
      fileHelper.writeFile(join(saveLocation, `${title}.md`), files[id].body).then(() => {
        setFiles({ ...files, [id]: modifiedFile })
      })
    } else {      // 更新标题

    }
    
  }
  const fileSearch = (keyword) => {
    const newFiles = filesArr.filter(file => file.title.includes(keyword))
    setsearchedFiles(newFiles)
  }

  const createNewFile = () => {
    const newID = uuidv4()
    const newFile = {
      id: newID,
      title: '',
      body: '## 请输入 Markdown',
      createdAt: new Date().getTime(),
      isNew: true,
    }
    setFiles({ ...files, [newID]: newFile })
  }
  const activeFile = files[activeFileID]
  const openedFiles = openedFileIDs.map(openID => {
    return files[openID]
  })
  const fileListArr = (searchedFiles.length > 0) ? searchedFiles : filesArr
  return (
    <div className="App container-fluid px-0">
      <div className='row no-gutters'>
        <div className='col-3 bg-light left-panel'>
          <FileSearch
            title="My Document"
            onFileSearch={fileSearch}
          />
          <FileList
            files={fileListArr}
            onFileClick={fileClick}
            onSaveEdit={updateFileName}
            onFileDelete={deleteFile}
          />
          <div className='row no-gutters button-group'>
            <div className='col'>
              <BottomBtn
                text="新建"
                colorClass="btn-primary"
                icon={faPlus}
                onBtnClick={createNewFile}
              />
            </div>
            <div className='col'>
              <BottomBtn
                text="导入"
                colorClass="btn-success"
                icon={faFileImport}
              />
            </div>
          </div>
        </div>
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
                onTabClick={tabClick}
                onCloseTab={tabClose}
              />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile && activeFile.body}
                onChange={(value) => {fileChange(activeFileID, value)}}
                options={{
                  minHeight: '515px'
                }}
              />
            </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
