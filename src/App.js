import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import "easymde/dist/easymde.min.css"
import { v4 as uuidv4 } from 'uuid'
import { faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import BottomBtn from './components/BottomBtn'
import defaultFiles from './utils/defaultFiles'
import TabList from './components/TabList'
import SimpleMDE from 'react-simplemde-editor'
import { useState } from 'react'

function App() {
  const [ files, setFiles ] = useState(defaultFiles)
  const [ activeFileID, setActiveFileID ] =useState('')
  const [ openedFileIDs, setOpenedFileIDs ] = useState([])
  const [ unsavedFileIDs, setUnsavedFileIDs ] = useState([])
  const [ searchedFiles, setsearchedFiles ] = useState([])
  const openedFiles = openedFileIDs.map(openID => {
    return files.find(file => file.id === openID)
  })
  const fileClick = (fileID) => {
    // set current active file
    setActiveFileID(fileID)
    // if openedFiles don't have the current ID
    // then add new fileID to openedFiles
    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([ ...openedFileIDs, fileID ])
    }
  }

  const tabClick = (fileID) => {
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
    const newFiles = files.map(file => {
      if (file.id === id) {
        file.body = value
      }
      return file
    })
    setFiles(newFiles)
    if (!unsavedFileIDs.includes(id)) {
      setUnsavedFileIDs([ ...unsavedFileIDs, id])
    }
  }
  const deleteFile = (id) => {
    const newFiles = files.filter(file => file.id !== id)
    setFiles(newFiles)
    // 关闭 tab
    tabClose(id)
  }
  const updateFileName = (id, title) => {
    // 编辑更新标题
    const newFiles = files.map(file => {
      if (file.id === id) {
        file.title = title
      }
      return file
    })
    setFiles(newFiles)
  }
  const fileSearch = (keyword) => {
    const newFiles = files.filter(file => file.title.includes(keyword))
    setsearchedFiles(newFiles)
  }

  const createNewFile = () => {
    const newID = uuidv4()
    const newFiles = [
      ...files,
      {
        id: newID,
        title: '',
        body: '请输入',
        createdAt: new Date().getTime(),
        isNew: true,
      }
    ]
    setFiles(newFiles)
  }
  const activeFile = files.find(file => file.id === activeFileID)
  const fileListArr = (searchedFiles.length > 0) ? searchedFiles : files
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
