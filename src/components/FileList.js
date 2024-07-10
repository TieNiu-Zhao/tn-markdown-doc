import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
    const [ editStatus, setEditStatus ] = useState(false)  // 编辑状态
    const [ value, setValue ] = useState('')        // 编辑值
    let node = useRef(null)
    const enterPressed = useKeyPress(13)            // 是否按了 Enter 键
    const escPressed = useKeyPress(27)              // 是否按了 Esc 键
    const closeSearch = (editItem) => {
        setEditStatus(false)
        setValue('')
        if (editItem.isNew) {
            onFileDelete(editItem.id)
        }
    }
    useEffect(() => {
        const editItem = files.find(file => file.id === editStatus)
        if (enterPressed && editStatus && value.trim() !== '') {
            onSaveEdit(editItem.id, value, editItem.isNew)
            setEditStatus(false)
            setValue('')
        }
        if (escPressed && editStatus) {
            closeSearch()
        }
    })
    // 编辑状态自动获取焦点
    useEffect(() => {
        if (editStatus) {
            node.current.focus()
        }
    }, [editStatus])
    useEffect(() => {
        // 当 files 有变化时运行
        const newFile = files.find(file => file.isNew)
        if (newFile) {
            setEditStatus(newFile.id)
            setValue(newFile.title)
        }
    }, [files])
    return (
        <ul className='list-group list-group-flush file-list'>
            {
                files.map(file => (
                    <li
                        className='list-group-item bg-light row d-flex align-items-center file-item mx-0'
                        key={file.id}
                    >
                        {
                            ((file.id !== editStatus) && !file.isNew) &&
                            <>
                                <span className='col-2'>
                                    <FontAwesomeIcon
                                        size="lg"
                                        icon={faMarkdown}
                                    />
                                </span>
                                <span 
                                    className='col-6 c-link'
                                    onClick={() => { onFileClick(file.id) }}
                                >
                                    {file.title}
                                </span>
                                <button
                                    title="button"
                                    className="icon-button col-2"
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
                                    className="icon-button col-2"
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
                            ((file.id === editStatus) || file.isNew) &&
                            <>
                                <div className='col-10'>
                                    <input
                                        className="form-control"
                                        ref={node}
                                        value={value}
                                        placeholder='请输入文件名称'
                                        onChange={(e) => { setValue(e.target.value) }}
                                    />
                                </div>
                                <button
                                    title="button"
                                    className="icon-button col-2"
                                    onClick={() => {closeSearch(file)}}
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