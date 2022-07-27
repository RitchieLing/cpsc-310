import React from "react"

function UploadComponent({file, name, kind, onFileChange, onKindChange, onFileNameChange, onSubmitHandle}) {
	return (
		<form className="form" onSubmit={onSubmitHandle}>
			<div className="row">
				<label htmlFor="upload" className="custom-file-upload">
					Choose file
				</label>
				{file ? <input type="text" value={file.name} onChange={onFileNameChange}/> : "No file chosen"}
				<input id="upload" type="file" onChange={onFileChange} accept=".zip,.rar,.7zip"/>
			</div>
			<div className="row">
				<div className="row">
					<label htmlFor="courses">course</label>
					<input type="radio" id="courses" name="kind" value="courses" onChange={onKindChange}/>
				</div>
				<div className="row">
					<label htmlFor="rooms">room</label>
					<input type="radio" id="rooms" name="kind" value="rooms" onChange={onKindChange}/>
				</div>
			</div>
			<button type="submit">Upload</button>
		</form>
	)
}

export default UploadComponent
