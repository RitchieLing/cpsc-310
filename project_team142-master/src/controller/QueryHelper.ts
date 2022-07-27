import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import QueryFilterValidator from "./QueryFilterValidator";
import Filter from "../model/Filter";
import Option from "../model/Option";
import {query} from "express";
import QueryTransformationsHelper from "./QueryTransformationsHelper";

export default class QueryHelper {

	public queryAllData(request: any, courseData: any, roomData: any): Promise<any[]> {
		const expectedId = this.checkEBNF(request);
		let isCourseDataset = true;
		const courseIds = Object.keys(courseData);
		const roomIds = Object.keys(roomData);
		let currId: string = "";
		let dsToQuery: any[] = [];
		if (courseIds.length === 0 && roomIds.length === 0) {
			return Promise.resolve([]);
		}
		for (const id of courseIds) {
			if (id === expectedId) {
				dsToQuery = courseData[id];
				currId = id;
			}
		}
		for (const id of roomIds) {
			if (id === expectedId) {
				dsToQuery = roomData[id];
				this.formatRoomData(dsToQuery);
				currId = id;
				isCourseDataset = false;
			}
		}
		// check condition for course section, if true then push section onto result
		let results: any[] = [];
		let filter = new Filter(isCourseDataset);
		for (let data of dsToQuery) {
			if (filter.performWhereFilter(data, request)) {
				results.push(data);
			}
		}
		let option = new Option(isCourseDataset);
		results = option.performOption(results, request, currId);
		// if (currId === "zool") {
		// 	console.log("DEBUG zool");
		// }
		if (results.length > 5000) {
			return Promise.reject(new ResultTooLargeError("Query results are more than 5000. "));
		}
		return Promise.resolve(results);
	}

	// resolves with dataset id if query passes EBNF, rejects with InsightError if not
	private checkEBNF(queryObj: any): string {
		let filterValidator = new QueryFilterValidator();
		if (queryObj["WHERE"] === undefined || queryObj["OPTIONS"] === undefined) {
			throw new InsightError("Missing WHERE or OPTIONS in query. ");
		}
		const datasetIds = filterValidator.checkFilters(queryObj);
		let datasetId = "";
		if (queryObj["TRANSFORMATIONS"] !== undefined) {
			let qth = new QueryTransformationsHelper();
			qth.checkTransformation(queryObj["TRANSFORMATIONS"], datasetIds);
			const transKeys = qth.getTransKeys(queryObj["TRANSFORMATIONS"]);
			const columnKeys = queryObj["OPTIONS"]["COLUMNS"];
			for (let col of columnKeys) {
				if (!transKeys.includes(col)) {
					throw new InsightError("Keys in COLUMNS should be in GROUP OR APPLY when there is " +
						"TRANSFORMATION.");
				}
			}
		}
		datasetId = this.checkIfValidDatasetId(datasetIds);

		if (datasetId !== "-1") {
			return datasetId;
		}
		throw new InsightError("not passing EBNF. ");
	}

	private formatRoomData(dsToQuery: any[]) {
		dsToQuery.forEach(function (roomData) {
			roomData["lat"] = Number(roomData["lat"]);
			roomData["lon"] = Number(roomData["lon"]);
			roomData["seats"] = Number(roomData["seats"]);
		});
	}

	// checks all datasetId stored in the datasetIds
	// throw InsightError if more than datasetId, returns datasetId
	public checkIfValidDatasetId(datasetIds: string[]): string {
		if (datasetIds.length !== 0) {
			let prevId: string = datasetIds[0];
			// console.log("length " + datasetIds.length);
			for (let id of datasetIds) {
				// underscore is already checked when dataset ids are split from keys
				// console.log(id);
				if (id === "") {
					throw new InsightError("dataset id cannot be null in key. ");
				}
				if (id !== prevId) {
					throw new InsightError("querying more than one dataset is not allowed.");
				}
			}
			return datasetIds[0];
		}
		return "-1";
	}
}
