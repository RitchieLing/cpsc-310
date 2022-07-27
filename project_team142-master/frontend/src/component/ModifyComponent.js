import {useState, useEffect} from "react"
import QueryComponent from './QueryComponent'

function ModifyComponent({data, onSubmitDelete, onSubmitQuery, updateDataList}) {
	const [deletedId, setDeleteId] = useState('')
	const [displayHint, setDisplayHint] = useState(false)
	useEffect(() => {
		if (deletedId === '') {
			setDisplayHint(false)
		} else {
			setDisplayHint(true)
		}
	}, [deletedId])

	function onClickItem(item) {
		console.log(item.id)
		setDeleteId(item.id)
		setTimeout(() => {
			setDisplayHint(false)
		}, 1)
	}

	return (
		<div>
			<div className="row">
				<div className="row">
					<div className="inputView">
						<input type="text" placeholder={"Input the id to delete"} value={deletedId}
							   onChange={(e) => setDeleteId(e.target.value)}/>
						<div className="hintView">
							{
								displayHint && data.filter(item => item.id.startsWith(deletedId)).map((item, index) =>
									<div
										className="hintItem" key={index}
										onClick={() => onClickItem(item)}>{item.id}</div>
								)
							}
						</div>
					</div>
					<button onClick={() => onSubmitDelete(deletedId)}>delete</button>
				</div>
				<button onClick={updateDataList}>Update</button>
			</div>
			<div>
				<QueryComponent onSubmitQuery={onSubmitQuery}/>
			</div>
		</div>
	)
}

export default ModifyComponent
