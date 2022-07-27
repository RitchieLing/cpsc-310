import './App.css'
import {useEffect, useState} from "react"
import {deleteData, getData, queryData, uploadFile} from "./request/request"
import UploadComponent from "./component/UploadComponent"
import ModifyComponent from "./component/ModifyComponent"


function App() {
	let [idList, setIdList] = useState([])
	let [loading, setLoading] = useState(false)
	let [error, setError] = useState()
	let [file, setFile] = useState()
	let [name, setName] = useState()
	let [kind, setKind] = useState()
	let [format, setFormat] = useState()
	let [queryList, setQueryList] = useState([])


	function onFileChange(e) {
		let file = e.target.files[0]
		let [name, format] = file.name.split('.')
		setFile(file)
		setName(name)
		setFormat(format)
	}

	function onFileNameChange(e) {
		let newName = e.target.value
		Object.defineProperty(file, 'name', {
			writable: true,
			value: newName
		})
		setFile(new File([file], newName, {type: file.type}))
		setName(newName)
	}

	function onKindChange(e) {
		setKind(e.target.value)
	}

	function onSubmitHandle(e) {
		e.preventDefault()
		console.log(idList, name)
		if (idList.some(idItem => idItem.id === name)) {
			setError("You have submitted this file")
			return
		}
		if (!name || !kind || !file) {
			setError("You should choose file and select file type")
			return
		}
		if (!name.endsWith('.zip') || !name.endsWith('.rar') || !name.endsWith('.7zip')) {
			file = new File([file], name + '.' + format, {type: file.type})
		}
		setLoading(true)
		uploadFile(name, kind, file)
			.then((data) => {
				setError("")
				updateDataList()
			})
			.catch(err => {
				console.log(err.message)
				console.log(err.response.data)
				setError(err.message)
			})
			.finally(() => {
				setLoading(false)
			})
	}

	useEffect(() => {
		updateDataList()
	}, [])

	function updateDataList() {
		setLoading(true)
		getData()
			.then(ids => {
				console.log(ids)
				setIdList(ids)
			})
			.finally(() => {
				setLoading(false)
			})
	}

	function deleteDataList(id) {
		console.log(id)
		setLoading(true)
		deleteData(id)
			.then((data) => {
				setIdList(idList.filter(idItem => idItem.id !== id))
				updateDataList()
			})
			.catch(err => {
				console.log(err.message)
				console.log(err.response.data)
				setError(err.message)
			})
			.finally(() => {
				setLoading(false)
			})
	}

	function queryDataList(data, columns, order, error) {
		console.log(data)
		if (error) {
			setError(error)
			return
		}
		console.log(data)
		let queryObject = {
			"WHERE": data,
			"OPTIONS": {
				"COLUMNS": columns,
			}
		}
		if (order) {
			queryObject.OPTIONS['ORDER'] = order
		}
		setLoading(true)
		queryData(queryObject)
			.then(data => {
				console.log(data)
				setQueryList(data)
			})
			.catch(err => {
				console.log(err.message)
				console.log(err.response.data)
				setError(err.message)
			})
			.finally(() => {
				setLoading(false)
			})
	}

	return (
		<div className="App">
			<div style={{minWidth: "50vw", display: "flex", flexDirection: "column", justifyContent: "space-around"}}>
				<div className="errorText">
					{error && error}
				</div>
				<UploadComponent file={file} name={name} kind={kind} onFileChange={onFileChange}
								 onFileNameChange={onFileNameChange}
								 onKindChange={onKindChange} onSubmitHandle={onSubmitHandle}/>
			</div>
			<table>
				<thead>
				<tr>
					<th>id</th>
					<th>kind</th>
					<th>rows</th>
				</tr>
				</thead>
				<tbody>
				{
					idList.map((item, index) => {
						return (
							<tr key={index}>
								<td>{item.id}</td>
								<td>{item.kind}</td>
								<td>{item.numRows}</td>
							</tr>
						)
					})
				}
				</tbody>
			</table>
			<ModifyComponent data={idList} updateDataList={updateDataList} onSubmitDelete={deleteDataList}
							 onSubmitQuery={queryDataList}/>

			{
				queryList.length > 0 && <table>
					<thead>
					<tr>
						<th>index</th>
						{
							Object.keys(queryList[0]).map(key => <th>{key}</th>)
						}
					</tr>
					</thead>
					<tbody>
					{
						queryList.map((item, index) => {
							return (
								<tr key={index}>
									<td>{index}</td>
									{
										Object.values(item).map(value=><td>{value}</td>)
									}
								</tr>
							)
						})
					}
					</tbody>
				</table>
			}
			{loading && <div className="loadingView">
				<div className="loadingText">Loading</div>
			</div>}
		</div>
	)
}


export default App
