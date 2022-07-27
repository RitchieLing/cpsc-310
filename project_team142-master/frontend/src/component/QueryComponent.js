import {useState, useEffect} from 'react'

const queryKey = {
	courses_dept: Symbol('courses_dept'),
	courses_id: Symbol('courses_id'),
	courses_avg: Symbol('courses_avg'),
	courses_instructor: Symbol('courses_instructor'),
	courses_title: Symbol('courses_title'),
	courses_pass: Symbol('courses_pass'),
	courses_fail: Symbol('courses_fail'),
	courses_audit: Symbol('courses_audit'),
	courses_uuid: Symbol('courses_uuid'),
	courses_year: Symbol('courses_year'),
}
const keyList = Object.keys(queryKey)
const mComparator = {
	LT: Symbol('LT'),
	GT: Symbol('GT'),
	EQ: Symbol('EQ'),
	IS: Symbol('IS')
}
const comparatorList = Object.keys(mComparator)

const logic = {
	AND: Symbol('AND'),
	OR: Symbol('OR')
}
const logicList = Object.keys(logic)

export default function QueryComponent({onSubmitQuery}) {
	const [columns, setColumns] = useState([])
	const [queryObj, setQueryObj] = useState({})
	const [orderSelection, setOrderSelection] = useState({selected: null, selections: []})

	useEffect(() => {
		let initColumns = []
		for (let key in queryKey) {
			initColumns.push({
				key,
				name: queryKey[key].description,
				selected: false
			})
		}
		setColumns(initColumns)
	}, [])

	useEffect(() => {
		let selections = columns.filter(column => column.selected)
		let selected = selections.find(selection => orderSelection.selected?.key === selection.key) || selections[0]
		setOrderSelection({
			selected,
			selections
		})
	}, [columns])


	function onSelectColumn(item) {
		columns.forEach((column) => {
			if (item.key === column.key) {
				column.selected = !column.selected
			}
		})
		setColumns([...columns])
	}

	function onDataChanage(list) {
		setQueryObj(list)
	}

	function onClickSubmit() {
		if (queryObj.length === 0) return
		if (!orderSelection.selected) return
		if (orderSelection.selections.length === 0) return
		let current = queryObj
		let requestObject = {}
		let {error, value} = convertRequestString(current)
		let order = orderSelection.selected.name
		let cols = orderSelection.selections.map(column => column.name)
		onSubmitQuery(value, cols, order, error)
	}

	function convertRequestString(currentList) {
		let result = {
			error: null, value: currentList.length > 1 ? [] : {}
		}
		for (let current of currentList) {
			if (current.type === 'query') {
				if (!current.value[0] || !current.value[1] || !current.value[2]) {
					result.error = "You should choose all selection"
					return result
				}
				let value = Number.isNaN(parseInt(current.value[2], 10)) ? current.value[2].toString() : current.value[2]
				if (currentList.length > 1) {
					let obj = {}
					obj[current.value[0]] = {[current.value[1]]: value}
					result.value.push(obj)
				} else {
					result.value[current.value[0]] = {[current.value[1]]: value}
				}
			} else {
				const {value, error} = convertRequestString(current.children)
				if (error) {
					result.error = error
					return result
				}
				if (value) {
					result.value[current.value] = value
				}
			}
		}
		return result
	}

	return (
		<>
			<h1>Query</h1>
			<div className="row">
				<h3>Column</h3>
				{columns.map(column => {
					return (
						<button key={column.key} className={column.selected ? 'keyButtonSelected' : 'keyButton'}
								onClick={() => onSelectColumn(column)}>{column.name.split('_')[1]}</button>
					)
				})}
			</div>

			<QueryStringViewComponent obj={queryObj} orderSelection={orderSelection} onDataChanage={onDataChanage}/>
			<div className="row">
				<div>
					<label htmlFor="order">Order by:</label>

					<select id="order" defaultValue={orderSelection.selected}>
						{
							orderSelection.selections.map(column => {
								return <option value={column.name} key={column.key}>{column.name}</option>
							})
						}
					</select>
				</div>
				<button onClick={onClickSubmit}>query</button>
			</div>
		</>
	)
}

function QueryStringViewComponent({obj, orderSelection, isLogic, onDataChanage}) {
	const [logicString, setLogicString] = useState('AND')
	const [queryList, setQueryList] = useState(isLogic ? obj : [])
	const [randomColor, setRandomColor] = useState(Math.floor(Math.random() * 16777215).toString(16))

	function onAddQuery() {
		queryList.push({
			type: 'query',
			value: []
		})
		setQueryList([...queryList])
	}

	useEffect(() => {
		onDataChanage(queryList)
	}, [queryList])

	function onAddLogic() {
		queryList.push({
			type: 'logic',
			value: [],
			children: []
		})
		setQueryList([...queryList])
	}

	function onDataSelected(item, index) {
		queryList[index] = item
		onDataChanage(queryList)
	}

	return (
		<div className="queryView"
			 style={{backgroundColor: `#${randomColor}`}}>
			<div className="queryColumn">
				{
					queryList.map((queryItem, queryIndex) => {
						if (queryItem.type === 'logic') {
							return <LogicComponent item={queryItem} index={queryIndex} orderSelection={orderSelection}
												   onDataSelected={onDataSelected}/>
						} else {
							return <QuerySelectComponent item={queryItem} index={queryIndex}
														 onDataSelected={onDataSelected}
														 orderSelection={orderSelection}/>
						}
					})
				}
				{(isLogic || queryList.length === 0) && <button onClick={onAddQuery}>Add query</button>}
				{(isLogic || queryList.length === 0) && <button onClick={onAddLogic}>Add more logic</button>}
			</div>
		</div>
	)
}

function LogicComponent({item, index, orderSelection, onDataSelected}) {
	const [logic, setLogic] = useState(logicList[0])
	let randomId = Math.random() * 10000
	item.value = logicList[0]

	function onComparatorChange(e) {
		e.preventDefault()
		setLogic(e.target.value)
		item.value[0] = e.target.value
	}

	useEffect(() => {
		onDataSelected(item, index)
	}, [item])

	function onDataChanage(list) {
		item.children = list
		onDataSelected(item, index)
	}

	return (
		<div className="queryRow" key={index}>
			<label htmlFor={`logic-${randomId}`}>Logic:</label>

			<select id={`logic-${randomId}`} defaultValue={logic}>
				{logicList.map(logicItem => {
					return <option value={logicItem} key={logicItem}>{logicItem}</option>
				})}
			</select>
			<QueryStringViewComponent obj={item.children} orderSelection={orderSelection}
									  isLogic={true} onDataChanage={onDataChanage}/>
		</div>
	)
}

function QuerySelectComponent({item, index, orderSelection, onDataSelected}) {
	const [comparator, setComparator] = useState(comparatorList[0])
	const [keyString, setKeyString] = useState(orderSelection.selections[0]?.name || null)
	const [value, setValue] = useState('')
	let randomId = Math.random() * 10000
	item.value[0] = comparator
	item.value[1] = keyString
	item.value[2] = value

	useEffect(() => {
		onDataSelected(item, index)
	}, [item])

	useEffect(() => {
		if (!keyString && orderSelection.selections[0]) {
			setKeyString(orderSelection.selections[0].name)
		}
	}, [orderSelection])

	function onComparatorChange(e) {
		e.preventDefault()
		setComparator(e.target.value)
		item.value[0] = e.target.value
	}

	function onKeyStringChange(e) {
		e.preventDefault()
		setKeyString(e.target.value)
		item.value[1] = e.target.value
	}

	function onValueChange(e) {
		e.preventDefault()
		setValue(e.target.value)
		item.value[2] = e.target.value
	}

	return (
		<div className="queryRow" key={index}>
			<div>
				<label htmlFor={`Comparator-${randomId}`}>Comparator:</label>

				<select id={`Comparator-${randomId}`} defaultValue={comparator} onChange={onComparatorChange}>
					{
						comparatorList.map(comparator => {
							return <option value={comparator} key={comparator}>{comparator}</option>
						})
					}
				</select>
			</div>
			{
				comparator && <div>
					<label htmlFor={`Key-${randomId}`}>Key:</label>

					<select id={`Key-${randomId}`} defaultValue={orderSelection.selections[0]?.name}
							onChange={onKeyStringChange}>
						{
							orderSelection.selections.map(selection => {
								return <option value={selection.name} key={selection.key}>{selection.name}</option>
							})
						}
					</select>
				</div>
			}
			{
				keyString && <div>
					<label htmlFor={`Value-${randomId}`}>Value:</label>
					<input id={`Value-${randomId}`} onChange={onValueChange}/>
				</div>
			}
		</div>
	)
}
