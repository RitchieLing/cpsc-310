import axios from "axios"

const host = 'http://localhost:4321'

export function uploadFile(id, kind, data) {
	let formData = new FormData()
	formData.append("file", data)
	let url = host + `/dataset/${id}/${kind}`
	return axios.put(url, formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	})
		.then((rep) => {
			return rep.data.result
		})
}

export function deleteData(id) {
	let url = host + `/dataset/${id}`
	return axios.delete(url)
		.then((rep) => {
			return rep.data.result
		})
}

export function queryData(query) {
	let url = host + '/query'
	return axios.post(url)
		.then((rep) => {
			return rep.data.result
		})
}

export function getData() {
	let url = host + '/datasets'
	return axios.get(url)
		.then((rep) => {
			return rep.data.result
		})
}
